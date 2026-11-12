'use client';

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
} from 'react';
import type { User } from '@supabase/supabase-js';
import type {
  BuyerRequest,
  CreateListingInput,
  CreateRequestInput,
  Listing,
  PlatformMessage,
  SellerOffer,
} from '@/lib/types/marketplace';
import type { UserProfileRow } from '@/lib/types/profile';
import {
  INITIAL_BUYER_REQUESTS,
  INITIAL_LISTINGS,
} from '@/lib/data/mock-marketplace';
import {
  buildNewBuyerRequestEntity,
  buildNewListingEntity,
  buildSellerOfferEntity,
} from '@/lib/supabase/client-ready';
import {
  buildInitialMissingProfileInsert,
  classifyProfileFetchOutcome,
  isProfileOnboardingComplete,
  sanitizeRedirectPath,
} from '@/lib/utils/profile-utils';
import { getSupabasePublicEnv } from '@/lib/supabase/config';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';

interface ShareTarget {
  title: string;
  priceText: string;
  location: string;
  path: string;
  type: 'product' | 'service' | 'request';
}

interface MarketplaceContextValue {
  // Stage 2–4 Real Supabase Auth, Google OAuth, Onboarding & DB Migration Status
  isSupabaseConfigured: boolean;
  marketplaceDbReady: boolean;
  authLoading: boolean;
  authUser: User | null;
  userProfile: UserProfileRow | null;
  isOnboardingComplete: boolean;
  signInWithGoogle: (nextPath?: string) => Promise<{ error?: string }>;
  refreshUserProfile: () => Promise<void>;
  refreshMarketplaceData: () => Promise<void>;
  signOutUser: () => Promise<void>;

  // Marketplace State (Supabase PostgreSQL + Starter Demo Items)
  listings: Listing[];
  buyerRequests: BuyerRequest[];
  savedListingIds: string[];
  sellerOffers: SellerOffer[];
  platformMessages: PlatformMessage[];
  toggleSavedListing: (id: string) => void;
  addListing: (input: CreateListingInput) => Listing;
  publishListing: (input: CreateListingInput) => Promise<{
    listing: Listing;
    persistedToSupabase: boolean;
    onboardingRequired?: boolean;
    error?: string;
  }>;
  addBuyerRequest: (input: CreateRequestInput) => BuyerRequest;
  publishBuyerRequest: (input: CreateRequestInput) => Promise<{
    request: BuyerRequest;
    persistedToSupabase: boolean;
    onboardingRequired?: boolean;
    error?: string;
  }>;
  submitOfferForRequest: (params: {
    request: BuyerRequest;
    sellerName: string;
    sellerWhatsapp: string;
    offeredPriceNaira: number;
    condition: BuyerRequest['preferredCondition'];
    location: string;
    note: string;
  }) => SellerOffer;
  publishOfferForRequest: (params: {
    request: BuyerRequest;
    sellerName: string;
    sellerWhatsapp: string;
    offeredPriceNaira: number;
    condition: BuyerRequest['preferredCondition'];
    location: string;
    note: string;
  }) => Promise<{
    offer: SellerOffer;
    persistedToSupabase: boolean;
    onboardingRequired?: boolean;
    error?: string;
  }>;
  sendPlatformMessage: (params: {
    listingId: string;
    listingTitle: string;
    sellerId: string;
    sellerName: string;
    senderName: string;
    messageText: string;
  }) => PlatformMessage;
  activeShareTarget: ShareTarget | null;
  openShareModal: (target: ShareTarget) => void;
  closeShareModal: () => void;
  activeHaveThisRequest: BuyerRequest | null;
  openHaveThisModal: (request: BuyerRequest) => void;
  closeHaveThisModal: () => void;
  activeContactListing: Listing | null;
  openContactModal: (listing: Listing) => void;
  closeContactModal: () => void;
}

const MarketplaceContext = createContext<MarketplaceContextValue | undefined>(
  undefined
);

const STORAGE_KEY_SAVED = 'selplas_stage1_saved_v1';
const STORAGE_KEY_MESSAGES = 'selplas_stage1_messages_v1';

