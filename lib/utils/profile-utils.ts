import type {
  AccountRole,
  OnboardingFormInput,
  PermittedProfileUpdateInput,
  PublicSellerProfile,
  RegistrationFormInput,
  UserProfileRow,
} from '../types/profile';
import { NIGERIAN_STATES } from '../data/mock-marketplace';

const NIGERIAN_E164_REGEX = /^\+234[789][01][0-9]{8}$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const VALID_ROLES: AccountRole[] = ['buyer', 'seller', 'both'];
const VALID_STATES_SET = new Set<string>(NIGERIAN_STATES);

/**
 * Normalises a Nigerian phone number into E.164 international format (+234...).
 * Examples:
 * - "0803 000 1122" -> { valid: true, normalized: "+2348030001122" }
 * - "2348090002233" -> { valid: true, normalized: "+2348090002233" }
 * - "+2348120003344" -> { valid: true, normalized: "+2348120003344" }
 */
export function normalizeNigerianPhone(raw?: string | null): {
  valid: boolean;
  normalized: string | null;
  error?: string;
} {
  if (raw === undefined || raw === null || raw.trim() === '') {
    return { valid: true, normalized: null };
  }

  const cleaned = raw.replace(/[\s\-().]/g, '');
  let candidate = cleaned;

  if (candidate.startsWith('0') && candidate.length === 11) {
    candidate = `+234${candidate.slice(1)}`;
  } else if (candidate.startsWith('234') && candidate.length === 13) {
    candidate = `+${candidate}`;
  } else if (/^[789][01][0-9]{8}$/.test(candidate)) {
    candidate = `+234${candidate}`;
  }

  if (!NIGERIAN_E164_REGEX.test(candidate)) {
    return {
      valid: false,
      normalized: null,
      error:
        'Please enter a valid Nigerian mobile number (e.g., 0803 000 1122 or +234 803 000 1122).',
    };
  }

  return { valid: true, normalized: candidate };
}

/**
 * Sanitises OAuth, email-confirmation, and onboarding `next` redirect paths.
 * Blocks open redirects (`https://evil.com`, `//evil.com`, `/\evil.com`, `javascript:...`).
 */
export function sanitizeRedirectPath(
  rawNext: string | null | undefined,
  fallback: string = '/account?tab=dashboard'
): string {
  if (!rawNext || typeof rawNext !== 'string') {
    return fallback;
  }
  const trimmed = rawNext.trim();
  if (!trimmed.startsWith('/')) {
    return fallback;
  }
  if (
    trimmed.startsWith('//') ||
    trimmed.startsWith('/\\') ||
    trimmed.includes('://') ||
    trimmed.includes('\\') ||
    /^[a-zA-Z][a-zA-Z0-9+.-]*:/i.test(trimmed)
  ) {
    return fallback;
  }
  return trimmed;
}

/**
 * Determines whether a user profile has genuinely completed Selplase onboarding.
 * Never returns true merely because a Google account exists or default location values were inserted.
 */
export function isProfileOnboardingComplete(
  profile: Partial<UserProfileRow> | null | undefined
): boolean {
  if (!profile) return false;
  if (profile.onboarding_completed !== true) return false;

  const nameOk =
    typeof profile.display_name === 'string' &&
    profile.display_name.trim().length >= 2;
  const whatsappOk =
    typeof profile.whatsapp_number === 'string' &&
    NIGERIAN_E164_REGEX.test(profile.whatsapp_number.trim());
  const stateOk =
    typeof profile.state === 'string' &&
    VALID_STATES_SET.has(profile.state.trim());
  const cityOk =
    typeof profile.city === 'string' && profile.city.trim().length >= 2;
  const roleOk = VALID_ROLES.includes(profile.account_role as AccountRole);

  return nameOk && whatsappOk && stateOk && cityOk && roleOk;
}

export interface OnboardingStepStatus {
  id: 'displayName' | 'whatsappNumber' | 'location' | 'accountRole';
  label: string;
  description: string;
  completed: boolean;
}

/**
 * Computes a step-by-step onboarding completion breakdown for the reusable
 * "Complete Your Profile" modal and account dashboard indicators.
 */
