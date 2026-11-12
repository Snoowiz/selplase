import type {
  BuyerRequest,
  CategorySlug,
  Listing,
  ListingType,
  ProductCondition,
  SellerOffer,
} from '../types/marketplace';
import { CATEGORIES } from '../data/mock-marketplace';

export interface DbMarketplaceListingRow {
  id: string;
  slug: string;
  seller_id: string;
  title: string;
  type: ListingType;
  category: CategorySlug;
  category_label: string;
  price_naira: number | string;
  price_note: string | null;
  condition: ProductCondition;
  state: string;
  city: string;
  area: string | null;
  description: string;
  highlights: string[] | null;
  images: string[] | null;
  status: 'active' | 'sold' | 'archived';
  featured: boolean;
  views_count: number;
  created_at: string;
  seller_display_name?: string;
  seller_state?: string;
  seller_city?: string;
  seller_verification_status?: string;
  seller_joined_at?: string;
  seller_public_whatsapp?: string | null;
  seller_public_calling?: string | null;
}

export interface DbMarketplaceBuyerRequestRow {
  id: string;
  buyer_id: string;
  title: string;
  request_type: ListingType;
  category: CategorySlug;
  category_label: string;
  budget_min_naira: number | string;
  budget_max_naira: number | string;
  preferred_condition: ProductCondition;
  state: string;
  city: string;
  area: string | null;
  urgency: BuyerRequest['urgency'];
  description: string;
  status: 'open' | 'fulfilled' | 'closed';
  offers_count: number;
  created_at: string;
  buyer_display_name?: string;
  buyer_public_whatsapp?: string | null;
}

export interface DbRequestOfferRow {
  id: string;
  request_id: string;
  seller_id: string;
  offered_price_naira: number | string;
  condition: ProductCondition;
  location: string;
  note: string | null;
  status: 'pending' | 'accepted' | 'declined';
  created_at: string;
  request_title?: string;
  seller_display_name?: string;
  seller_public_whatsapp?: string | null;
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'SL';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

function getIllustrationForCategory(
  category: CategorySlug,
  type: ListingType
): Listing['visualTheme']['illustrationType'] {
  if (category === 'phones-tablets') return 'iphone';
  if (category === 'computing') return 'macbook';
  if (category === 'fashion-sneakers') return 'sneakers';
  if (category === 'electronics') return 'ps5';
  if (category === 'home-appliances') return 'inverter';
  if (type === 'service') return 'webdesign';
  return 'custom';
}

export function mapDbListingToListing(row: DbMarketplaceListingRow): Listing {
  const sellerName = (row.seller_display_name || 'SELPLAS Seller').trim();
  const categoryObj = CATEGORIES.find((c) => c.id === row.category);
  const handleBase = sellerName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '')
    .slice(0, 16);

  return {
    id: row.id,
    slug: row.slug || row.id,
    title: row.title,
    type: row.type,
    category: row.category,
    categoryLabel:
      row.category_label || categoryObj?.name || 'Marketplace Item',
    priceNaira: Number(row.price_naira),
    priceNote: row.price_note || 'Negotiable',
    condition: row.condition,
    state: row.state,
    city: row.city,
    area: row.area || row.city,
    description: row.description,
    highlights:
      Array.isArray(row.highlights) && row.highlights.length > 0
        ? row.highlights
        : [
            `${row.condition} · Available in ${row.city}, ${row.state}`,
            'Published by registered SELPLAS account',
          ],
    images: Array.isArray(row.images) ? row.images : [],
    visualTheme: {
      primaryColor: row.type === 'service' ? '#0284C7' : '#2563EB',
      secondaryColor: '#4F46E5',
      illustrationType: getIllustrationForCategory(row.category, row.type),
    },
    featured: Boolean(row.featured),
    topRated: row.seller_verification_status === 'verified',
    createdAt: row.created_at,
    viewsCount: Number(row.views_count || 0),
    seller: {
      id: row.seller_id,
      fullName: sellerName,
      handle: `@${handleBase || 'selplasseller'}`,
      avatarColor: 'bg-blue-600',
      initials: getInitials(sellerName),
      state: row.seller_state || row.state,
      city: row.seller_city || row.city,
      joinedDate: row.seller_joined_at
        ? new Date(row.seller_joined_at).toLocaleDateString('en-NG', {
            month: 'short',
            year: 'numeric',
          })
        : 'Registered Member',
      responseTime: 'Direct Seller Account',
      whatsappPhone: row.seller_public_whatsapp || '',
      bio: `Registered SELPLAS seller in ${row.seller_city || row.city}, ${row.seller_state || row.state}.`,
      totalListings: 1,
      completedDealsDemo: 0,
      isDemoAccount: false,
    },
    isDemoData: false,
  };
}

