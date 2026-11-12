import { type NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import {
  buildInitialMissingProfileInsert,
  classifyProfileFetchOutcome,
  isProfileOnboardingComplete,
  sanitizeRedirectPath,
} from '@/lib/utils/profile-utils';
import type { UserProfileRow } from '@/lib/types/profile';

/**
 * GET /auth/callback
 * Secure OAuth PKCE callback handler for "Continue with Google" via Supabase Auth.
 * - Exchanges authorization `code` for a persistent session cookie.
 * - Sanitises `next` destination to prevent open-redirect vulnerabilities.
 * - Checks whether the user's Selplase profile has completed onboarding:
 *   - Uses `classifyProfileFetchOutcome()` so transient DB/permission errors do not
 *     overwrite an existing profile with incomplete defaults.
 *   - Only executes `.insert()` (never `.upsert()`) when the profile row is
 *     genuinely missing (`!selectError && !existingProfile`).
 *   - Incomplete profiles are redirected to `/onboarding?next=<safeNext>`.
 *   - Completed profiles bypass onboarding and go directly to `<safeNext>`.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const oauthError =
    searchParams.get('error') || searchParams.get('error_description');
  const safeNext = sanitizeRedirectPath(
    searchParams.get('next'),
    '/account?tab=dashboard'
  );

  if (oauthError) {
    return NextResponse.redirect(
      new URL('/account?tab=login&error=oauth_failed', origin)
    );
  }

  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return NextResponse.redirect(
      new URL('/account?tab=login&error=supabase_unconfigured', origin)
    );
  }

  if (!code) {
    return NextResponse.redirect(
      new URL('/account?tab=login&error=oauth_failed', origin)
    );
  }

  const { data, error } = await supabase.auth.exchangeCodeForSession(code);
  if (error || !data.user) {
    return NextResponse.redirect(
      new URL('/account?tab=login&error=oauth_failed', origin)
    );
  }

  const user = data.user;

  const { data: existingProfile, error: selectError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .maybeSingle();

  const fetchOutcome = classifyProfileFetchOutcome({
    data: existingProfile as UserProfileRow | null,
    error: selectError,
  });

  let profile: UserProfileRow | null =
    fetchOutcome.status === 'found' ? (fetchOutcome.profile ?? null) : null;

  if (fetchOutcome.status === 'missing') {
    const initialRow = buildInitialMissingProfileInsert({
      userId: user.id,
      email: user.email,
      userMetadata: (user.user_metadata || {}) as Record<string, unknown>,
    });

    const { data: inserted, error: insertError } = await supabase
      .from('profiles')
      .insert(initialRow)
      .select('*')
      .maybeSingle();

    if (!insertError && inserted) {
      profile = inserted as UserProfileRow;
    } else if (insertError?.code === '23505') {
      const { data: refetched } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();
      profile = (refetched as UserProfileRow | null) ?? null;
    }
  }

  if (!isProfileOnboardingComplete(profile)) {
    const onboardingUrl = new URL('/onboarding', origin);
    if (safeNext && safeNext !== '/onboarding') {
      onboardingUrl.searchParams.set('next', safeNext);
    }
    return NextResponse.redirect(onboardingUrl);
  }

  return NextResponse.redirect(new URL(safeNext, origin));
}
