import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import {
  toPublicSellerProfile,
  validateOnboardingInput,
} from '@/lib/utils/profile-utils';
import type { AccountRole, UserProfileRow } from '@/lib/types/profile';

/**
 * POST /api/onboarding
 * Validates compulsory Selplase onboarding fields on the server (display name,
 * Nigerian WhatsApp number normalised to +234, Nigerian state, city/town, and account role)
 * and persists `onboarding_completed = true` to `public.profiles`.
 * Never trusts a client-supplied completion flag without validating compulsory fields.
 */
export async function POST(req: NextRequest) {
  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return NextResponse.json(
      {
        error:
          'Supabase is not yet configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY.',
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
      { error: 'Unauthorized: Please sign in with Google to complete onboarding.' },
      { status: 401 }
    );
  }

  try {
    const body = await req.json();

    const validation = validateOnboardingInput({
      displayName: String(body.displayName || ''),
      whatsappNumber: String(body.whatsappNumber || ''),
      callingNumber:
        typeof body.callingNumber === 'string' ? body.callingNumber : '',
      state: String(body.state || ''),
      city: String(body.city || ''),
      accountRole: (body.accountRole as AccountRole) || 'both',
    });

    if (!validation.valid || !validation.normalizedWhatsapp) {
      return NextResponse.json(
        {
          error: 'Please complete all compulsory onboarding fields.',
          details: validation.errors,
        },
        { status: 400 }
      );
    }

    const meta = user.user_metadata || {};
    const googleAvatar =
      (typeof meta.avatar_url === 'string' && meta.avatar_url.trim()) ||
      (typeof meta.picture === 'string' && meta.picture.trim()) ||
      null;

    const nowIso = new Date().toISOString();

    const { data: updatedProfile, error: upsertError } = await supabase
      .from('profiles')
      .upsert(
        {
          id: user.id,
          display_name: String(body.displayName).trim(),
          email: user.email || '',
          whatsapp_number: validation.normalizedWhatsapp,
          calling_number: validation.normalizedCalling,
          state: String(body.state).trim(),
          city: String(body.city).trim(),
          account_role: body.accountRole as AccountRole,
          avatar_url: googleAvatar,
          show_whatsapp_publicly: false,
          show_calling_publicly: false,
          onboarding_completed: true,
          onboarding_completed_at: nowIso,
          updated_at: nowIso,
        },
        { onConflict: 'id' }
      )
      .select('*')
      .single();

    if (upsertError || !updatedProfile) {
      return NextResponse.json(
        {
          error:
            upsertError?.message ||
            'Failed to save onboarding details. Ensure Stage 4 SQL migration has been applied.',
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        data: updatedProfile as UserProfileRow,
        publicProjection: toPublicSellerProfile(updatedProfile as UserProfileRow),
        onboardingCompleted: true,
      },
      { status: 200 }
    );
  } catch {
    return NextResponse.json(
      { error: 'Malformed JSON request body.' },
      { status: 400 }
    );
  }
}
