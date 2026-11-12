'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import type {
  BuyerRequest,
  CreateListingInput,
  CreateRequestInput,
  Listing,
  PlatformMessage,
  SellerOffer,
} from '@/lib/types/marketplace';
import {
  INITIAL_BUYER_REQUESTS,
  INITIAL_LISTINGS,
} from '@/lib/data/mock-marketplace';
import {
  buildNewBuyerRequestEntity,
  buildNewListingEntity,
  buildSellerOfferEntity,
} from '@/lib/supabase/client-ready';

interface ShareTarget {
  title: string;
  priceText: string;
  location: string;
  path: string;
  type: 'product' | 'service' | 'request';
}

interface MarketplaceContextValue {
  listings: Listing[];
  buyerRequests: BuyerRequest[];
  savedListingIds: string[];
  sellerOffers: SellerOffer[];
  platformMessages: PlatformMessage[];
  toggleSavedListing: (id: string) => void;
  addListing: (input: CreateListingInput) => Listing;
  addBuyerRequest: (input: CreateRequestInput) => BuyerRequest;
  submitOfferForRequest: (params: {
    request: BuyerRequest;
    sellerName: string;
    sellerWhatsapp: string;
    offeredPriceNaira: number;
    condition: BuyerRequest['preferredCondition'];
    location: string;
    note: string;
  }) => SellerOffer;
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

const STORAGE_KEY_LISTINGS = 'selplas_stage1_listings_v1';
const STORAGE_KEY_REQUESTS = 'selplas_stage1_requests_v1';
const STORAGE_KEY_SAVED = 'selplas_stage1_saved_v1';
const STORAGE_KEY_OFFERS = 'selplas_stage1_offers_v1';
const STORAGE_KEY_MESSAGES = 'selplas_stage1_messages_v1';

export function MarketplaceProvider({
  children,
}: {
  children: React.ReactNode;
}) {
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
      messageText: 'Hello, is this iPhone 16 Pro Max available for inspection in Lekki today?',
      replyPreview:
        'Mock Auto-Reply: Yes, it is available at our Admiralty Way office in Lekki Phase 1.',
      createdAt: '2026-11-12T02:15:00Z',
    },
  ]);

  const [activeShareTarget, setActiveShareTarget] =
    useState<ShareTarget | null>(null);
  const [activeHaveThisRequest, setActiveHaveThisRequest] =
    useState<BuyerRequest | null>(null);
  const [activeContactListing, setActiveContactListing] =
    useState<Listing | null>(null);

  useEffect(() => {
    queueMicrotask(() => {
      try {
        const storedListings = window.localStorage.getItem(STORAGE_KEY_LISTINGS);
        if (storedListings) {
          const parsed = JSON.parse(storedListings);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setListings(parsed);
          }
        }
        const storedRequests = window.localStorage.getItem(STORAGE_KEY_REQUESTS);
        if (storedRequests) {
          const parsed = JSON.parse(storedRequests);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setBuyerRequests(parsed);
          }
        }
        const storedSaved = window.localStorage.getItem(STORAGE_KEY_SAVED);
        if (storedSaved) {
          const parsed = JSON.parse(storedSaved);
          if (Array.isArray(parsed)) {
            setSavedListingIds(parsed);
          }
        }
        const storedOffers = window.localStorage.getItem(STORAGE_KEY_OFFERS);
        if (storedOffers) {
          const parsed = JSON.parse(storedOffers);
          if (Array.isArray(parsed)) {
            setSellerOffers(parsed);
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
        // Ignore storage access errors in restricted environments
      }
    });
  }, []);

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
    setListings((prev) => {
      const next = [newListing, ...prev];
      try {
        window.localStorage.setItem(STORAGE_KEY_LISTINGS, JSON.stringify(next));
      } catch {
        // Ignore
      }
      return next;
    });
    return newListing;
  };

  const addBuyerRequest = (input: CreateRequestInput): BuyerRequest => {
    const newRequest = buildNewBuyerRequestEntity(input);
    setBuyerRequests((prev) => {
      const next = [newRequest, ...prev];
      try {
        window.localStorage.setItem(STORAGE_KEY_REQUESTS, JSON.stringify(next));
      } catch {
        // Ignore
      }
      return next;
    });
    return newRequest;
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
    setSellerOffers((prev) => {
      const next = [newOffer, ...prev];
      try {
        window.localStorage.setItem(STORAGE_KEY_OFFERS, JSON.stringify(next));
      } catch {
        // Ignore
      }
      return next;
    });

    setBuyerRequests((prev) => {
      const next = prev.map((req) =>
        req.id === params.request.id
          ? { ...req, offersCount: req.offersCount + 1 }
          : req
      );
      try {
        window.localStorage.setItem(STORAGE_KEY_REQUESTS, JSON.stringify(next));
      } catch {
        // Ignore
      }
      return next;
    });

    return newOffer;
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
      replyPreview: `Mock Auto-Reply from ${params.sellerName}: Thanks for your message! This item is available for inspection. You can also reach me on WhatsApp or by phone call.`,
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
        listings,
        buyerRequests,
        savedListingIds,
        sellerOffers,
        platformMessages,
        toggleSavedListing,
        addListing,
        addBuyerRequest,
        submitOfferForRequest,
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
