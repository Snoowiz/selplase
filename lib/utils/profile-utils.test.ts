import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildInitialMissingProfileInsert,
  buildOnboardingProfileUpdate,
  classifyProfileFetchOutcome,
  getOnboardingCompletionSummary,
  isProfileOnboardingComplete,
  normalizeNigerianPhone,
  sanitizeRedirectPath,
  toPublicSellerProfile,
  validateAndSanitizeProfileUpdate,
  validateOnboardingInput,
  validateRegistrationInput,
} from './profile-utils';
import type { UserProfileRow } from '../types/profile';

test('getOnboardingCompletionSummary calculates step-by-step progress for incomplete and complete profiles', () => {
  const emptySummary = getOnboardingCompletionSummary(null);
  assert.equal(emptySummary.isComplete, false);
  assert.equal(emptySummary.completedCount, 0);
  assert.equal(emptySummary.totalSteps, 4);
  assert.equal(emptySummary.progressPercent, 0);

  const partialGoogleSummary = getOnboardingCompletionSummary({
    display_name: 'Chidinma Okafor',
    whatsapp_number: null,
    state: '',
    city: '',
    account_role: 'both',
    onboarding_completed: false,
  });
  assert.equal(partialGoogleSummary.isComplete, false);
  assert.equal(partialGoogleSummary.completedCount, 1);
  assert.equal(partialGoogleSummary.progressPercent, 25);
  assert.equal(partialGoogleSummary.steps[0].completed, true);
  assert.equal(partialGoogleSummary.steps[1].completed, false);

  const completeSummary = getOnboardingCompletionSummary({
    display_name: 'Chidinma Okafor',
    whatsapp_number: '+2348031234567',
    state: 'Lagos',
    city: 'Lekki Phase 1',
    account_role: 'both',
    onboarding_completed: true,
  });
  assert.equal(completeSummary.isComplete, true);
  assert.equal(completeSummary.completedCount, 4);
  assert.equal(completeSummary.progressPercent, 100);
});

test('normalizeNigerianPhone converts local 080/081/090/070 numbers to +234 E.164 format', () => {
  const local = normalizeNigerianPhone('0803 000 1122');
  assert.equal(local.valid, true);
  assert.equal(local.normalized, '+2348030001122');

  const intlNoPlus = normalizeNigerianPhone('2348090002233');
  assert.equal(intlNoPlus.valid, true);
  assert.equal(intlNoPlus.normalized, '+2348090002233');

  const alreadyE164 = normalizeNigerianPhone('+2348120003344');
  assert.equal(alreadyE164.valid, true);
  assert.equal(alreadyE164.normalized, '+2348120003344');

  const invalid = normalizeNigerianPhone('12345');
  assert.equal(invalid.valid, false);
  assert.equal(invalid.normalized, null);
});

test('validateRegistrationInput checks password match and normalises Nigerian phones', () => {
  const mismatch = validateRegistrationInput({
    displayName: 'Chidinma Okafor',
    email: 'chidinma@example.com',
    password: 'Password123!',
    confirmPassword: 'DifferentPassword123!',
    whatsappNumber: '08030001122',
    state: 'Lagos',
    city: 'Lekki',
    accountRole: 'both',
  });
  assert.equal(mismatch.valid, false);
  assert.ok(mismatch.errors.confirmPassword);

  const valid = validateRegistrationInput({
    displayName: 'Chidinma Okafor',
    email: 'chidinma@example.com',
    password: 'Password123!',
    confirmPassword: 'Password123!',
    whatsappNumber: '0803 000 1122',
    callingNumber: '0809 000 2233',
    state: 'Lagos',
    city: 'Lekki Phase 1',
    accountRole: 'seller',
  });
  assert.equal(valid.valid, true);
  assert.equal(valid.normalizedWhatsapp, '+2348030001122');
  assert.equal(valid.normalizedCalling, '+2348090002233');
});

test('validateOnboardingInput enforces compulsory WhatsApp number, confirmed Nigerian state, city, display name, and role', () => {
  const missingWhatsapp = validateOnboardingInput({
    displayName: 'Adebayo Ogunlesi',
    whatsappNumber: '',
    state: 'Lagos',
    city: 'Ikeja',
    accountRole: 'both',
  });
  assert.equal(missingWhatsapp.valid, false);
  assert.ok(missingWhatsapp.errors.whatsappNumber);

  // Stage 4.1 Task 5: Empty or unconfirmed state must be rejected
  const unconfirmedState = validateOnboardingInput({
    displayName: 'Adebayo Ogunlesi',
    whatsappNumber: '0803 123 4567',
    state: '',
    city: 'Ikeja',
    accountRole: 'both',
  });
  assert.equal(unconfirmedState.valid, false);
  assert.ok(unconfirmedState.errors.state);

  const validOnboarding = validateOnboardingInput({
    displayName: 'Adebayo Ogunlesi',
    whatsappNumber: '0803 123 4567',
    state: 'Lagos',
    city: 'Ikeja',
    accountRole: 'seller',
  });
  assert.equal(validOnboarding.valid, true);
  assert.equal(validOnboarding.normalizedWhatsapp, '+2348031234567');
});

