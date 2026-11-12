import { NextRequest, NextResponse } from 'next/server';
import { INITIAL_BUYER_REQUESTS } from '@/lib/data/mock-marketplace';
import { filterBuyerRequests, validateCreateRequest } from '@/lib/utils/formatters';
import { buildNewBuyerRequestEntity } from '@/lib/supabase/client-ready';
import type { CategorySlug, ListingType } from '@/lib/types/marketplace';

/**
 * GET /api/requests
 * Stage 1 Mock Route Handler for Buyer Requests (Prepared for Stage 2 Supabase & Expo)
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const query = searchParams.get('query') || undefined;
  const requestType = (searchParams.get('requestType') as 'all' | ListingType) || 'all';
  const category = (searchParams.get('category') as 'all' | CategorySlug) || 'all';
  const state = searchParams.get('state') || 'all';

  const items = filterBuyerRequests(INITIAL_BUYER_REQUESTS, {
    query,
    requestType,
    category,
    state,
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
 * POST /api/requests
 * Validates and constructs a new Buyer Request payload.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validation = validateCreateRequest(body);
    if (!validation.valid) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.errors },
        { status: 400 }
      );
    }
    const created = buildNewBuyerRequestEntity(body);
    return NextResponse.json({ data: created, stage: 'stage-1-mock' }, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: 'Invalid request payload' },
      { status: 400 }
    );
  }
}
