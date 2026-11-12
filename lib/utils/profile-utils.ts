import type {
  AccountRole,
  OnboardingFormInput,
  PermittedProfileUpdateInput,
  PublicSellerProfile,
  RegistrationFormInput,
  UserProfileRow,
} from '../types/profile';

const NIGERIAN_E164_REGEX = /^\+234[789][01][0-9]{8}$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const VALID_ROLES: AccountRole[] = ['buyer', 'seller', 'both'];

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
    typeof profile.state === 'string' && profile.state.trim().length >= 2;
  const cityOk =
    typeof profile.city === 'string' && profile.city.trim().length >= 2;
  const roleOk = VALID_ROLES.includes(profile.account_role as AccountRole);

  return nameOk && whatsappOk && stateOk && cityOk && roleOk;
}

/**
 * Validates first-time user onboarding inputs (server & client).
 * Requires Display Name, Nigerian WhatsApp number (+234), Nigerian State, City/Town, and Account Role.
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

  if (!input.state || input.state.trim().length < 2) {
    errors.state = 'Please select your Nigerian state.';
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
