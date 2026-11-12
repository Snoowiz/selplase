import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type { SupabaseClient } from '@supabase/supabase-js';
import { getSupabasePublicEnv } from './config';

/**
 * Reusable server Supabase client for Next.js 15 App Router Server Components,
 * Server Actions, and Route Handlers using @supabase/ssr.
 * Returns `null` if Supabase environment variables are not yet configured.
 */
export async function createSupabaseServerClient(): Promise<SupabaseClient | null> {
  const env = getSupabasePublicEnv();
  if (!env.isConfigured) {
    return null;
  }

  const cookieStore = await cookies();

  return createServerClient(env.url, env.publishableKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // Called from a Server Component where setting cookies is a no-op
          // because middleware refreshes the session.
        }
      },
    },
  });
}