export function getOnboardingCompletionSummary(
  profile: Partial<UserProfileRow> | null | undefined
): {
  isComplete: boolean;
  completedCount: number;
  totalSteps: number;
  progressPercent: number;
  steps: OnboardingStepStatus[];
} {
  const nameCompleted =
    typeof profile?.display_name === 'string' &&
    profile.display_name.trim().length >= 2;

  const whatsappCompleted =
    typeof profile?.whatsapp_number === 'string' &&
    NIGERIAN_E164_REGEX.test(profile.whatsapp_number.trim());

  const locationCompleted =
    Boolean(profile?.onboarding_completed) &&
    typeof profile?.state === 'string' &&
    VALID_STATES_SET.has(profile.state.trim()) &&
    typeof profile?.city === 'string' &&
    profile.city.trim().length >= 2;

  const roleCompleted =
    Boolean(profile?.onboarding_completed) &&
    VALID_ROLES.includes(profile?.account_role as AccountRole);

  const steps: OnboardingStepStatus[] = [
    {
      id: 'displayName',
      label: 'Display Name or Store Name',
      description: nameCompleted
        ? `Saved as "${profile?.display_name?.trim()}"`
        : 'Confirm your buyer or seller display name',
      completed: nameCompleted,
    },
    {
      id: 'whatsappNumber',
      label: 'Nigerian WhatsApp Number (+234)',
      description: whatsappCompleted
        ? 'Normalised to +234 E.164 (kept private by default)'
        : 'Add your Nigerian WhatsApp contact for direct deals',
      completed: whatsappCompleted,
    },
    {
      id: 'location',
      label: 'Nigerian State & City / Town',
      description: locationCompleted
        ? `${profile?.city?.trim()}, ${profile?.state?.trim()}`
        : 'Select your Nigerian state and primary city/town',
      completed: locationCompleted,
    },
    {
      id: 'accountRole',
      label: 'Marketplace Account Type',
      description: roleCompleted
        ? `Configured as ${(profile?.account_role || 'both').toUpperCase()}`
        : 'Choose Buyer, Seller, or Both (Buyer & Seller)',
      completed: roleCompleted,
    },
  ];

  const completedCount = steps.filter((s) => s.completed).length;
  const totalSteps = steps.length;
  const isComplete = isProfileOnboardingComplete(profile);
  const progressPercent = isComplete
    ? 100
    : Math.round((completedCount / totalSteps) * 100);

  return {
    isComplete,
    completedCount,
    totalSteps,
    progressPercent,
    steps,
  };
}

/**
 * Validates first-time user onboarding inputs (server & client).
 * Requires Display Name, Nigerian WhatsApp number (+234), valid Nigerian State, City/Town, and Account Role.
 */
export function validateOnboardingInput(input: OnboardingFormInput): {
  valid: boolean;
  errors: Record<string, string>;
  normalizedWhatsapp: string | null;
  normalizedCalling: string | null;
} {
  const errors: Record<string, string> = {};

  if (!input.displayName || input.displayName.trim().length < 2) {
    errors.displayName =
      'Please enter your display name or business name (at least 2 characters).';
  }

  const whatsappResult = normalizeNigerianPhone(input.whatsappNumber);
  if (!input.whatsappNumber || !input.whatsappNumber.trim()) {
    errors.whatsappNumber =
      'Your WhatsApp phone number is compulsory for Selplase onboarding.';
  } else if (!whatsappResult.valid || !whatsappResult.normalized) {
    errors.whatsappNumber =
      whatsappResult.error || 'Please enter a valid Nigerian WhatsApp number.';
  }

  const callingResult = normalizeNigerianPhone(input.callingNumber);
  if (input.callingNumber && input.callingNumber.trim() && !callingResult.valid) {
    errors.callingNumber =
      callingResult.error || 'Invalid optional calling phone number.';
  }

  const trimmedState = (input.state || '').trim();
  if (!trimmedState || !VALID_STATES_SET.has(trimmedState)) {
    errors.state = 'Please select and confirm your Nigerian state.';
  }

  if (!input.city || input.city.trim().length < 2) {
    errors.city = 'Please enter your city or town (at least 2 characters).';
  }

  if (!VALID_ROLES.includes(input.accountRole)) {
    errors.accountRole =
      'Please select your account type (Buyer, Seller, or Both).';
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
    normalizedWhatsapp: whatsappResult.normalized,
    normalizedCalling: callingResult.normalized,
  };
}

export type ProfileFetchClassification =
  | 'found'
  | 'missing'
  | 'auth_expired'
  | 'permission_denied'
  | 'connection_error'
  | 'unexpected_error';

/**
 * Distinguishes between a genuinely missing profile row (`!error && data === null`)
 * versus database connection failures, permission errors, expired auth sessions,
 * or other unexpected query errors so the application NEVER overwrites an existing
 * complete profile with incomplete defaults when a query fails.
 */