export function MarketplaceProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const envStatus = getSupabasePublicEnv();
  const isSupabaseConfigured = envStatus.isConfigured;

  const [authLoading, setAuthLoading] = useState<boolean>(isSupabaseConfigured);
  const [marketplaceDbReady, setMarketplaceDbReady] = useState<boolean>(false);
  const [authUser, setAuthUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfileRow | null>(null);
  const profileInsertInFlightRef = useRef<Set<string>>(new Set());

  const [listings, setListings] = useState<Listing[]>(INITIAL_LISTINGS);
  const [buyerRequests, setBuyerRequests] = useState<BuyerRequest[]>(
    INITIAL_BUYER_REQUESTS
  );
  const [savedListingIds, setSavedListingIds] = useState<string[]>([
    'lst-iphone-16-pro-max',
  ]);
  const [sellerOffers, setSellerOffers] = useState<SellerOffer[]>([]);
  const [platformMessages, setPlatformMessages] = useState<PlatformMessage[]>([
    {
      id: 'msg-demo-1',
      listingId: 'lst-iphone-16-pro-max',
      listingTitle: 'iPhone 16 Pro Max — 256GB Natural Titanium',
      sellerId: 'seller-adebayo-01',
      sellerName: 'Adebayo Ogunlesi (Demo)',
      senderName: 'You (Demo Buyer)',
      messageText:
        'Hello, is this iPhone 16 Pro Max available for inspection in Lekki today?',
      replyPreview:
        'Browser Demo Auto-Reply: Yes, it is available at our Admiralty Way office in Lekki Phase 1.',
      createdAt: '2026-11-12T02:15:00Z',
    },
  ]);

  const [activeShareTarget, setActiveShareTarget] =
    useState<ShareTarget | null>(null);
  const [activeHaveThisRequest, setActiveHaveThisRequest] =
    useState<BuyerRequest | null>(null);
  const [activeContactListing, setActiveContactListing] =
    useState<Listing | null>(null);

  const fetchProfileForUser = useCallback(async (user: User) => {
    const supabase = createSupabaseBrowserClient();
    if (!supabase) return;

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .maybeSingle();

    const outcome = classifyProfileFetchOutcome({
      data: data as UserProfileRow | null,
      error,
    });

    if (outcome.status === 'found' && outcome.profile) {
      setUserProfile(outcome.profile);
      return;
    }

    if (outcome.status === 'auth_expired') {
      setAuthUser(null);
      setUserProfile(null);
      return;
    }

    // Never overwrite an existing profile or insert incomplete defaults on
    // database connection failures, RLS permission errors, or unexpected errors.
    if (
      outcome.status === 'permission_denied' ||
      outcome.status === 'connection_error' ||
      outcome.status === 'unexpected_error'
    ) {
      return;
    }

    // Outcome is genuinely 'missing' (`!error && data === null`).
    // Guard against duplicate concurrent inserts for the same user ID.
    if (profileInsertInFlightRef.current.has(user.id)) {
      return;
    }

    profileInsertInFlightRef.current.add(user.id);
    try {
      const initialRow = buildInitialMissingProfileInsert({
        userId: user.id,
        email: user.email,
        userMetadata: (user.user_metadata || {}) as Record<string, unknown>,
      });

      const { data: inserted, error: insertError } = await supabase
        .from('profiles')
        .insert(initialRow)
        .select('*')
        .maybeSingle();

      if (!insertError && inserted) {
        setUserProfile(inserted as UserProfileRow);
        return;
      }

      // If another request or database trigger inserted the row concurrently,
      // fetch the existing row without overwriting any fields.
      if (insertError?.code === '23505') {
        const { data: refetched, error: refetchError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .maybeSingle();
        if (!refetchError && refetched) {
          setUserProfile(refetched as UserProfileRow);
        }
      }
    } finally {
      profileInsertInFlightRef.current.delete(user.id);
    }
  }, []);

  const signInWithGoogle = useCallback(
    async (nextPath?: string): Promise<{ error?: string }> => {
      const supabase = createSupabaseBrowserClient();
      if (!supabase) {
        return {
          error:
            'Supabase is not yet connected. Configure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY in your environment.',
        };
      }

      const safeNext = sanitizeRedirectPath(nextPath, '/account?tab=dashboard');
      const origin =
        typeof window !== 'undefined' ? window.location.origin : '';
      const redirectTo = `${origin}/auth/callback?next=${encodeURIComponent(
        safeNext
      )}`;

      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo,
          queryParams: {
            access_type: 'offline',
            prompt: 'select_account',
          },
        },
      });

      if (error) {
        return { error: error.message };
      }

      return {};
    },
    []
  );

  const refreshMarketplaceData = useCallback(async () => {
    try {
      const [listingsRes, requestsRes] = await Promise.all([
        fetch('/api/listings'),
        fetch('/api/requests'),
      ]);

      if (listingsRes.ok) {
        const json = await listingsRes.json();
        if (Array.isArray(json.data) && json.data.length > 0) {
          setListings(json.data);
        }
        if (json.meta?.dbReady) {
          setMarketplaceDbReady(true);
        }
      }

      if (requestsRes.ok) {
        const json = await requestsRes.json();
        if (Array.isArray(json.data) && json.data.length > 0) {
          setBuyerRequests(json.data);
        }
        if (json.meta?.dbReady) {
          setMarketplaceDbReady(true);
        }
      }
    } catch {
      // Keep starter catalog on transient network error
    }
  }, []);

  const refreshUserProfile = useCallback(async () => {
    const supabase = createSupabaseBrowserClient();
    if (!supabase) {
      setAuthUser(null);
      setUserProfile(null);
      setAuthLoading(false);
      return;
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      setAuthUser(user);
      await fetchProfileForUser(user);
    } else {
      setAuthUser(null);
      setUserProfile(null);
    }
    setAuthLoading(false);
  }, [fetchProfileForUser]);

  const signOutUser = useCallback(async () => {
    const supabase = createSupabaseBrowserClient();
    if (supabase) {
      await supabase.auth.signOut();
    }
    setAuthUser(null);
    setUserProfile(null);
  }, []);

  // Initialize Supabase Auth listener
  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    if (!supabase) {
      return;
    }

    let mounted = true;
    const timeoutId = window.setTimeout(() => {
      if (mounted) {
        setAuthLoading(false);
      }
    }, 2500);

    supabase.auth
      .getSession()
      .then(({ data: { session } }) => {
        if (!mounted) return;
        if (!session?.user) {
          setAuthUser(null);
          setUserProfile(null);
          setAuthLoading(false);
          window.clearTimeout(timeoutId);
          return;
        }

        setAuthUser(session.user);
        supabase.auth
          .getUser()
          .then(({ data: { user } }) => {
            if (!mounted) return;
            const verifiedUser = user ?? session.user;
            setAuthUser(verifiedUser);
            return fetchProfileForUser(verifiedUser);
          })
          .catch(() => {
            // Keep session state if network verification fails transiently
          })
          .finally(() => {
            if (mounted) {
              setAuthLoading(false);
              window.clearTimeout(timeoutId);
            }
          });
      })
      .catch(() => {
        if (mounted) {
          setAuthUser(null);
          setUserProfile(null);
          setAuthLoading(false);
          window.clearTimeout(timeoutId);
        }
      });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return;
      const nextUser = session?.user ?? null;
      setAuthUser(nextUser);
      if (nextUser) {
        fetchProfileForUser(nextUser);
      } else {
        setUserProfile(null);
      }
      setAuthLoading(false);
    });

    return () => {
      mounted = false;
      window.clearTimeout(timeoutId);
      subscription.unsubscribe();
    };
  }, [fetchProfileForUser]);

  // Fetch marketplace listings & requests on mount
  useEffect(() => {
    queueMicrotask(() => {
      refreshMarketplaceData();
      try {
        const storedSaved = window.localStorage.getItem(STORAGE_KEY_SAVED);
        if (storedSaved) {
          const parsed = JSON.parse(storedSaved);
          if (Array.isArray(parsed)) {
            setSavedListingIds(parsed);
          }
        }
        const storedMessages = window.localStorage.getItem(STORAGE_KEY_MESSAGES);
        if (storedMessages) {
          const parsed = JSON.parse(storedMessages);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setPlatformMessages(parsed);
          }
        }
      } catch {
        // Ignore storage errors
      }
    });
  }, [refreshMarketplaceData]);

  // Fetch authenticated user's offers when signed in
  useEffect(() => {
    if (!authUser) return;
    let active = true;
    fetch('/api/offers')
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        if (active && json && Array.isArray(json.data)) {
          setSellerOffers(json.data);
        }
      })
      .catch(() => {
        // Ignore
      });
    return () => {
      active = false;
    };
  }, [authUser]);

  const toggleSavedListing = (id: string) => {
    setSavedListingIds((prev) => {
      const next = prev.includes(id)
        ? prev.filter((item) => item !== id)
        : [...prev, id];
      try {
        window.localStorage.setItem(STORAGE_KEY_SAVED, JSON.stringify(next));
      } catch {
        // Ignore
      }
      return next;
    });
  };

  const addListing = (input: CreateListingInput): Listing => {
    const newListing = buildNewListingEntity(input);
    setListings((prev) => [newListing, ...prev]);
    return newListing;
  };

  const publishListing = async (
    input: CreateListingInput
  ): Promise<{
    listing: Listing;
    persistedToSupabase: boolean;
    onboardingRequired?: boolean;
    error?: string;
  }> => {
    try {
      const response = await fetch('/api/listings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });

      const result = await response.json();
      if (response.ok && result.data) {
        const created = result.data as Listing;
        setListings((prev) => [created, ...prev]);
        setMarketplaceDbReady(true);
        return { listing: created, persistedToSupabase: true };
      }

      if (result.code === 'ONBOARDING_REQUIRED') {
        const fallback = addListing(input);
        return {
          listing: fallback,
          persistedToSupabase: false,
          onboardingRequired: true,
          error: result.error,
        };
      }

      const fallback = addListing(input);
      return {
        listing: fallback,
        persistedToSupabase: false,
        error:
          result.error ||
          'Saved to local preview because you are not signed in with a completed Selplase profile.',
      };
    } catch {
      const fallback = addListing(input);
      return {
        listing: fallback,
        persistedToSupabase: false,
        error: 'Network error communicating with /api/listings.',
      };
    }
  };

  const addBuyerRequest = (input: CreateRequestInput): BuyerRequest => {
    const newRequest = buildNewBuyerRequestEntity(input);
    setBuyerRequests((prev) => [newRequest, ...prev]);
    return newRequest;
  };

  const publishBuyerRequest = async (
    input: CreateRequestInput
  ): Promise<{
    request: BuyerRequest;
    persistedToSupabase: boolean;
    onboardingRequired?: boolean;
    error?: string;
  }> => {
    try {
      const response = await fetch('/api/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });

      const result = await response.json();
      if (response.ok && result.data) {
        const created = result.data as BuyerRequest;
        setBuyerRequests((prev) => [created, ...prev]);
        setMarketplaceDbReady(true);
        return { request: created, persistedToSupabase: true };
      }

      if (result.code === 'ONBOARDING_REQUIRED') {
        const fallback = addBuyerRequest(input);
        return {
          request: fallback,
          persistedToSupabase: false,
          onboardingRequired: true,
          error: result.error,
        };
      }

      const fallback = addBuyerRequest(input);
      return {
        request: fallback,
        persistedToSupabase: false,
        error:
          result.error ||
          'Saved to local preview because you are not signed in with a completed Selplase profile.',
      };
    } catch {
      const fallback = addBuyerRequest(input);
      return {
        request: fallback,
        persistedToSupabase: false,
        error: 'Network error communicating with /api/requests.',
      };
    }
  };

  const submitOfferForRequest = (params: {
    request: BuyerRequest;
    sellerName: string;
    sellerWhatsapp: string;
    offeredPriceNaira: number;
    condition: BuyerRequest['preferredCondition'];
    location: string;
    note: string;
  }): SellerOffer => {
    const newOffer = buildSellerOfferEntity(params);
    setSellerOffers((prev) => [newOffer, ...prev]);
    setBuyerRequests((prev) =>
      prev.map((req) =>
        req.id === params.request.id
          ? { ...req, offersCount: req.offersCount + 1 }
          : req
      )
    );
    return newOffer;
  };

  const publishOfferForRequest = async (params: {
    request: BuyerRequest;
    sellerName: string;
    sellerWhatsapp: string;
    offeredPriceNaira: number;
    condition: BuyerRequest['preferredCondition'];
    location: string;
    note: string;
  }): Promise<{
    offer: SellerOffer;
    persistedToSupabase: boolean;
    onboardingRequired?: boolean;
    error?: string;
  }> => {
    try {
      const response = await fetch('/api/offers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requestId: params.request.id,
          requestTitle: params.request.title,
          offeredPriceNaira: params.offeredPriceNaira,
          condition: params.condition,
          location: params.location,
          note: params.note,
        }),
      });

      const result = await response.json();
      if (response.ok && result.data) {
        const created = result.data as SellerOffer;
        setSellerOffers((prev) => [created, ...prev]);
        setBuyerRequests((prev) =>
          prev.map((req) =>
            req.id === params.request.id
              ? { ...req, offersCount: req.offersCount + 1 }
              : req
          )
        );
        setMarketplaceDbReady(true);
        return { offer: created, persistedToSupabase: true };
      }

      if (result.code === 'ONBOARDING_REQUIRED') {
        const fallback = submitOfferForRequest(params);
        return {
          offer: fallback,
          persistedToSupabase: false,
          onboardingRequired: true,
          error: result.error,
        };
      }

      const fallback = submitOfferForRequest(params);
      return {
        offer: fallback,
        persistedToSupabase: false,
        error:
          result.error ||
          'Saved to local preview because you are signed out, incomplete in onboarding, or offering on a demo request.',
      };
    } catch {
      const fallback = submitOfferForRequest(params);
      return {
        offer: fallback,
        persistedToSupabase: false,
        error: 'Network error communicating with /api/offers.',
      };
    }
  };

  const sendPlatformMessage = (params: {
    listingId: string;
    listingTitle: string;
    sellerId: string;
    sellerName: string;
    senderName: string;
    messageText: string;
  }): PlatformMessage => {
    const newMessage: PlatformMessage = {
      id: `msg-${Date.now().toString().slice(-6)}`,
      listingId: params.listingId,
      listingTitle: params.listingTitle,
      sellerId: params.sellerId,
      sellerName: params.sellerName,
      senderName: params.senderName.trim() || 'You (Demo Buyer)',
      messageText: params.messageText.trim(),
      replyPreview: `Browser Demo Auto-Reply from ${params.sellerName}: Direct messaging remains mocked in Stage 4. Connect via WhatsApp or Call for real-time inquiries.`,
      createdAt: new Date().toISOString(),
    };

    setPlatformMessages((prev) => {
      const next = [newMessage, ...prev];
      try {
        window.localStorage.setItem(STORAGE_KEY_MESSAGES, JSON.stringify(next));
      } catch {
        // Ignore
      }
      return next;
    });

    return newMessage;
  };

  const isOnboardingComplete = isProfileOnboardingComplete(userProfile);

  return (
    <MarketplaceContext.Provider
      value={{
        isSupabaseConfigured,
        marketplaceDbReady,
        authLoading,
        authUser,
        userProfile,
        isOnboardingComplete,
        signInWithGoogle,
        refreshUserProfile,
        refreshMarketplaceData,
        signOutUser,
        listings,
        buyerRequests,
        savedListingIds,
        sellerOffers,
        platformMessages,
        toggleSavedListing,
        addListing,
        publishListing,
        addBuyerRequest,
        publishBuyerRequest,
        submitOfferForRequest,
        publishOfferForRequest,
        sendPlatformMessage,
        activeShareTarget,
        openShareModal: setActiveShareTarget,
        closeShareModal: () => setActiveShareTarget(null),
        activeHaveThisRequest,
        openHaveThisModal: setActiveHaveThisRequest,
        closeHaveThisModal: () => setActiveHaveThisRequest(null),
        activeContactListing,
        openContactModal: setActiveContactListing,
        closeContactModal: () => setActiveContactListing(null),
      }}
    >
      {children}
    </MarketplaceContext.Provider>
  );
}

export function useMarketplace() {
  const ctx = useContext(MarketplaceContext);
  if (!ctx) {
    throw new Error('useMarketplace must be used within a MarketplaceProvider');
  }
  return ctx;
}
