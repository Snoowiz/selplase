'use client';

import { createBrowserClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';
import { getSupabasePublicEnv } from './config';

let browserClientInstance: SupabaseClient | null = null;

/**
 * Reusable browser Supabase client using @supabase/ssr.
 * Returns `null` if NEXT_PUBLIC_SUPABASE_URL and a publishable/anon key are not yet configured.
 */
export function createSupabaseBrowserClient(): SupabaseClient | null {
  const env = getSupabasePublicEnv();
  if (!env.isConfigured) {
    return null;
  }

  if (!browserClientInstance) {
    browserClientInstance = createBrowserClient(env.url, env.publishableKey);
  }

  return browserClientInstance;
}