export function classifyProfileFetchOutcome(params: {
  data: UserProfileRow | null | undefined;
  error: {
    code?: string;
    message?: string;
    details?: string;
    status?: number;
  } | null;
}): {
  status: ProfileFetchClassification;
  profile?: UserProfileRow;
  message?: string;
  shouldCreateMissingProfile: boolean;
  shouldClearAuth: boolean;
  shouldPreserveExistingState: boolean;
} {
  const { data, error } = params;

  if (!error) {
    if (data) {
      return {
        status: 'found',
        profile: data,
        shouldCreateMissingProfile: false,
        shouldClearAuth: false,
        shouldPreserveExistingState: false,
      };
    }
    return {
      status: 'missing',
      shouldCreateMissingProfile: true,
      shouldClearAuth: false,
      shouldPreserveExistingState: false,
    };
  }

  const code = String(error.code || '').toUpperCase();
  const msg = String(error.message || '').toLowerCase();
  const httpStatus = Number(error.status || 0);

  if (
    code === 'PGRST116' // single() row not found
  ) {
    return {
      status: 'missing',
      shouldCreateMissingProfile: true,
      shouldClearAuth: false,
      shouldPreserveExistingState: false,
    };
  }

  if (
    code === 'PGRST301' ||
    httpStatus === 401 ||
    msg.includes('jwt expired') ||
    msg.includes('invalid jwt') ||
    msg.includes('invalid token') ||
    msg.includes('refresh_token_not_found') ||
    msg.includes('session_not_found')
  ) {
    return {
      status: 'auth_expired',
      message:
        'Your authentication session has expired. Please sign in with Google again.',
      shouldCreateMissingProfile: false,
      shouldClearAuth: true,
      shouldPreserveExistingState: false,
    };
  }

  if (
    code === '42501' ||
    httpStatus === 403 ||
    msg.includes('permission denied') ||
    msg.includes('row-level security') ||
    msg.includes('insufficient_privilege')
  ) {
    return {
      status: 'permission_denied',
      message:
        error.message ||
        'Database permission error while accessing your profile.',
      shouldCreateMissingProfile: false,
      shouldClearAuth: false,
      shouldPreserveExistingState: true,
    };
  }

  if (
    httpStatus === 503 ||
    httpStatus === 504 ||
    code === '08006' ||
    code === '08001' ||
    msg.includes('failed to fetch') ||
    msg.includes('fetch failed') ||
    msg.includes('networkerror') ||
    msg.includes('network request failed') ||
    msg.includes('econnrefused') ||
    msg.includes('etimedout') ||
    msg.includes('connection')
  ) {
    return {
      status: 'connection_error',
      message:
        'Database connection error while loading your profile. Please retry shortly.',
      shouldCreateMissingProfile: false,
      shouldClearAuth: false,
      shouldPreserveExistingState: true,
    };
  }

  return {
    status: 'unexpected_error',
    message:
      error.message || 'Unexpected error while loading your Selplase profile.',
    shouldCreateMissingProfile: false,
    shouldClearAuth: false,
    shouldPreserveExistingState: true,
  };
}

/**
 * Builds a permission-compatible UPDATE payload for completing onboarding on an
 * existing `public.profiles` row:
 * - Includes ONLY columns granted in `GRANT UPDATE (...) ON public.profiles TO authenticated`.
 * - Never writes to `id`, `email`, `is_admin`, `verification_status`, or `created_at`.
 * - Preserves existing `show_whatsapp_publicly`, `show_calling_publicly`, and `avatar_url`.
 */
export function buildOnboardingProfileUpdate(params: {
  existingProfile?: Partial<UserProfileRow> | null;
  displayName: string;
  normalizedWhatsapp: string;
  normalizedCalling: string | null;
  state: string;
  city: string;
  accountRole: AccountRole;
  existingAvatarUrl?: string | null;
  googleAvatar?: string | null;
  googleAvatarUrl?: string | null;
  nowIso?: string;
}): {
  display_name: string;
  whatsapp_number: string;
  calling_number: string | null;
  state: string;
  city: string;
  account_role: AccountRole;
  avatar_url: string | null;
  onboarding_completed: true;
  onboarding_completed_at: string;
  updated_at: string;
} {
  const now = params.nowIso || new Date().toISOString();
  const existingProfile = params.existingProfile || {};

  const preservedAvatar =
    (typeof params.existingAvatarUrl === 'string' &&
      params.existingAvatarUrl.trim()) ||
    (typeof existingProfile.avatar_url === 'string' &&
      existingProfile.avatar_url.trim()) ||
    (typeof params.googleAvatarUrl === 'string' &&
      params.googleAvatarUrl.trim()) ||
    (typeof params.googleAvatar === 'string' && params.googleAvatar.trim()) ||
    null;

  const preservedCalling =
    params.normalizedCalling !== null
      ? params.normalizedCalling
      : existingProfile.calling_number ?? null;

  return {
    display_name: params.displayName.trim(),
    whatsapp_number: params.normalizedWhatsapp,
    calling_number: preservedCalling,
    state: params.state.trim(),
    city: params.city.trim(),
    account_role: params.accountRole,
    avatar_url: preservedAvatar,
    onboarding_completed: true,
    onboarding_completed_at: existingProfile.onboarding_completed_at || now,
    updated_at: now,
  };
}

