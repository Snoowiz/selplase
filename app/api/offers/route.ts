import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { isProfileOnboardingComplete } from '@/lib/utils/profile-utils';
import {
  type DbRequestOfferRow,
  mapDbOfferToSellerOffer,
  validateOfferSubmission,
  validateOfferUpdate,
} from '@/lib/utils/marketplace-mappers';
import type { UserProfileRow } from '@/lib/types/profile';

/**
 * GET /api/offers
 * Returns `public.request_offers` visible to the authenticated user.
 */
export async function GET() {
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
      { error: 'Unauthorized: Sign in to view request offers.' },
      { status: 401 }
    );
  }

  const { data, error } = await supabase
    .from('request_offers')
    .select(
      `
      id,
      request_id,
      seller_id,
      offered_price_naira,
      condition,
      location,
      note,
      status,
      created_at,
      buyer_requests (
        title
      )
    `
    )
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json(
      { error: error.message, dbReady: false },
      { status: 400 }
    );
  }

  const mapped = (data || []).map((row: Record<string, unknown>) => {
    const reqRelation = row.buyer_requests as { title?: string } | null;
    return mapDbOfferToSellerOffer({
      id: String(row.id),
      request_id: String(row.request_id),
      seller_id: String(row.seller_id),
      offered_price_naira: Number(row.offered_price_naira),
      condition: row.condition as DbRequestOfferRow['condition'],
      location: String(row.location),
      note: (row.note as string) || '',
      status: (row.status as DbRequestOfferRow['status']) || 'pending',
      created_at: String(row.created_at),
      request_title: reqRelation?.title || 'Buyer Request',
    });
  });

  return NextResponse.json({
    data: mapped,
    meta: {
      total: mapped.length,
      dbReady: true,
      stage: 'stage-4-selplase-offers',
    },
  });
}

/**
 * POST /api/offers
 * Requires both an authenticated Supabase session AND a completed Selplase onboarding profile.
 * Blocks self-offers and persists to `public.request_offers`.
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
          'Unauthorized: Please sign in to your Selplase account to submit an "I Have This" offer.',
      },
      { status: 401 }
    );
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .maybeSingle();

  const onboardingDone = isProfileOnboardingComplete(
    profile as UserProfileRow | null
  );

  try {
    const body = await req.json();
    const requestId = String(body.requestId || '').trim();
    const offeredPriceNaira = Math.round(Number(body.offeredPriceNaira));
    const condition = String(body.condition || 'Foreign Used (Tokunbo)');
    const location = String(body.location || '').trim();
    const note = String(body.note || '').trim();

    if (!requestId) {
      return NextResponse.json(
        { error: 'Target buyer request ID is required.' },
        { status: 400 }
      );
    }

    const { data: targetRequest } = await supabase
      .from('buyer_requests')
      .select('id, buyer_id, title')
      .eq('id', requestId)
      .maybeSingle();

    const validation = validateOfferSubmission({
      authenticatedSellerId: user.id,
      buyerRequestOwnerId: targetRequest?.buyer_id || null,
      offeredPriceNaira,
      location,
      note,
      sellerOnboardingCompleted: onboardingDone,
    });

    if (!validation.valid) {
      return NextResponse.json(
        {
          error: validation.error,
          code: !onboardingDone ? 'ONBOARDING_REQUIRED' : undefined,
        },
        { status: validation.status }
      );
    }

    const { data: inserted, error: insertError } = await supabase
      .from('request_offers')
      .insert({
        request_id: requestId,
        seller_id: user.id,
        offered_price_naira: offeredPriceNaira,
        condition,
        location,
        note,
        status: 'pending',
      })
      .select('*')
      .single();

    if (insertError || !inserted) {
      return NextResponse.json(
        {
          error:
            insertError?.message ||
            'Failed to insert offer into public.request_offers. Ensure the request exists in Supabase and Stage 3 & 4 SQL migrations have been applied.',
        },
        { status: 400 }
      );
    }

    const mapped = mapDbOfferToSellerOffer({
      ...(inserted as DbRequestOfferRow),
      request_title:
        targetRequest?.title || String(body.requestTitle || 'Buyer Request'),
      seller_display_name:
        profile?.display_name ||
        user.user_metadata?.display_name ||
        'Registered Seller',
      seller_public_whatsapp: profile?.show_whatsapp_publicly
        ? profile?.whatsapp_number
        : null,
    });

    return NextResponse.json(
      { data: mapped, stage: 'stage-4-selplase-offers', persisted: true },
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
 * PATCH /api/offers
 * Role-specific offer update endpoint enforcing participant field boundaries:
 * - Sellers may only update offer terms while status is 'pending' (never status).
 * - Buyers (request owners) may only transition status ('accepted' | 'declined') (never price/terms).
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
      { error: 'Unauthorized: Please sign in to update an offer.' },
      { status: 401 }
    );
  }

  try {
    const body = await req.json();
    const offerId = String(body.offerId || '').trim();
    const updates =
      typeof body.updates === 'object' && body.updates !== null
        ? (body.updates as Record<string, unknown>)
        : {};

    if (!offerId) {
      return NextResponse.json(
        { error: 'offerId is required.' },
        { status: 400 }
      );
    }

    const { data: existingOffer } = await supabase
      .from('request_offers')
      .select('id, request_id, seller_id, status')
      .eq('id', offerId)
      .maybeSingle();

    if (!existingOffer) {
      return NextResponse.json(
        { error: 'Offer not found or access denied.' },
        { status: 404 }
      );
    }

    const { data: parentRequest } = await supabase
      .from('buyer_requests')
      .select('buyer_id')
      .eq('id', existingOffer.request_id)
      .maybeSingle();

    if (!parentRequest) {
      return NextResponse.json(
        { error: 'Parent buyer request not found.' },
        { status: 404 }
      );
    }

    const check = validateOfferUpdate({
      authenticatedUserId: user.id,
      existingOffer: existingOffer as {
        id: string;
        request_id: string;
        seller_id: string;
        status: 'pending' | 'accepted' | 'declined';
      },
      buyerRequestOwnerId: String(parentRequest.buyer_id),
      updates,
    });

    if (!check.valid || !check.sanitizedUpdates) {
      return NextResponse.json(
        { error: check.error || 'Forbidden offer update.' },
        { status: check.status }
      );
    }

    const { data: updated, error: updateError } = await supabase
      .from('request_offers')
      .update(check.sanitizedUpdates)
      .eq('id', offerId)
      .select('*')
      .single();

    if (updateError || !updated) {
      return NextResponse.json(
        { error: updateError?.message || 'Failed to update offer.' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      data: mapDbOfferToSellerOffer(updated as DbRequestOfferRow),
    });
  } catch {
    return NextResponse.json(
      { error: 'Invalid JSON request payload.' },
      { status: 400 }
    );
  }
}
