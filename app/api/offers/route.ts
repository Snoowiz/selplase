import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import {
  type DbRequestOfferRow,
  mapDbOfferToSellerOffer,
  validateOfferSubmission,
} from '@/lib/utils/marketplace-mappers';

/**
 * GET /api/offers
 * Stage 3: Returns `public.request_offers` visible to the authenticated user
 * (offers submitted by this seller OR offers received on this user's buyer requests, enforced by RLS).
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
      stage: 'stage-3-supabase-offers',
    },
  });
}

/**
 * POST /api/offers
 * Stage 3: Authenticates the seller, verifies they do not own the target buyer request,
 * and inserts a new offer into `public.request_offers`.
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
          'Unauthorized: Please sign in to your SELPLAS account to submit an "I Have This" offer.',
      },
      { status: 401 }
    );
  }

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
    });

    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.error },
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
            'Failed to insert offer into public.request_offers. Ensure the request exists in Supabase and Stage 3 SQL migration has been applied.',
        },
        { status: 400 }
      );
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('display_name, whatsapp_number, show_whatsapp_publicly')
      .eq('id', user.id)
      .maybeSingle();

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
      { data: mapped, stage: 'stage-3-supabase-offers', persisted: true },
      { status: 201 }
    );
  } catch {
    return NextResponse.json(
      { error: 'Invalid JSON request payload' },
      { status: 400 }
    );
  }
}