/**
 * Builds a permission-compatible INSERT payload when a profile row is genuinely
 * missing in `public.profiles`. Never used with `.upsert()`.
 */
export function buildInitialMissingProfileInsert(params: {
  userId: string;
  email?: string | null;
  displayName?: string | null;
  avatarUrl?: string | null;
  userMetadata?: Record<string, unknown> | null;
}): {
  id: string;
  display_name: string;
  email: string;
  whatsapp_number: null;
  calling_number: null;
  state: string;
  city: string;
  account_role: AccountRole;
  avatar_url: string | null;
  show_whatsapp_publicly: false;
  show_calling_publicly: false;
  onboarding_completed: false;
  onboarding_completed_at: null;
} {
  const meta = params.userMetadata || {};
  const fallbackNameFromMeta =
    (typeof meta.display_name === 'string' && meta.display_name.trim()) ||
    (typeof meta.full_name === 'string' && meta.full_name.trim()) ||
    (typeof meta.name === 'string' && meta.name.trim()) ||
    (params.email || 'Selplase Member').split('@')[0];

  const rawName =
    typeof params.displayName === 'string' && params.displayName.trim()
      ? params.displayName.trim()
      : fallbackNameFromMeta.trim();

  const resolvedAvatar =
    (typeof params.avatarUrl === 'string' && params.avatarUrl.trim()) ||
    (typeof meta.avatar_url === 'string' && meta.avatar_url.trim()) ||
    (typeof meta.picture === 'string' && meta.picture.trim()) ||
    null;

  return {
    id: params.userId,
    display_name: rawName.length >= 2 ? rawName : 'Selplase Member',
    email: params.email || '',
    whatsapp_number: null,
    calling_number: null,
    state: '',
    city: '',
    account_role: 'both',
    avatar_url: resolvedAvatar,
    show_whatsapp_publicly: false,
    show_calling_publicly: false,
    onboarding_completed: false,
    onboarding_completed_at: null,
  };
}

/**
 * Validates registration input including password & password-confirmation matching
 * and Nigerian phone number normalisation.
 */
export function validateRegistrationInput(input: RegistrationFormInput): {
  valid: boolean;
  errors: Record<string, string>;
  normalizedWhatsapp: string | null;
  normalizedCalling: string | null;
} {
  const errors: Record<string, string> = {};

  if (!input.displayName || input.displayName.trim().length < 2) {
    errors.displayName =
      'Please enter your full name or business display name (at least 2 characters).';
  }

  if (!input.email || !EMAIL_REGEX.test(input.email.trim())) {
    errors.email = 'Please enter a valid email address.';
  }

  if (!input.password || input.password.length < 8) {
    errors.password = 'Password must be at least 8 characters long.';
  }

  if (input.password !== input.confirmPassword) {
    errors.confirmPassword = 'Passwords do not match.';
  }

  const whatsappResult = normalizeNigerianPhone(input.whatsappNumber);
  if (!input.whatsappNumber || !input.whatsappNumber.trim()) {
    errors.whatsappNumber = 'Please enter your WhatsApp contact number.';
  } else if (!whatsappResult.valid) {
    errors.whatsappNumber =
      whatsappResult.error || 'Invalid WhatsApp phone number.';
  }

  const callingResult = normalizeNigerianPhone(input.callingNumber);
  if (input.callingNumber && input.callingNumber.trim() && !callingResult.valid) {
    errors.callingNumber =
      callingResult.error || 'Invalid calling phone number.';
  }

  if (!input.state || !input.state.trim()) {
    errors.state = 'Please select your Nigerian state.';
  }

  if (!input.city || input.city.trim().length < 2) {
    errors.city = 'Please enter your city or town.';
  }

  if (!VALID_ROLES.includes(input.accountRole)) {
    errors.accountRole = 'Please choose a valid account role.';
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
    normalizedWhatsapp: whatsappResult.normalized,
    normalizedCalling: callingResult.normalized,
  };
}

