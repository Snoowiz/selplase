/**
 * Selplase — Stage 2–4 User Profile, Onboarding & Supabase Database Types
 */

export type AccountRole = 'buyer' | 'seller' | 'both';

export type VerificationStatus = 'unverified' | 'pending' | 'verified';

/**
 * Full private user profile row stored in `public.profiles`.
 * Only accessible to the authenticated owner (`auth.uid() = id`).
 */
export interface UserProfileRow {
  id: string;
  display_name: string;
  email: string;
  whatsapp_number: string | null;
  calling_number: string | null;
  state: string;
  city: string;
  account_role: AccountRole;
  avatar_url: string | null;
  show_whatsapp_publicly: boolean;
  show_calling_publicly: boolean;
  verification_status: VerificationStatus;
  is_admin: boolean;
  onboarding_completed?: boolean;
  onboarding_completed_at?: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Approved public seller profile projection.
 * Never exposes `email`, `is_admin`, or private contact numbers when visibility toggles are false.
 */
export interface PublicSellerProfile {
  id: string;
  display_name: string;
  state: string;
  city: string;
  account_role: AccountRole;
  avatar_url: string | null;
  verification_status: VerificationStatus;
  public_whatsapp_number: string | null;
  public_calling_number: string | null;
  created_at: string;
}

/**
 * Permitted fields an authenticated user may update on their own profile.
 * `id`, `email`, `verification_status`, `is_admin`, and `created_at` are strictly excluded.
 */
export interface PermittedProfileUpdateInput {
  display_name?: string;
  whatsapp_number?: string | null;
  calling_number?: string | null;
  state?: string;
  city?: string;
  account_role?: AccountRole;
  avatar_url?: string | null;
  show_whatsapp_publicly?: boolean;
  show_calling_publicly?: boolean;
  onboarding_completed?: boolean;
  onboarding_completed_at?: string | null;
}

export interface OnboardingFormInput {
  displayName: string;
  whatsappNumber: string;
  callingNumber?: string;
  state: string;
  city: string;
  accountRole: AccountRole;
}

export interface RegistrationFormInput {
  displayName: string;
  email: string;
  password: string;
  confirmPassword: string;
  whatsappNumber: string;
  callingNumber?: string;
  state: string;
  city: string;
  accountRole: AccountRole;
}
