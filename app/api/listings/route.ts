import { NextRequest, NextResponse } from 'next/server';
import { INITIAL_LISTINGS } from '@/lib/data/mock-marketplace';
import { filterListings, validateCreateListing } from '@/lib/utils/formatters';
import { buildNewListingEntity } from '@/lib/supabase/client-ready';
import type { CategorySlug, ListingType, ProductCondition } from '@/lib/types/marketplace';

/**
 * GET /api/listings
 * Stage 1 Mock Route Handler (Prepared for Stage 2 Supabase & Expo Mobile App)
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const query = searchParams.get('query') || undefined;
  const type = (searchParams.get('type') as 'all' | ListingType) || 'all';
  const category = (searchParams.get('category') as 'all' | CategorySlug) || 'all';
  const state = searchParams.get('state') || 'all';
  const condition = (searchParams.get('condition') as 'all' | ProductCondition) || 'all';

  const items = filterListings(INITIAL_LISTINGS, {
    query,
    type,
    category,
    state,
    condition,
  });

  return NextResponse.json({
    data: items,
    meta: {
      total: items.length,
      stage: 'stage-1-mock',
      currency: 'NGN',
    },
  });
}

/**
 * POST /api/listings
 * Validates and constructs a new listing payload (ready for Supabase insert in Stage 2).
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validation = validateCreateListing(body);
    if (!validation.valid) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.errors },
        { status: 400 }
      );
    }
    const created = buildNewListingEntity(body);
    return NextResponse.json({ data: created, stage: 'stage-1-mock' }, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: 'Invalid request payload' },
      { status: 400 }
    );
  }
}
