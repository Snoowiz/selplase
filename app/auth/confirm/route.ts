import { type EmailOtpType } from '@supabase/supabase-js';
import { type NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';

/**
 * GET /auth/confirm
 * Handles Supabase Auth email confirmation & password recovery callback links.
 * Supports both token_hash + type (OTP verification) and PKCE authorization code exchange.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const token_hash = searchParams.get('token_hash');
  const type = searchParams.get('type') as EmailOtpType | null;
  const code = searchParams.get('code');
  const next = searchParams.get('next');

  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return NextResponse.redirect(
      new URL('/account?tab=login&error=supabase_unconfigured', origin)
    );
  }

  if (token_hash && type) {
    const { error } = await supabase.auth.verifyOtp({
      type,
      token_hash,
    });

    if (!error) {
      if (type === 'recovery') {
        return NextResponse.redirect(
          new URL(next || '/account?tab=reset-password', origin)
        );
      }
      return NextResponse.redirect(
        new URL(next || '/account?tab=dashboard&confirmed=1', origin)
      );
    }
  }

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      if (type === 'recovery' || next?.includes('reset-password')) {
        return NextResponse.redirect(
          new URL(next || '/account?tab=reset-password', origin)
        );
      }
      return NextResponse.redirect(
        new URL(next || '/account?tab=dashboard&confirmed=1', origin)
      );
    }
  }

  return NextResponse.redirect(
    new URL('/account?tab=login&error=confirmation_failed', origin)
  );
}
