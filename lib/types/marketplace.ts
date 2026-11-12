/**
 * Shared TypeScript types for Selplase Marketplace (Web & Future React Native Expo App)
 * Designed to map cleanly to Supabase PostgreSQL tables:
 * - public.profiles
 * - public.listings
 * - public.buyer_requests
 * - public.request_offers
 */

export type ListingType = 'product' | 'service';

export type ProductCondition =
  | 'Brand New'
  | 'Foreign Used (Tokunbo)'
  | 'Nigerian Used'
  | 'Refurbished'
  | 'Service / N/A';

export type CategorySlug =
  | 'phones-tablets'
  | 'computing'
  | 'electronics'
  | 'fashion-sneakers'
  | 'home-appliances'
  | 'vehicles'
  | 'digital-services'
  | 'home-services'
  | 'creative-events';

export interface CategoryItem {
  id: CategorySlug;
  name: string;
  shortName: string;
  type: 'product' | 'service' | 'both';
  description: string;
  listingCount: number;
}

export interface NigerianLocation {
  id: string;
  state: string;
  city: string;
  area: string;
  listingCount: number;
  popular?: boolean;
}

export interface SellerProfile {
  id: string;
  fullName: string;
  handle: string;
  businessName?: string;
  avatarColor: string;
  initials: string;
  state: string;
  city: string;
  joinedDate: string;
  responseTime: string;
  whatsappPhone: string;
  bio: string;
  totalListings: number;
  completedDealsDemo: number;
  isDemoAccount: boolean;
}

export interface Listing {
  id: string;
  slug: string;
  title: string;
  type: ListingType;
  category: CategorySlug;
  categoryLabel: string;
  priceNaira: number;
  priceNote?: string; // e.g., "Negotiable", "Starting from", "Per session"
  condition: ProductCondition;
  state: string;
  city: string;
  area: string;
  description: string;
  highlights: string[];
  images: string[];
  visualTheme: {
    primaryColor: string;
    secondaryColor: string;
    illustrationType:
      | 'iphone'
      | 'macbook'
      | 'webdesign'
      | 'sneakers'
      | 'inverter'
      | 'camera'
      | 'ps5'
      | 'photography'
      | 'ac-repair'
      | 'generator'
      | 'watch'
      | 'custom';
  };
  featured?: boolean;
  topRated?: boolean;
  createdAt: string;
  viewsCount: number;
  seller: SellerProfile;
  isDemoData: boolean;
}

export interface BuyerRequest {
  id: string;
  title: string;
  requestType: ListingType;
  category: CategorySlug;
  categoryLabel: string;
  budgetMinNaira: number;
  budgetMaxNaira: number;
  preferredCondition: ProductCondition;
  state: string;
  city: string;
  area: string;
  urgency: 'Urgent (Within 48h)' | 'This Week' | 'Flexible';
  description: string;
  createdAt: string;
  offersCount: number;
  buyerName: string;
  buyerInitials: string;
  buyerWhatsapp: string;
  isDemoData: boolean;
}

export interface SellerOffer {
  id: string;
  requestId: string;
  requestTitle: string;
  sellerName: string;
  sellerWhatsapp: string;
  offeredPriceNaira: number;
  condition: ProductCondition;
  location: string;
  note: string;
  createdAt: string;
}

export interface PlatformMessage {
  id: string;
  listingId: string;
  listingTitle: string;
  sellerId: string;
  sellerName: string;
  senderName: string;
  messageText: string;
  replyPreview: string;
  createdAt: string;
}

export interface ListingFilterParams {
  query?: string;
  type?: 'all' | ListingType;
  category?: 'all' | CategorySlug;
  state?: string; // 'all' or state name
  condition?: 'all' | ProductCondition;
  minPrice?: number;
  maxPrice?: number;
  sortBy?: 'featured' | 'newest' | 'price-asc' | 'price-desc';
}

export interface RequestFilterParams {
  query?: string;
  requestType?: 'all' | ListingType;
  category?: 'all' | CategorySlug;
  state?: string;
  urgency?: 'all' | BuyerRequest['urgency'];
}

export interface CreateListingInput {
  title: string;
  type: ListingType;
  category: CategorySlug;
  priceNaira: number;
  priceNote: string;
  condition: ProductCondition;
  state: string;
  city: string;
  area: string;
  description: string;
  highlights: string[];
  images: string[];
  sellerName?: string;
  sellerWhatsapp?: string;
}

export interface CreateRequestInput {
  title: string;
  requestType: ListingType;
  category: CategorySlug;
  budgetMinNaira: number;
  budgetMaxNaira: number;
  preferredCondition: ProductCondition;
  state: string;
  city: string;
  area: string;
  urgency: BuyerRequest['urgency'];
  description: string;
  buyerName: string;
  buyerWhatsapp: string;
}

/**
 * Stage 2 Supabase Database Schema Reference
 * Matches planned PostgreSQL tables for Web & Expo React Native sharing.
 */
export interface SupabaseDatabaseSchema {
  public: {
    Tables: {
      profiles: {
        Row: SellerProfile;
        Insert: Omit<SellerProfile, 'id' | 'joinedDate'>;
        Update: Partial<SellerProfile>;
      };
      listings: {
        Row: Listing;
        Insert: CreateListingInput;
        Update: Partial<CreateListingInput>;
      };
      buyer_requests: {
        Row: BuyerRequest;
        Insert: CreateRequestInput;
        Update: Partial<CreateRequestInput>;
      };
      request_offers: {
        Row: SellerOffer;
        Insert: Omit<SellerOffer, 'id' | 'createdAt'>;
        Update: Partial<SellerOffer>;
      };
    };
  };
}