test('isProfileOnboardingComplete rejects default Google-created rows without whatsapp_number, valid state, or onboarding_completed', () => {
  assert.equal(
    isProfileOnboardingComplete({
      display_name: 'Google User',
      state: '',
      city: '',
      account_role: 'both',
      whatsapp_number: null,
      onboarding_completed: false,
    }),
    false
  );

  // Even if onboarding_completed were true on a malformed object without whatsapp_number, reject it
  assert.equal(
    isProfileOnboardingComplete({
      display_name: 'Google User',
      state: 'Lagos',
      city: 'Lagos',
      account_role: 'both',
      whatsapp_number: null,
      onboarding_completed: true,
    }),
    false
  );

  assert.equal(
    isProfileOnboardingComplete({
      display_name: 'Chidinma Okafor',
      state: 'Lagos',
      city: 'Lekki Phase 1',
      account_role: 'both',
      whatsapp_number: '+2348031234567',
      onboarding_completed: true,
    }),
    true
  );
});

test('buildOnboardingProfileUpdate excludes protected columns and preserves contact visibility settings', () => {
  const payload = buildOnboardingProfileUpdate({
    displayName: 'Chidinma Okafor',
    normalizedWhatsapp: '+2348031234567',
    normalizedCalling: '+2348091234567',
    state: 'Abuja (FCT)',
    city: 'Wuse 2',
    accountRole: 'seller',
    existingAvatarUrl: 'https://example.com/existing-avatar.png',
    googleAvatarUrl: 'https://example.com/google-avatar.png',
    nowIso: '2026-11-12T10:00:00Z',
  });

  // Must NEVER include protected columns or overwrite contact visibility flags
  assert.equal('id' in payload, false);
  assert.equal('email' in payload, false);
  assert.equal('is_admin' in payload, false);
  assert.equal('verification_status' in payload, false);
  assert.equal('created_at' in payload, false);
  assert.equal('show_whatsapp_publicly' in payload, false);
  assert.equal('show_calling_publicly' in payload, false);

  // Must include only permitted onboarding columns
  assert.equal(payload.display_name, 'Chidinma Okafor');
  assert.equal(payload.whatsapp_number, '+2348031234567');
  assert.equal(payload.calling_number, '+2348091234567');
  assert.equal(payload.state, 'Abuja (FCT)');
  assert.equal(payload.city, 'Wuse 2');
  assert.equal(payload.account_role, 'seller');
  assert.equal(payload.avatar_url, 'https://example.com/existing-avatar.png');
  assert.equal(payload.onboarding_completed, true);
  assert.equal(payload.onboarding_completed_at, '2026-11-12T10:00:00Z');
});

test('buildInitialMissingProfileInsert creates a safe unconfirmed profile without Lagos placeholder', () => {
  const row = buildInitialMissingProfileInsert({
    userId: 'user-123',
    email: 'adebayo@example.com',
    userMetadata: { full_name: 'Adebayo Ogunlesi' },
  });

  assert.equal(row.id, 'user-123');
  assert.equal(row.display_name, 'Adebayo Ogunlesi');
  assert.equal(row.email, 'adebayo@example.com');
  assert.equal(row.state, '');
  assert.equal(row.city, '');
  assert.equal(row.onboarding_completed, false);
  assert.equal(row.show_whatsapp_publicly, false);
  assert.equal(row.show_calling_publicly, false);
  assert.equal('is_admin' in row, false);
  assert.equal('verification_status' in row, false);
});

test('classifyProfileFetchOutcome distinguishes missing profiles from permission, auth, and connection errors', () => {
  const missingOutcome = classifyProfileFetchOutcome({
    data: null,
    error: null,
  });
  assert.equal(missingOutcome.status, 'missing');

  const permissionOutcome = classifyProfileFetchOutcome({
    data: null,
    error: { code: '42501', message: 'permission denied for table profiles' },
  });
  assert.equal(permissionOutcome.status, 'permission_denied');

  const authOutcome = classifyProfileFetchOutcome({
    data: null,
    error: { code: 'PGRST301', message: 'JWT expired' },
  });
  assert.equal(authOutcome.status, 'auth_expired');

  const networkOutcome = classifyProfileFetchOutcome({
    data: null,
    error: { message: 'TypeError: fetch failed' },
  });
  assert.equal(networkOutcome.status, 'connection_error');
});

