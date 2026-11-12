import { NextRequest, NextResponse } from 'next/server';
import { CATEGORIES, INITIAL_LISTINGS } from '@/lib/data/mock-marketplace';
import { filterListings, validateCreateListing } from '@/lib/utils/formatters';
import { isProfileOnboardingComplete } from '@/lib/utils/profile-utils';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import {
  type DbMarketplaceListingRow,
  mapDbListingToListing,
  validateListingUpdate,
} from '@/lib/utils/marketplace-mappers';
import type {
  CategorySlug,
  Listing,
  ListingType,
  ProductCondition,
} from '@/lib/types/marketplace';
import type { UserProfileRow } from '@/lib/types/profile';

/**
 * GET /api/listings
 * Publicly accessible so visitors can browse marketplace listings without logging in.
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
      stage: 'stage-4-selplase-listings',
      currency: 'NGN',
    },
  });
}

/**
 * POST /api/listings
 * Requires both an authenticated Supabase session AND a completed Selplase onboarding profile.
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
          'Unauthorized: Please sign in to your Selplase account to publish a listing to the marketplace.',
      },
      { status: 401 }
    );
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .maybeSingle();

  if (!isProfileOnboardingComplete(profile as UserProfileRow | null)) {
    return NextResponse.json(
      {
        error:
          'Forbidden: Please complete your Selplase onboarding profile (display name, Nigerian WhatsApp number, state, city, and account role) before publishing a listing.',
        code: 'ONBOARDING_REQUIRED',
      },
      { status: 403 }
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
            'Failed to insert listing into public.listings. Ensure Stage 3 & Stage 4 SQL migrations have been applied.',
        },
        { status: 400 }
      );
    }

    const mapped = mapDbListingToListing({
      ...(inserted as DbMarketplaceListingRow),
      seller_display_name:
        profile?.display_name ||
        user.user_metadata?.display_name ||
        user.email?.split('@')[0] ||
        'Selplase Seller',
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
      { data: mapped, stage: 'stage-4-selplase-listings', persisted: true },
      { status: 201 }
    );
  } catch {
    return NextResponse.json(
      { error: 'Invalid JSON request payload' },
      { status: 400 }
    );
  }
}

/**
 * PATCH /api/listings
 * Allows a seller to update editable fields of their own listing while blocking
 * self-promotion (`featured`) or view counter manipulation (`views_count`).
 */
export async function PATCH(req: NextRequest) {
  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return NextResponse.json(
      { error: 'Supabase is not configured.' },
      { status: 503 }
    );
  }

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json(
      { error: 'Unauthorized: Sign in to update your listing.' },
      { status: 401 }
    );
  }

  try {
    const body = await req.json();
    const listingId = String(body.listingId || '').trim();
    const updates = (body.updates || {}) as Record<string, unknown>;

    if (!listingId) {
      return NextResponse.json(
        { error: 'listingId is required.' },
        { status: 400 }
      );
    }

    const { data: existingListing, error: fetchError } = await supabase
      .from('listings')
      .select('id, seller_id, featured, views_count')
      .eq('id', listingId)
      .maybeSingle();

    if (fetchError || !existingListing) {
      return NextResponse.json(
        { error: 'Listing not found.' },
        { status: 404 }
      );
    }

    const check = validateListingUpdate({
      authenticatedUserId: user.id,
      existingListing: {
        id: existingListing.id,
        sellerId: existingListing.seller_id,
        featured: Boolean(existingListing.featured),
        viewsCount: Number(existingListing.views_count || 1),
      },
      updates,
    });

    if (!check.allowed) {
      return NextResponse.json(
        { error: check.reason },
        { status: check.status }
      );
    }

    const safeUpdate: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };
    if (typeof updates.title === 'string' && updates.title.trim().length >= 3) {
      safeUpdate.title = updates.title.trim();
    }
    if (typeof updates.price_naira === 'number' && updates.price_naira > 0) {
      safeUpdate.price_naira = Math.round(updates.price_naira);
    }
    if (typeof updates.price_note === 'string') {
      safeUpdate.price_note = updates.price_note.trim();
    }
    if (typeof updates.description === 'string' && updates.description.trim().length >= 10) {
      safeUpdate.description = updates.description.trim();
    }
    if (
      updates.status === 'active' ||
      updates.status === 'sold' ||
      updates.status === 'archived'
    ) {
      safeUpdate.status = updates.status;
    }

    const { data: updated, error: updateError } = await supabase
      .from('listings')
      .update(safeUpdate)
      .eq('id', listingId)
      .eq('seller_id', user.id)
      .select('*')
      .single();

    if (updateError || !updated) {
      return NextResponse.json(
        { error: updateError?.message || 'Failed to update listing.' },
        { status: 400 }
      );
    }

    return NextResponse.json({ data: updated }, { status: 200 });
  } catch {
    return NextResponse.json(
      { error: 'Invalid JSON request payload' },
      { status: 400 }
    );
  }
}
