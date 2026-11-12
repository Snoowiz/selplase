/**
 * SELPLAS Data Access Layer — Stage 3: Supabase Marketplace Database & Storage Migration
 *
 * Active Supabase PostgreSQL tables:
 * - `public.profiles` (Stage 2)
 * - `public.listings` (Stage 3)
 * - `public.buyer_requests` (Stage 3)
 * - `public.request_offers` (Stage 3)
 * Active Supabase Storage bucket:
 * - `listing-images` (folder-isolated per authenticated user ID)
 */

import type {
  BuyerRequest,
  CreateListingInput,
  CreateRequestInput,
  Listing,
  ListingFilterParams,
  RequestFilterParams,
  SellerOffer,
} from '../types/marketplace';
import {
  CATEGORIES,
  DEMO_SELLERS,
  INITIAL_BUYER_REQUESTS,
  INITIAL_LISTINGS,
} from '../data/mock-marketplace';
import { filterBuyerRequests, filterListings } from '../utils/formatters';
import { buildListingStoragePath } from '../utils/marketplace-mappers';
import { createSupabaseBrowserClient } from './client';
import { getSupabasePublicEnv } from './config';

export function getStage3Status() {
  const env = getSupabasePublicEnv();
  return {
    isSupabaseConfigured: env.isConfigured,
    keySource: env.keySource,
    activeTables: [
      'public.profiles',
      'public.listings',
      'public.buyer_requests',
      'public.request_offers',
    ],
    storageBucket: 'listing-images',
    migrations: [
      'supabase/migrations/20261112000001_user_profiles_and_rls.sql',
      'supabase/migrations/20261112000002_marketplace_listings_requests_offers.sql',
    ],
  };
}

export const getStage2Status = getStage3Status;

/**
 * Uploads a single listing photo file to the `listing-images` Supabase Storage bucket
 * under `${userId}/${timestamp}-${safeName}` (enforced by storage.objects RLS).
 */
export async function uploadListingImageToSupabase(params: {
  userId: string;
  file: File;
}): Promise<{ publicUrl: string | null; error: string | null }> {
  const supabase = createSupabaseBrowserClient();
  if (!supabase) {
    return {
      publicUrl: null,
      error: 'Supabase client is not configured.',
    };
  }

  const objectPath = buildListingStoragePath(params.userId, params.file.name);

  const { error: uploadError } = await supabase.storage
    .from('listing-images')
    .upload(objectPath, params.file, {
      cacheControl: '3600',
      upsert: false,
      contentType: params.file.type || 'image/jpeg',
    });

  if (uploadError) {
    return {
      publicUrl: null,
      error: uploadError.message,
    };
  }

  const { data } = supabase.storage
    .from('listing-images')
    .getPublicUrl(objectPath);

  return {
    publicUrl: data.publicUrl,
    error: null,
  };
}

export async function getMarketplaceListings(
  filters: ListingFilterParams = {},
  sourceListings: Listing[] = INITIAL_LISTINGS
): Promise<Listing[]> {
  return filterListings(sourceListings, filters);
}

export async function getMarketplaceListingById(
  id: string,
  sourceListings: Listing[] = INITIAL_LISTINGS
): Promise<Listing | null> {
  return (
    sourceListings.find((item) => item.id === id || item.slug === id) || null
  );
}

export async function getMarketplaceBuyerRequests(
  filters: RequestFilterParams = {},
  sourceRequests: BuyerRequest[] = INITIAL_BUYER_REQUESTS
): Promise<BuyerRequest[]> {
  return filterBuyerRequests(sourceRequests, filters);
}

export function buildNewListingEntity(input: CreateListingInput): Listing {
  const categoryObj = CATEGORIES.find((c) => c.id === input.category);
  const slugBase = input.title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
  const id = `lst-${slugBase}-${Date.now().toString().slice(-4)}`;

  return {
    id,
    slug: id,
    title: input.title.trim(),
    type: input.type,
    category: input.category,
    categoryLabel: categoryObj?.name || 'Marketplace Item',
    priceNaira: Number(input.priceNaira),
    priceNote: input.priceNote || 'Negotiable',
    condition: input.condition,
    state: input.state,
    city: input.city.trim(),
    area: input.area.trim() || input.city.trim(),
    description: input.description.trim(),
    highlights:
      input.highlights.length > 0
        ? input.highlights
        : [
            `${input.condition} · Ready for inspection`,
            `Location: ${input.city.trim()}, ${input.state}`,
            'Browser-local fallback listing',
          ],
    images: input.images,
    visualTheme: {
      primaryColor: input.type === 'service' ? '#0284C7' : '#2563EB',
      secondaryColor: '#4F46E5',
      illustrationType:
        input.category === 'phones-tablets'
          ? 'iphone'
          : input.category === 'computing'
            ? 'macbook'
            : input.category === 'fashion-sneakers'
              ? 'sneakers'
              : input.type === 'service'
                ? 'webdesign'
                : 'custom',
    },
    featured: true,
    topRated: false,
    createdAt: new Date().toISOString(),
    viewsCount: 1,
    seller: {
      ...DEMO_SELLERS.adebayoTech,
      fullName: input.sellerName
        ? `${input.sellerName.trim()} (Local Preview)`
        : DEMO_SELLERS.adebayoTech.fullName,
      whatsappPhone:
        input.sellerWhatsapp || DEMO_SELLERS.adebayoTech.whatsappPhone,
      state: input.state,
      city: input.city.trim(),
    },
    isDemoData: true,
  };
}

export function buildNewBuyerRequestEntity(
  input: CreateRequestInput
): BuyerRequest {
  const categoryObj = CATEGORIES.find((c) => c.id === input.category);
  const id = `req-${Date.now().toString().slice(-6)}`;
  const initials = input.buyerName
    .trim()
    .split(/\s+/)
    .map((part) => part[0]?.toUpperCase() || '')
    .join('')
    .slice(0, 2);

  return {
    id,
    title: input.title.trim(),
    requestType: input.requestType,
    category: input.category,
    categoryLabel: categoryObj?.name || 'General',
    budgetMinNaira: Number(input.budgetMinNaira) || Number(input.budgetMaxNaira),
    budgetMaxNaira: Number(input.budgetMaxNaira),
    preferredCondition: input.preferredCondition,
    state: input.state,
    city: input.city.trim(),
    area: input.area.trim() || input.city.trim(),
    urgency: input.urgency,
    description: input.description.trim(),
    createdAt: new Date().toISOString(),
    offersCount: 0,
    buyerName: `${input.buyerName.trim()} (Local Preview)`,
    buyerInitials: initials || 'BU',
    buyerWhatsapp: input.buyerWhatsapp.trim() || '08030000000',
    isDemoData: true,
  };
}

export function buildSellerOfferEntity(params: {
  request: BuyerRequest;
  sellerName: string;
  sellerWhatsapp: string;
  offeredPriceNaira: number;
  condition: BuyerRequest['preferredCondition'];
  location: string;
  note: string;
}): SellerOffer {
  return {
    id: `offer-${Date.now().toString().slice(-6)}`,
    requestId: params.request.id,
    requestTitle: params.request.title,
    sellerName: params.sellerName.trim(),
    sellerWhatsapp: params.sellerWhatsapp.trim(),
    offeredPriceNaira: Number(params.offeredPriceNaira),
    condition: params.condition,
    location: params.location.trim(),
    note: params.note.trim(),
    createdAt: new Date().toISOString(),
  };
}
