'use client';

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
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
  // Stage 2 & 3 Real Supabase Auth, Profile & DB Migration Status
  isSupabaseConfigured: boolean;
  marketplaceDbReady: boolean;
  authLoading: boolean;
  authUser: User | null;
  userProfile: UserProfileRow | null;
  refreshUserProfile: () => Promise<void>;
  refreshMarketplaceData: () => Promise<void>;
  signOutUser: () => Promise<void>;

  // Stage 3 Marketplace State (Supabase PostgreSQL + Starter Demo Items)
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
    error?: string;
  }>;
  addBuyerRequest: (input: CreateRequestInput) => BuyerRequest;
  publishBuyerRequest: (input: CreateRequestInput) => Promise<{
    request: BuyerRequest;
    persistedToSupabase: boolean;
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

    if (!error && data) {
      setUserProfile(data as UserProfileRow);
      return;
    }

    const meta = user.user_metadata || {};
    const fallbackDisplayName =
      typeof meta.display_name === 'string' &&
      meta.display_name.trim().length >= 2
        ? meta.display_name.trim()
        : (user.email || 'SELPLAS Member').split('@')[0];

    const { data: inserted } = await supabase
      .from('profiles')
      .upsert(
        {
          id: user.id,
          display_name: fallbackDisplayName,
          email: user.email || '',
          whatsapp_number:
            typeof meta.whatsapp_number === 'string'
              ? meta.whatsapp_number
              : null,
          calling_number:
            typeof meta.calling_number === 'string'
              ? meta.calling_number
              : null,
          state: typeof meta.state === 'string' ? meta.state : 'Lagos',
          city: typeof meta.city === 'string' ? meta.city : 'Lagos',
          account_role:
            meta.account_role === 'buyer' ||
            meta.account_role === 'seller' ||
            meta.account_role === 'both'
              ? meta.account_role
              : 'both',
          show_whatsapp_publicly: false,
          show_calling_publicly: false,
          verification_status: 'unverified',
          is_admin: false,
        },
        { onConflict: 'id' }
      )
      .select('*')
      .maybeSingle();

    if (inserted) {
      setUserProfile(inserted as UserProfileRow);
    }
  }, []);

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

  // Fetch Stage 3 Supabase marketplace listings & requests on mount
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

      const fallback = addListing(input);
      return {
        listing: fallback,
        persistedToSupabase: false,
        error:
          result.error ||
          'Saved to local preview because Supabase session or Stage 3 table migration is pending.',
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

      const fallback = addBuyerRequest(input);
      return {
        request: fallback,
        persistedToSupabase: false,
        error:
          result.error ||
          'Saved to local preview because Supabase session or Stage 3 table migration is pending.',
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

      const fallback = submitOfferForRequest(params);
      return {
        offer: fallback,
        persistedToSupabase: false,
        error:
          result.error ||
          'Saved to local preview because you are signed out, offering on a demo request, or Stage 3 SQL migration is pending.',
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
      replyPreview: `Browser Demo Auto-Reply from ${params.sellerName}: Direct messaging remains mocked in Stage 3. Connect via WhatsApp or Call for real-time inquiries.`,
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

  return (
    <MarketplaceContext.Provider
      value={{
        isSupabaseConfigured,
        marketplaceDbReady,
        authLoading,
        authUser,
        userProfile,
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
