import { NextRequest, NextResponse } from 'next/server';
import { CATEGORIES, INITIAL_LISTINGS } from '@/lib/data/mock-marketplace';
import { filterListings, validateCreateListing } from '@/lib/utils/formatters';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import {
  type DbMarketplaceListingRow,
  mapDbListingToListing,
} from '@/lib/utils/marketplace-mappers';
import type {
  CategorySlug,
  Listing,
  ListingType,
  ProductCondition,
} from '@/lib/types/marketplace';

/**
 * GET /api/listings
 * Stage 3: Queries live Supabase `public.get_marketplace_listings()` RPC (or `public.listings`).
 * Preserves starter demonstration listings alongside real database rows so the catalog remains
 * populated before and after migration, while clearly tagging `isDemoData: false` on DB rows.
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const query = searchParams.get('query') || undefined;
  const type = (searchParams.get('type') as 'all' | ListingType) || 'all';
  const category =
    (searchParams.get('category') as 'all' | CategorySlug) || 'all';
  const state = searchParams.get('state') || 'all';
  const condition =
    (searchParams.get('condition') as 'all' | ProductCondition) || 'all';
  const includeDemo = searchParams.get('includeDemo') !== 'false';

  let dbListings: Listing[] = [];
  let dbReady = false;
  let dbError: string | null = null;

  const supabase = await createSupabaseServerClient();
  if (supabase) {
    const { data, error } = await supabase.rpc('get_marketplace_listings');
    if (!error && Array.isArray(data)) {
      dbReady = true;
      dbListings = (data as DbMarketplaceListingRow[]).map(
        mapDbListingToListing
      );
    } else if (error) {
      dbError = error.message;
    }
  }

  const combined = includeDemo
    ? [...dbListings, ...INITIAL_LISTINGS]
    : dbListings;

  const filtered = filterListings(combined, {
    query,
    type,
    category,
    state,
    condition,
  });

  return NextResponse.json({
    data: filtered,
    meta: {
      total: filtered.length,
      dbCount: dbListings.length,
      demoCount: includeDemo ? INITIAL_LISTINGS.length : 0,
      dbReady,
      dbError,
      stage: 'stage-3-supabase-listings',
      currency: 'NGN',
    },
  });
}

/**
 * POST /api/listings
 * Stage 3: Authenticates the seller via Supabase Auth, validates the listing payload,
 * and inserts a new row into `public.listings` with `seller_id = user.id`.
 */
export async function POST(req: NextRequest) {
  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return NextResponse.json(
      {
        error:
          'Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY.',
      },
      { status: 503 }
    );
  }

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json(
      {
        error:
          'Unauthorized: Please sign in to your SELPLAS account to publish a listing to the marketplace.',
      },
      { status: 401 }
    );
  }

  try {
    const body = await req.json();
    const validation = validateCreateListing(body);
    if (!validation.valid) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.errors },
        { status: 400 }
      );
    }

    const categoryObj = CATEGORIES.find((c) => c.id === body.category);
    const slugBase = String(body.title)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '')
      .slice(0, 64);
    const slug = `${slugBase || 'listing'}-${Date.now().toString(36)}`;

    const highlights: string[] = Array.isArray(body.highlights)
      ? body.highlights
          .map((item: unknown) => String(item).trim())
          .filter(Boolean)
      : [];

    const images: string[] = Array.isArray(body.images)
      ? body.images
          .map((item: unknown) => String(item).trim())
          .filter(Boolean)
          .slice(0, 4)
      : [];

    const { data: inserted, error: insertError } = await supabase
      .from('listings')
      .insert({
        slug,
        seller_id: user.id,
        title: String(body.title).trim(),
        type: body.type === 'service' ? 'service' : 'product',
        category: body.category,
        category_label: categoryObj?.name || 'Marketplace Item',
        price_naira: Math.round(Number(body.priceNaira)),
        price_note: String(body.priceNote || 'Negotiable').trim(),
        condition:
          body.type === 'service' ? 'Service / N/A' : String(body.condition),
        state: String(body.state).trim(),
        city: String(body.city).trim(),
        area: String(body.area || body.city).trim(),
        description: String(body.description).trim(),
        highlights,
        images,
        status: 'active',
      })
      .select('*')
      .single();

    if (insertError || !inserted) {
      return NextResponse.json(
        {
          error:
            insertError?.message ||
            'Failed to insert listing into public.listings. Ensure Stage 3 SQL migration has been applied.',
        },
        { status: 400 }
      );
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .maybeSingle();

    const mapped = mapDbListingToListing({
      ...(inserted as DbMarketplaceListingRow),
      seller_display_name:
        profile?.display_name ||
        user.user_metadata?.display_name ||
        user.email?.split('@')[0] ||
        'SELPLAS Seller',
      seller_state: profile?.state || String(body.state),
      seller_city: profile?.city || String(body.city),
      seller_verification_status: profile?.verification_status || 'unverified',
      seller_joined_at: profile?.created_at || user.created_at,
      seller_public_whatsapp: profile?.show_whatsapp_publicly
        ? profile?.whatsapp_number
        : null,
      seller_public_calling: profile?.show_calling_publicly
        ? profile?.calling_number
        : null,
    });

    return NextResponse.json(
      { data: mapped, stage: 'stage-3-supabase-listings', persisted: true },
      { status: 201 }
    );
  } catch {
    return NextResponse.json(
      { error: 'Invalid JSON request payload' },
      { status: 400 }
    );
  }
}
