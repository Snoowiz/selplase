import test from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizeNigerianPhone,
  validateRegistrationInput,
  validateAndSanitizeProfileUpdate,
  toPublicSellerProfile,
} from './profile-utils';
import type { UserProfileRow } from '../types/profile';

test('normalizeNigerianPhone converts local 080/081/090/070 numbers to +234 E.164 format', () => {
  const r1 = normalizeNigerianPhone('0803 000 1122');
  assert.equal(r1.valid, true);
  assert.equal(r1.normalized, '+2348030001122');

  const r2 = normalizeNigerianPhone('2349012345678');
  assert.equal(r2.valid, true);
  assert.equal(r2.normalized, '+2349012345678');

  const r3 = normalizeNigerianPhone('+234-812-000-3344');
  assert.equal(r3.valid, true);
  assert.equal(r3.normalized, '+2348120003344');

  const empty = normalizeNigerianPhone('');
  assert.equal(empty.valid, true);
  assert.equal(empty.normalized, null);

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
    whatsappNumber: '08031234567',
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
    whatsappNumber: '0803 123 4567',
    callingNumber: '0902 111 2222',
    state: 'Lagos',
    city: 'Lekki',
    accountRole: 'seller',
  });
  assert.equal(valid.valid, true);
  assert.equal(valid.normalizedWhatsapp, '+2348031234567');
  assert.equal(valid.normalizedCalling, '+2349021112222');
});

test('validateAndSanitizeProfileUpdate blocks editing another user profile or escalating privileges', () => {
  // 1. Unauthenticated request blocked with 401
  const unauth = validateAndSanitizeProfileUpdate({
    authenticatedUserId: null,
    targetProfileId: 'user-1',
    payload: { display_name: 'Hacker' },
  });
  assert.equal(unauth.ok, false);
  assert.equal(unauth.status, 401);

  // 2. Editing another user's profile blocked with 403
  const crossUser = validateAndSanitizeProfileUpdate({
    authenticatedUserId: 'user-1',
    targetProfileId: 'user-2',
    payload: { display_name: 'Unauthorized Edit' },
  });
  assert.equal(crossUser.ok, false);
  assert.equal(crossUser.status, 403);

  // 3. Attempting to self-verify or self-assign admin blocked with 403
  const selfVerify = validateAndSanitizeProfileUpdate({
    authenticatedUserId: 'user-1',
    targetProfileId: 'user-1',
    payload: { verification_status: 'verified' },
  });
  assert.equal(selfVerify.ok, false);
  assert.equal(selfVerify.status, 403);

  const selfAdmin = validateAndSanitizeProfileUpdate({
    authenticatedUserId: 'user-1',
    targetProfileId: 'user-1',
    payload: { is_admin: true },
  });
  assert.equal(selfAdmin.ok, false);
  assert.equal(selfAdmin.status, 403);

  // 4. Valid owner edit succeeds and normalizes phone numbers
  const validEdit = validateAndSanitizeProfileUpdate({
    authenticatedUserId: 'user-1',
    targetProfileId: 'user-1',
    payload: {
      display_name: 'Updated Name',
      whatsapp_number: '08051112233',
      show_whatsapp_publicly: true,
    },
  });
  assert.equal(validEdit.ok, true);
  assert.equal(validEdit.status, 200);
  assert.equal(validEdit.sanitized?.whatsapp_number, '+2348051112233');
  assert.equal(validEdit.sanitized?.show_whatsapp_publicly, true);
});

test('toPublicSellerProfile hides email and private numbers by default', () => {
  const sampleRow: UserProfileRow = {
    id: 'user-123',
    display_name: 'Kemi Adeyemi',
    email: 'kemi.private@example.com',
    whatsapp_number: '+2348031112222',
    calling_number: '+2348093334444',
    state: 'Lagos',
    city: 'Ikeja',
    account_role: 'seller',
    avatar_url: null,
    show_whatsapp_publicly: false,
    show_calling_publicly: false,
    verification_status: 'unverified',
    is_admin: false,
    created_at: '2026-11-12T00:00:00Z',
    updated_at: '2026-11-12T00:00:00Z',
  };

  const hiddenProjection = toPublicSellerProfile(sampleRow);
  assert.equal(hiddenProjection.public_whatsapp_number, null);
  assert.equal(hiddenProjection.public_calling_number, null);
  assert.equal('email' in hiddenProjection, false);
  assert.equal('is_admin' in hiddenProjection, false);

  const optedInProjection = toPublicSellerProfile({
    ...sampleRow,
    show_whatsapp_publicly: true,
  });
  assert.equal(optedInProjection.public_whatsapp_number, '+2348031112222');
  assert.equal(optedInProjection.public_calling_number, null);
});