test('sanitizeRedirectPath blocks external URLs, protocol-relative URLs, and javascript: schemes', () => {
  assert.equal(
    sanitizeRedirectPath('https://evil.example.com/phish'),
    '/account?tab=dashboard'
  );
  assert.equal(
    sanitizeRedirectPath('//evil.example.com/phish'),
    '/account?tab=dashboard'
  );
  assert.equal(
    sanitizeRedirectPath('/\\evil.example.com'),
    '/account?tab=dashboard'
  );
  assert.equal(
    sanitizeRedirectPath('javascript:alert(1)'),
    '/account?tab=dashboard'
  );
  assert.equal(sanitizeRedirectPath('/sell'), '/sell');
  assert.equal(sanitizeRedirectPath('/requests/new'), '/requests/new');
});

test('validateAndSanitizeProfileUpdate blocks editing another user profile or escalating privileges', () => {
  const crossUserAttempt = validateAndSanitizeProfileUpdate({
    authenticatedUserId: 'user-111',
    targetProfileId: 'user-222',
    payload: { display_name: 'Hacked Name' },
  });
  assert.equal(crossUserAttempt.ok, false);
  assert.equal(crossUserAttempt.status, 403);

  const adminEscalationAttempt = validateAndSanitizeProfileUpdate({
    authenticatedUserId: 'user-111',
    targetProfileId: 'user-111',
    payload: { display_name: 'Valid Name', is_admin: true },
  });
  assert.equal(adminEscalationAttempt.ok, false);
  assert.equal(adminEscalationAttempt.status, 403);

  const verificationEscalationAttempt = validateAndSanitizeProfileUpdate({
    authenticatedUserId: 'user-111',
    targetProfileId: 'user-111',
    payload: { verification_status: 'verified' },
  });
  assert.equal(verificationEscalationAttempt.ok, false);
  assert.equal(verificationEscalationAttempt.status, 403);

  const clientOnboardingBypassAttempt = validateAndSanitizeProfileUpdate({
    authenticatedUserId: 'user-111',
    targetProfileId: 'user-111',
    payload: { onboarding_completed: true },
  });
  assert.equal(clientOnboardingBypassAttempt.ok, false);
  assert.equal(clientOnboardingBypassAttempt.status, 403);

  const validUpdate = validateAndSanitizeProfileUpdate({
    authenticatedUserId: 'user-111',
    targetProfileId: 'user-111',
    payload: {
      display_name: 'Chidinma Ventures',
      whatsapp_number: '0803 000 1122',
      show_whatsapp_publicly: true,
    },
  });
  assert.equal(validUpdate.ok, true);
  assert.equal(validUpdate.status, 200);
  assert.equal(validUpdate.sanitized?.whatsapp_number, '+2348030001122');
  assert.equal(validUpdate.sanitized?.show_whatsapp_publicly, true);
});

test('toPublicSellerProfile hides email and private numbers by default', () => {
  const fullProfile: UserProfileRow = {
    id: 'user-111',
    display_name: 'Chidinma Okafor',
    email: 'private-email@example.com',
    whatsapp_number: '+2348030001122',
    calling_number: '+2348090002233',
    state: 'Lagos',
    city: 'Lekki',
    account_role: 'seller',
    avatar_url: null,
    show_whatsapp_publicly: false,
    show_calling_publicly: false,
    verification_status: 'unverified',
    is_admin: false,
    onboarding_completed: true,
    onboarding_completed_at: '2026-11-12T00:00:00Z',
    created_at: '2026-11-12T00:00:00Z',
    updated_at: '2026-11-12T00:00:00Z',
  };

  const publicDefault = toPublicSellerProfile(fullProfile);
  assert.equal('email' in publicDefault, false);
  assert.equal('is_admin' in publicDefault, false);
  assert.equal(publicDefault.public_whatsapp_number, null);
  assert.equal(publicDefault.public_calling_number, null);
  assert.equal(publicDefault.verification_status, 'unverified');

  const publicOptIn = toPublicSellerProfile({
    ...fullProfile,
    show_whatsapp_publicly: true,
  });
  assert.equal(publicOptIn.public_whatsapp_number, '+2348030001122');
  assert.equal(publicOptIn.public_calling_number, null);
});
