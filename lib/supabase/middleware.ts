import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { getSupabasePublicEnv } from './config';

/**
 * Refreshes the user's Supabase Auth session cookies on incoming requests.
 * If Supabase is not yet configured in environment variables, passes through cleanly.
 */
export async function updateSupabaseSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const env = getSupabasePublicEnv();
  if (!env.isConfigured) {
    return supabaseResponse;
  }

  const supabase = createServerClient(env.url, env.publishableKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value)
        );
        supabaseResponse = NextResponse.next({
          request,
        });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options)
        );
      },
    },
  });

  // Refresh session token if expired — required for @supabase/ssr Server Components
  await supabase.auth.getUser();

  return supabaseResponse;
}