export function mapDbBuyerRequestToBuyerRequest(
  row: DbMarketplaceBuyerRequestRow
): BuyerRequest {
  const buyerName = (row.buyer_display_name || 'SELPLAS Buyer').trim();
  const categoryObj = CATEGORIES.find((c) => c.id === row.category);

  return {
    id: row.id,
    title: row.title,
    requestType: row.request_type,
    category: row.category,
    categoryLabel: row.category_label || categoryObj?.name || 'General',
    budgetMinNaira: Number(row.budget_min_naira),
    budgetMaxNaira: Number(row.budget_max_naira),
    preferredCondition: row.preferred_condition,
    state: row.state,
    city: row.city,
    area: row.area || row.city,
    urgency: row.urgency,
    description: row.description,
    createdAt: row.created_at,
    offersCount: Number(row.offers_count || 0),
    buyerName,
    buyerInitials: getInitials(buyerName),
    buyerWhatsapp: row.buyer_public_whatsapp || '',
    isDemoData: false,
  };
}

export function mapDbOfferToSellerOffer(row: DbRequestOfferRow): SellerOffer {
  return {
    id: row.id,
    requestId: row.request_id,
    requestTitle: row.request_title || 'Buyer Request',
    sellerName: row.seller_display_name || 'Registered Seller',
    sellerWhatsapp: row.seller_public_whatsapp || '',
    offeredPriceNaira: Number(row.offered_price_naira),
    condition: row.condition,
    location: row.location,
    note: row.note || '',
    createdAt: row.created_at,
  };
}

/**
 * Builds a folder-scoped Supabase Storage path matching the `listing-images` RLS policy:
 * `(storage.foldername(name))[1] = auth.uid()::text`
 */
export function buildListingStoragePath(
  userId: string,
  fileName: string,
  timestampMs: number = Date.now()
): string {
  const cleanUserId = userId.trim();
  if (!cleanUserId || cleanUserId.includes('/')) {
    throw new Error('Invalid user ID for storage path.');
  }
  const safeName = fileName
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 64);

  return `${cleanUserId}/${timestampMs}-${safeName || 'photo.jpg'}`;
}

export function validateStorageObjectOwnership(
  authenticatedUserId: string,
  objectPath: string
): boolean {
  if (!authenticatedUserId || !objectPath) return false;
  const segments = objectPath.split('/').filter(Boolean);
  if (segments.length < 2) return false;
  if (segments.some((seg) => seg === '.' || seg === '..')) return false;
  return segments[0] === authenticatedUserId;
}

export function validateOfferSubmission(params: {
  authenticatedSellerId: string;
  buyerRequestOwnerId?: string | null;
  offeredPriceNaira: number;
  location: string;
  note?: string;
}): {
  valid: boolean;
  status: 200 | 400 | 403;
  error?: string;
} {
  if (!params.authenticatedSellerId) {
    return {
      valid: false,
      status: 403,
      error: 'You must be signed in to submit an offer.',
    };
  }

  if (
    params.buyerRequestOwnerId &&
    params.authenticatedSellerId === params.buyerRequestOwnerId
  ) {
    return {
      valid: false,
      status: 403,
      error: 'Forbidden: You cannot submit an offer on your own buyer request.',
    };
  }

  if (
    !Number.isFinite(params.offeredPriceNaira) ||
    params.offeredPriceNaira < 500
  ) {
    return {
      valid: false,
      status: 400,
      error: 'Offered price must be at least ₦500.',
    };
  }

  if (!params.location || params.location.trim().length < 2) {
    return {
      valid: false,
      status: 400,
      error: 'Please enter a valid inspection or pickup location.',
    };
  }

  if (params.note && params.note.length > 1000) {
    return {
      valid: false,
      status: 400,
      error: 'Offer note cannot exceed 1,000 characters.',
    };
  }

  return { valid: true, status: 200 };
}
