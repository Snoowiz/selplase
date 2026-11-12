import { NextRequest, NextResponse } from 'next/server';
import { CATEGORIES, INITIAL_BUYER_REQUESTS } from '@/lib/data/mock-marketplace';
import {
  filterBuyerRequests,
  validateCreateRequest,
} from '@/lib/utils/formatters';
import { isProfileOnboardingComplete } from '@/lib/utils/profile-utils';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import {
  type DbMarketplaceBuyerRequestRow,
  mapDbBuyerRequestToBuyerRequest,
} from '@/lib/utils/marketplace-mappers';
import type {
  BuyerRequest,
  CategorySlug,
  ListingType,
} from '@/lib/types/marketplace';
import type { UserProfileRow } from '@/lib/types/profile';

/**
 * GET /api/requests
 * Publicly accessible so visitors can browse buyer requests without logging in.
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const query = searchParams.get('query') || undefined;
  const requestType =
    (searchParams.get('requestType') as 'all' | ListingType) || 'all';
  const category =
    (searchParams.get('category') as 'all' | CategorySlug) || 'all';
  const state = searchParams.get('state') || 'all';
  const includeDemo = searchParams.get('includeDemo') !== 'false';

  let dbRequests: BuyerRequest[] = [];
  let dbReady = false;
  let dbError: string | null = null;

  const supabase = await createSupabaseServerClient();
  if (supabase) {
    const { data, error } = await supabase.rpc('get_marketplace_buyer_requests');
    if (!error && Array.isArray(data)) {
      dbReady = true;
      dbRequests = (data as DbMarketplaceBuyerRequestRow[]).map(
        mapDbBuyerRequestToBuyerRequest
      );
    } else if (error) {
      dbError = error.message;
    }
  }

  const combined = includeDemo
    ? [...dbRequests, ...INITIAL_BUYER_REQUESTS]
    : dbRequests;

  const items = filterBuyerRequests(combined, {
    query,
    requestType,
    category,
    state,
  });

  return NextResponse.json({
    data: items,
    meta: {
      total: items.length,
      dbCount: dbRequests.length,
      demoCount: includeDemo ? INITIAL_BUYER_REQUESTS.length : 0,
      dbReady,
      dbError,
      stage: 'stage-4-selplase-requests',
      currency: 'NGN',
    },
  });
}

/**
 * POST /api/requests
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
          'Unauthorized: Please sign in to your Selplase account to post a buyer request.',
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
          'Forbidden: Please complete your Selplase onboarding profile before posting a buyer request.',
        code: 'ONBOARDING_REQUIRED',
      },
      { status: 403 }
    );
  }

  try {
    const body = await req.json();

    const effectiveBuyerName =
      String(body.buyerName || '').trim() ||
      profile?.display_name ||
      user.user_metadata?.display_name ||
      user.email?.split('@')[0] ||
      'Selplase Buyer';

    const validation = validateCreateRequest({
      ...body,
      buyerName: effectiveBuyerName,
    });

    if (!validation.valid) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.errors },
        { status: 400 }
      );
    }

    const categoryObj = CATEGORIES.find((c) => c.id === body.category);
    const maxBudget = Math.round(Number(body.budgetMaxNaira));
    const minBudget = Math.round(
      Number(body.budgetMinNaira) || Number(body.budgetMaxNaira)
    );

    const { data: inserted, error: insertError } = await supabase
      .from('buyer_requests')
      .insert({
        buyer_id: user.id,
        title: String(body.title).trim(),
        request_type: body.requestType === 'service' ? 'service' : 'product',
        category: body.category,
        category_label: categoryObj?.name || 'General',
        budget_min_naira: minBudget,
        budget_max_naira: maxBudget,
        preferred_condition:
          body.requestType === 'service'
            ? 'Service / N/A'
            : String(body.preferredCondition),
        state: String(body.state).trim(),
        city: String(body.city).trim(),
        area: String(body.area || body.city).trim(),
        urgency: body.urgency || 'This Week',
        description: String(body.description).trim(),
        status: 'open',
      })
      .select('*')
      .single();

    if (insertError || !inserted) {
      return NextResponse.json(
        {
          error:
            insertError?.message ||
            'Failed to insert buyer request into public.buyer_requests. Ensure Stage 3 & Stage 4 SQL migrations have been applied.',
        },
        { status: 400 }
      );
    }

    const mapped = mapDbBuyerRequestToBuyerRequest({
      ...(inserted as DbMarketplaceBuyerRequestRow),
      buyer_display_name: effectiveBuyerName,
      buyer_public_whatsapp: profile?.show_whatsapp_publicly
        ? profile?.whatsapp_number
        : null,
    });

    return NextResponse.json(
      { data: mapped, stage: 'stage-4-selplase-requests', persisted: true },
      { status: 201 }
    );
  } catch {
    return NextResponse.json(
      { error: 'Invalid JSON request payload' },
      { status: 400 }
    );
  }
}
