import { type NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import {
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

  const { data: existingProfile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .maybeSingle();

  let profile = existingProfile as UserProfileRow | null;

  if (!profile) {
    const meta = user.user_metadata || {};
    const googleName =
      (typeof meta.full_name === 'string' && meta.full_name.trim()) ||
      (typeof meta.name === 'string' && meta.name.trim()) ||
      (typeof meta.display_name === 'string' && meta.display_name.trim()) ||
      (user.email || 'Selplase Member').split('@')[0];

    const googleAvatar =
      (typeof meta.avatar_url === 'string' && meta.avatar_url.trim()) ||
      (typeof meta.picture === 'string' && meta.picture.trim()) ||
      null;

    const { data: inserted } = await supabase
      .from('profiles')
      .upsert(
        {
          id: user.id,
          display_name:
            googleName.length >= 2 ? googleName : 'Selplase Member',
          email: user.email || '',
          whatsapp_number: null,
          calling_number: null,
          state: 'Lagos',
          city: 'Lagos',
          account_role: 'both',
          avatar_url: googleAvatar,
          show_whatsapp_publicly: false,
          show_calling_publicly: false,
          onboarding_completed: false,
          onboarding_completed_at: null,
        },
        { onConflict: 'id' }
      )
      .select('*')
      .maybeSingle();

    profile = (inserted as UserProfileRow | null) ?? null;
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
