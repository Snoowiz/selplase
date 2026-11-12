import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import {
  buildOnboardingProfileUpdate,
  classifyProfileFetchOutcome,
  toPublicSellerProfile,
  validateOnboardingInput,
} from '@/lib/utils/profile-utils';
import type { AccountRole, UserProfileRow } from '@/lib/types/profile';

/**
 * POST /api/onboarding
 * Validates compulsory Selplase onboarding fields on the server (display name,
 * Nigerian WhatsApp number normalised to +234, confirmed Nigerian state, city/town,
 * and account role) and persists `onboarding_completed = true` to `public.profiles`.
 *
 * Security & Permission Invariants (Stage 4.1):
 * - Authenticates the user on the server via `supabase.auth.getUser()`.
 * - For an existing profile: executes a targeted `.update()` containing ONLY
 *   permitted onboarding columns (`display_name`, `whatsapp_number`,
 *   `calling_number`, `state`, `city`, `account_role`, `avatar_url`,
 *   `onboarding_completed`, `onboarding_completed_at`, `updated_at`), preserving
 *   existing `show_whatsapp_publicly` and `show_calling_publicly` preferences
 *   and never touching protected columns (`id`, `email`, `is_admin`, `verification_status`).
 * - For a genuinely missing profile: executes `.insert()` (never `.upsert()`),
 *   with a safe fallback to `.update()` if a concurrent insert (`23505`) occurs.
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
      {
        error:
          'Unauthorized: Please sign in with Google to complete your Selplase onboarding profile.',
      },
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
          fieldErrors: validation.errors,
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

    const { data: existingProfile, error: selectError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .maybeSingle();

    const fetchOutcome = classifyProfileFetchOutcome({
      data: existingProfile as UserProfileRow | null,
      error: selectError,
    });

    if (fetchOutcome.status === 'auth_expired') {
      return NextResponse.json(
        { error: fetchOutcome.message },
        { status: 401 }
      );
    }

    if (fetchOutcome.status === 'permission_denied') {
      return NextResponse.json(
        { error: fetchOutcome.message },
        { status: 403 }
      );
    }

    if (fetchOutcome.status === 'connection_error') {
      return NextResponse.json(
        { error: fetchOutcome.message },
        { status: 503 }
      );
    }

    if (fetchOutcome.status === 'unexpected_error') {
      return NextResponse.json(
        { error: fetchOutcome.message },
        { status: 500 }
      );
    }

    const permittedUpdatePayload = buildOnboardingProfileUpdate({
      displayName: String(body.displayName),
      normalizedWhatsapp: validation.normalizedWhatsapp,
      normalizedCalling: validation.normalizedCalling,
      state: String(body.state),
      city: String(body.city),
      accountRole: body.accountRole as AccountRole,
      existingAvatarUrl: existingProfile?.avatar_url,
      googleAvatarUrl: googleAvatar,
      nowIso,
    });

    // Case 1: Existing profile row — update ONLY permitted onboarding columns
    // and preserve existing `show_whatsapp_publicly` / `show_calling_publicly`.
    if (fetchOutcome.status === 'found') {
      const { data: updatedProfile, error: updateError } = await supabase
        .from('profiles')
        .update(permittedUpdatePayload)
        .eq('id', user.id)
        .select('*')
        .single();

      if (updateError || !updatedProfile) {
        return NextResponse.json(
          {
            error:
              updateError?.message ||
              'Failed to update onboarding details in public.profiles.',
          },
          { status: 400 }
        );
      }

      return NextResponse.json(
        {
          data: updatedProfile as UserProfileRow,
          publicProjection: toPublicSellerProfile(
            updatedProfile as UserProfileRow
          ),
          onboardingCompleted: true,
        },
        { status: 200 }
      );
    }

    // Case 2: Genuinely missing profile row — create safely via `.insert()`
    // using only columns permitted by GRANT INSERT on `public.profiles`.
    const { data: insertedProfile, error: insertError } = await supabase
      .from('profiles')
      .insert({
        id: user.id,
        display_name: permittedUpdatePayload.display_name,
        email: user.email || '',
        whatsapp_number: permittedUpdatePayload.whatsapp_number,
        calling_number: permittedUpdatePayload.calling_number,
        state: permittedUpdatePayload.state,
        city: permittedUpdatePayload.city,
        account_role: permittedUpdatePayload.account_role,
        avatar_url: permittedUpdatePayload.avatar_url,
        show_whatsapp_publicly: false,
        show_calling_publicly: false,
        onboarding_completed: true,
        onboarding_completed_at: nowIso,
      })
      .select('*')
      .single();

    if (insertError) {
      // If a concurrent request or auth trigger inserted the row simultaneously,
      // fall back to a permission-safe `.update()` of permitted columns only.
      if (insertError.code === '23505') {
        const { data: racedProfile, error: raceUpdateError } = await supabase
          .from('profiles')
          .update(permittedUpdatePayload)
          .eq('id', user.id)
          .select('*')
          .single();

        if (!raceUpdateError && racedProfile) {
          return NextResponse.json(
            {
              data: racedProfile as UserProfileRow,
              publicProjection: toPublicSellerProfile(
                racedProfile as UserProfileRow
              ),
              onboardingCompleted: true,
            },
            { status: 200 }
          );
        }
      }

      return NextResponse.json(
        {
          error:
            insertError.message ||
            'Failed to create onboarding profile in public.profiles.',
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        data: insertedProfile as UserProfileRow,
        publicProjection: toPublicSellerProfile(
          insertedProfile as UserProfileRow
        ),
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
