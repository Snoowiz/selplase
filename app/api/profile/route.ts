import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import {
  toPublicSellerProfile,
  validateAndSanitizeProfileUpdate,
} from '@/lib/utils/profile-utils';
import type { UserProfileRow } from '@/lib/types/profile';

/**
 * GET /api/profile
 * - If `?publicSellerId=<uuid>` is provided, returns ONLY approved public seller fields.
 * - Otherwise, requires an authenticated Supabase session and returns the owner's private profile.
 */
export async function GET(req: NextRequest) {
  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return NextResponse.json(
      {
        error:
          'Supabase is not yet configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY.',
        configured: false,
      },
      { status: 503 }
    );
  }

  const { searchParams } = new URL(req.url);
  const publicSellerId = searchParams.get('publicSellerId');

  if (publicSellerId) {
    const { data, error } = await supabase.rpc('get_public_seller_profile', {
      target_profile_id: publicSellerId,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    const row = Array.isArray(data) ? data[0] : data;
    if (!row) {
      return NextResponse.json(
        { error: 'Public seller profile not found.' },
        { status: 404 }
      );
    }

    return NextResponse.json({ data: row, publicView: true });
  }

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json(
      { error: 'Unauthorized: Please sign in to access your private profile.' },
      { status: 401 }
    );
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  if (profileError || !profile) {
    return NextResponse.json(
      {
        error: profileError?.message || 'Profile record not found.',
      },
      { status: 404 }
    );
  }

  return NextResponse.json({
    data: profile as UserProfileRow,
    publicProjection: toPublicSellerProfile(profile as UserProfileRow),
  });
}

/**
 * PATCH /api/profile
 * Authenticates the user on the server, verifies ownership (`user.id === targetProfileId`),
 * blocks privilege escalation (`is_admin`, `verification_status`, `email`), normalises Nigerian phone numbers,
 * and updates `public.profiles`.
 */
export async function PATCH(req: NextRequest) {
  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return NextResponse.json(
      {
        error:
          'Supabase is not yet configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY.',
        configured: false,
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
      { error: 'Unauthorized: You must be signed in to update a profile.' },
      { status: 401 }
    );
  }

  try {
    const body = await req.json();
    const targetProfileId =
      typeof body.targetProfileId === 'string' && body.targetProfileId.trim()
        ? body.targetProfileId.trim()
        : user.id;

    const updates =
      typeof body.updates === 'object' && body.updates !== null
        ? (body.updates as Record<string, unknown>)
        : (body as Record<string, unknown>);

    const check = validateAndSanitizeProfileUpdate({
      authenticatedUserId: user.id,
      targetProfileId,
      payload: updates,
    });

    if (!check.ok || !check.sanitized) {
      return NextResponse.json(
        { error: check.error || 'Invalid profile update request.' },
        { status: check.status }
      );
    }

    const { data: updatedProfile, error: updateError } = await supabase
      .from('profiles')
      .update(check.sanitized)
      .eq('id', user.id)
      .select('*')
      .single();

    if (updateError) {
      return NextResponse.json(
        { error: updateError.message },
        { status: 400 }
      );
    }

    return NextResponse.json({
      data: updatedProfile as UserProfileRow,
      publicProjection: toPublicSellerProfile(updatedProfile as UserProfileRow),
    });
  } catch {
    return NextResponse.json(
      { error: 'Malformed JSON request body.' },
      { status: 400 }
    );
  }
}