/**
 * Enforces profile update security rules:
 * 1. Verifies that the authenticated user ID matches the target profile ID.
 * 2. Rejects any attempt to tamper with protected fields (`id`, `email`, `verification_status`, `is_admin`, `onboarding_completed`).
 * 3. Validates and normalises permitted fields.
 */
export function validateAndSanitizeProfileUpdate(params: {
  authenticatedUserId: string | null | undefined;
  targetProfileId: string;
  payload: Record<string, unknown>;
}): {
  ok: boolean;
  status: number;
  error?: string;
  sanitized?: PermittedProfileUpdateInput;
} {
  const { authenticatedUserId, targetProfileId, payload } = params;

  if (!authenticatedUserId) {
    return {
      ok: false,
      status: 401,
      error: 'Authentication required to update profile.',
    };
  }

  if (authenticatedUserId !== targetProfileId) {
    return {
      ok: false,
      status: 403,
      error: 'Forbidden: You can only modify your own user profile.',
    };
  }

  // Block any attempt to modify immutable or privileged columns directly
  const forbiddenFields = [
    'id',
    'email',
    'verification_status',
    'is_admin',
    'created_at',
    'onboarding_completed',
    'onboarding_completed_at',
  ];
  for (const field of forbiddenFields) {
    if (field in payload) {
      return {
        ok: false,
        status: 403,
        error: `Forbidden: Field "${field}" cannot be modified directly.`,
      };
    }
  }

  const sanitized: PermittedProfileUpdateInput = {};

  if (typeof payload.display_name === 'string') {
    const trimmed = payload.display_name.trim();
    if (trimmed.length < 2) {
      return {
        ok: false,
        status: 400,
        error: 'Display name must be at least 2 characters.',
      };
    }
    sanitized.display_name = trimmed;
  }

  if ('whatsapp_number' in payload) {
    const raw =
      typeof payload.whatsapp_number === 'string'
        ? payload.whatsapp_number
        : null;
    if (!raw || !raw.trim()) {
      return {
        ok: false,
        status: 400,
        error: 'WhatsApp phone number is required on your Selplase profile.',
      };
    }
    const res = normalizeNigerianPhone(raw);
    if (!res.valid || !res.normalized) {
      return { ok: false, status: 400, error: res.error };
    }
    sanitized.whatsapp_number = res.normalized;
  }

  if ('calling_number' in payload) {
    const raw =
      typeof payload.calling_number === 'string'
        ? payload.calling_number
        : null;
    const res = normalizeNigerianPhone(raw);
    if (!res.valid) {
      return { ok: false, status: 400, error: res.error };
    }
    sanitized.calling_number = res.normalized;
  }

  if (typeof payload.state === 'string' && payload.state.trim()) {
    sanitized.state = payload.state.trim();
  }

  if (typeof payload.city === 'string') {
    const trimmedCity = payload.city.trim();
    if (trimmedCity.length < 2) {
      return {
        ok: false,
        status: 400,
        error: 'City must be at least 2 characters.',
      };
    }
    sanitized.city = trimmedCity;
  }

  if (typeof payload.account_role === 'string') {
    if (!VALID_ROLES.includes(payload.account_role as AccountRole)) {
      return {
        ok: false,
        status: 400,
        error: 'Invalid account role.',
      };
    }
    sanitized.account_role = payload.account_role as AccountRole;
  }

  if ('avatar_url' in payload) {
    sanitized.avatar_url =
      typeof payload.avatar_url === 'string' && payload.avatar_url.trim()
        ? payload.avatar_url.trim()
        : null;
  }

  if (typeof payload.show_whatsapp_publicly === 'boolean') {
    sanitized.show_whatsapp_publicly = payload.show_whatsapp_publicly;
  }

  if (typeof payload.show_calling_publicly === 'boolean') {
    sanitized.show_calling_publicly = payload.show_calling_publicly;
  }

  return {
    ok: true,
    status: 200,
    sanitized,
  };
}

/**
 * Projects a full private profile row into an approved public seller profile.
 * Masks `email`, `is_admin`, and hides contact numbers unless the user explicitly enabled public visibility.
 */
export function toPublicSellerProfile(
  profile: UserProfileRow
): PublicSellerProfile {
  return {
    id: profile.id,
    display_name: profile.display_name,
    state: profile.state,
    city: profile.city,
    account_role: profile.account_role,
    avatar_url: profile.avatar_url,
    verification_status: profile.verification_status,
    public_whatsapp_number: profile.show_whatsapp_publicly
      ? profile.whatsapp_number
      : null,
    public_calling_number: profile.show_calling_publicly
      ? profile.calling_number
      : null,
    created_at: profile.created_at,
  };
}
