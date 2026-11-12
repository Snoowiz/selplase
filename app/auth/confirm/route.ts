import { type EmailOtpType } from '@supabase/supabase-js';
import { type NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import {
  isProfileOnboardingComplete,
  sanitizeRedirectPath,
} from '@/lib/utils/profile-utils';
import type { UserProfileRow } from '@/lib/types/profile';

/**
 * GET /auth/confirm
 * Handles Supabase Auth email confirmation & password recovery callback links.
 * Enforces safe internal redirect paths via `sanitizeRedirectPath` and redirects
 * incomplete profiles to `/onboarding`.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const token_hash = searchParams.get('token_hash');
  const type = searchParams.get('type') as EmailOtpType | null;
  const code = searchParams.get('code');
  const rawNext = searchParams.get('next');

  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return NextResponse.redirect(
      new URL('/account?tab=login&error=supabase_unconfigured', origin)
    );
  }

  const completeRedirectForUser = async (defaultPath: string) => {
    const safeTarget = sanitizeRedirectPath(rawNext, defaultPath);
    if (type === 'recovery' || safeTarget.includes('reset-password')) {
      return NextResponse.redirect(new URL(safeTarget, origin));
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

      if (!isProfileOnboardingComplete(profile as UserProfileRow | null)) {
        const onboardingUrl = new URL('/onboarding', origin);
        if (safeTarget && safeTarget !== '/onboarding') {
          onboardingUrl.searchParams.set('next', safeTarget);
        }
        return NextResponse.redirect(onboardingUrl);
      }
    }

    return NextResponse.redirect(new URL(safeTarget, origin));
  };

  if (token_hash && type) {
    const { error } = await supabase.auth.verifyOtp({
      type,
      token_hash,
    });

    if (!error) {
      return completeRedirectForUser(
        type === 'recovery'
          ? '/account?tab=reset-password'
          : '/account?tab=dashboard&confirmed=1'
      );
    }
  }

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return completeRedirectForUser(
        type === 'recovery'
          ? '/account?tab=reset-password'
          : '/account?tab=dashboard&confirmed=1'
      );
    }
  }

  return NextResponse.redirect(
    new URL('/account?tab=login&error=confirmation_failed', origin)
  );
}
