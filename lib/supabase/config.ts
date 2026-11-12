/**
 * Selplase — Supabase Environment & Configuration Helper
 *
 * Supports the current Supabase publishable-key convention
 * (`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` / `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY`)
 * with automatic fallback to `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
 * Never uses or exposes secret/service-role keys in browser code.
 */

const PLACEHOLDER_URLS = new Set([
  '',
  'https://your-project-id.supabase.co',
  'your-supabase-url',
  'MY_SUPABASE_URL',
]);

const PLACEHOLDER_KEYS = new Set([
  '',
  'your-supabase-publishable-key',
  'your-supabase-anon-key',
  'MY_SUPABASE_KEY',
]);

export interface SupabaseEnvStatus {
  url: string;
  publishableKey: string;
  keySource:
    | 'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY'
    | 'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY'
    | 'NEXT_PUBLIC_SUPABASE_ANON_KEY'
    | 'unconfigured';
  isConfigured: boolean;
}

export function getSupabasePublicEnv(): SupabaseEnvStatus {
  const rawUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').trim();
  const pubKey = (process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || '').trim();
  const pubDefaultKey = (
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY || ''
  ).trim();
  const anonKey = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '').trim();

  let selectedKey = '';
  let keySource: SupabaseEnvStatus['keySource'] = 'unconfigured';

  if (pubKey && !PLACEHOLDER_KEYS.has(pubKey)) {
    selectedKey = pubKey;
    keySource = 'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY';
  } else if (pubDefaultKey && !PLACEHOLDER_KEYS.has(pubDefaultKey)) {
    selectedKey = pubDefaultKey;
    keySource = 'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY';
  } else if (anonKey && !PLACEHOLDER_KEYS.has(anonKey)) {
    selectedKey = anonKey;
    keySource = 'NEXT_PUBLIC_SUPABASE_ANON_KEY';
  }

  const validUrl =
    Boolean(rawUrl) &&
    !PLACEHOLDER_URLS.has(rawUrl) &&
    /^https?:\/\/.+/.test(rawUrl);

  const isConfigured = validUrl && Boolean(selectedKey);

  return {
    url: validUrl ? rawUrl : '',
    publishableKey: selectedKey,
    keySource: isConfigured ? keySource : 'unconfigured',
    isConfigured,
  };
}
