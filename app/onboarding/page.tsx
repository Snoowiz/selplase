'use client';

import React, { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Globe,
  Loader2,
  Lock,
  MapPin,
  Phone,
  ShieldCheck,
  Store,
  UserCheck,
  Users,
} from 'lucide-react';
import { useMarketplace } from '@/context/MarketplaceContext';
import { NIGERIAN_STATES } from '@/lib/data/mock-marketplace';
import {
  sanitizeRedirectPath,
  validateOnboardingInput,
} from '@/lib/utils/profile-utils';
import type { AccountRole } from '@/lib/types/profile';

function OnboardingFormInner({ nextPath }: { nextPath: string }) {
  const router = useRouter();
  const {
    isSupabaseConfigured,
    authLoading,
    authUser,
    userProfile,
    isOnboardingComplete,
    refreshUserProfile,
    signInWithGoogle,
  } = useMarketplace();

  const [displayName, setDisplayName] = useState('');
  const [whatsappNumber, setWhatsappNumber] = useState('');
  const [callingNumber, setCallingNumber] = useState('');
  // Stage 4.1: Do not automatically treat "Lagos" as a user's confirmed location
  // unless they have previously completed onboarding or actively select it.
  const [state, setState] = useState('');
  const [city, setCity] = useState('');
  const [accountRole, setAccountRole] = useState<AccountRole>('both');

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [googleSigningIn, setGoogleSigningIn] = useState(false);

  // Pre-fill display name from Google metadata, and only pre-fill location
  // when the user has already confirmed and completed onboarding previously.
  useEffect(() => {
    const metadata = (authUser?.user_metadata || {}) as Record<string, unknown>;
    const googleName =
      typeof metadata.full_name === 'string' && metadata.full_name.trim()
        ? metadata.full_name.trim()
        : typeof metadata.name === 'string' && metadata.name.trim()
          ? metadata.name.trim()
          : '';

    queueMicrotask(() => {
      if (userProfile) {
        setDisplayName((prev) => prev || userProfile.display_name || googleName);
        setWhatsappNumber((prev) => prev || userProfile.whatsapp_number || '');
        setCallingNumber((prev) => prev || userProfile.calling_number || '');

        if (userProfile.onboarding_completed) {
          if (userProfile.state && NIGERIAN_STATES.includes(userProfile.state)) {
            setState((prev) => prev || userProfile.state);
          }
          setCity((prev) => prev || userProfile.city || '');
        }

        if (userProfile.account_role) {
          setAccountRole(userProfile.account_role);
        }
      } else if (googleName) {
        setDisplayName((prev) => prev || googleName);
      }
    });
  }, [authUser, userProfile]);

  // Redirect returning users who have already completed onboarding
  useEffect(() => {
    if (!authLoading && authUser && isOnboardingComplete) {
      router.replace(nextPath);
    }
  }, [authLoading, authUser, isOnboardingComplete, nextPath, router]);

  const handleGoogleSignIn = async () => {
    setFormError(null);
    setGoogleSigningIn(true);
    const result = await signInWithGoogle(nextPath);
    if (result.error) {
      setFormError(result.error);
      setGoogleSigningIn(false);
    }
  };

  const handleOnboardingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setFormSuccess(null);

    const validation = validateOnboardingInput({
      displayName,
      whatsappNumber,
      callingNumber,
      state,
      city,
      accountRole,
    });

    if (!validation.valid) {
      setFieldErrors(validation.errors);
      return;
    }

    setFieldErrors({});

    if (!authUser) {
      setFormError(
        `Onboarding details validated (WhatsApp normalised to ${validation.normalizedWhatsapp}, location confirmed as ${city.trim()}, ${state}). Please sign in with Google first to save your Selplase profile.`
      );
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch('/api/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          displayName: displayName.trim(),
          whatsappNumber: validation.normalizedWhatsapp,
          callingNumber: validation.normalizedCalling,
          state,
          city: city.trim(),
          accountRole,
        }),
      });

      const result = await response.json();
      if (!response.ok) {
        if (result.fieldErrors || result.details) {
          setFieldErrors(result.fieldErrors || result.details);
        }
        setFormError(
          result.error ||
            'Could not complete onboarding. Please check your details.'
        );
        setSubmitting(false);
        return;
      }

      await refreshUserProfile();
      setFormSuccess(
        'Your Selplase profile is complete! Redirecting to your destination...'
      );
      router.push(nextPath);
    } catch {
      setFormError('Network error while saving onboarding profile.');
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {/* Header */}
      <div className="mb-6">
        <p className="text-xs font-semibold text-blue-600 uppercase tracking-wider">
          Selplase Account Onboarding
        </p>
        <h1 className="text-3xl font-extrabold text-slate-950 font-display mt-1">
          Complete Your Selplase Profile
        </h1>
        <p className="text-sm text-slate-600 mt-1 leading-relaxed">
          Before publishing listings, posting buyer requests, or sending seller
          offers on Selplase, please confirm your display name, Nigerian WhatsApp
          contact, location, and account type.
        </p>
      </div>

      {/* Authentication Status Banner */}
      {!authLoading && !authUser && (
        <div className="mb-6 rounded-3xl bg-blue-50/90 border border-blue-200 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <p className="text-xs font-bold text-blue-950 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-blue-600" />
              Sign in with Google to link your profile
            </p>
            <p className="text-xs text-blue-900/80 leading-relaxed">
              {isSupabaseConfigured
                ? 'Continue with Google to pre-fill your name and save your onboarding profile to Supabase.'
                : 'Supabase environment variables are not configured in this preview environment yet, but you can test onboarding validation below.'}
            </p>
          </div>
          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={googleSigningIn}
            className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 disabled:opacity-60 text-white text-xs font-semibold flex items-center gap-2 shrink-0 cursor-pointer self-start sm:self-center"
          >
            {googleSigningIn ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Globe className="w-3.5 h-3.5 text-blue-400" />
            )}
            Continue with Google
          </button>
        </div>
      )}

      {/* Main Liquid-Glass Onboarding Card */}
      <div className="rounded-3xl bg-white/90 backdrop-blur-2xl border border-slate-200/80 shadow-[0_12px_40px_rgba(15,23,42,0.06)] p-6 sm:p-8 space-y-6">
        {formError && (
          <div className="rounded-2xl bg-rose-50 border border-rose-200 p-4 flex items-start gap-2.5 text-xs text-rose-800">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <span>{formError}</span>
          </div>
        )}

        {formSuccess && (
          <div className="rounded-2xl bg-emerald-50 border border-emerald-200 p-4 flex items-start gap-2.5 text-xs text-emerald-900">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <span>{formSuccess}</span>
          </div>
        )}

        {Object.keys(fieldErrors).length > 0 && (
          <div className="rounded-2xl bg-rose-50 border border-rose-200 p-4 text-xs text-rose-800 space-y-1">
            <p className="font-bold">Please complete all required fields:</p>
            {Object.values(fieldErrors).map((err, idx) => (
              <p key={idx}>• {err}</p>
            ))}
          </div>
        )}

        <form onSubmit={handleOnboardingSubmit} className="space-y-6" noValidate>
          {/* 1. Display Name */}
          <div>
            <label
              htmlFor="onboarding-display-name"
              className="block text-xs font-semibold text-slate-800 mb-1.5"
            >
              1. Display Name or Store Name *
            </label>
            <input
              id="onboarding-display-name"
              type="text"
              required
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="e.g. Chidinma Okafor or Chidinma Gadgets"
              className={`w-full px-4 py-2.5 rounded-xl bg-white border text-sm text-slate-900 focus:outline-none focus:border-blue-600 ${
                fieldErrors.displayName ? 'border-rose-400' : 'border-slate-200'
              }`}
            />
            {fieldErrors.displayName && (
              <p className="text-[11px] font-medium text-rose-600 mt-1">
                {fieldErrors.displayName}
              </p>
            )}
            <p className="text-[11px] text-slate-500 mt-1">
              Pre-filled from your Google account when available. You can edit
              this anytime.
            </p>
          </div>

          {/* 2. Nigerian WhatsApp Phone Number */}
          <div className="space-y-3 pt-2 border-t border-slate-100">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="onboarding-whatsapp"
                  className="block text-xs font-semibold text-slate-800 mb-1.5"
                >
                  2. WhatsApp Phone Number (Nigeria +234) *
                </label>
                <div
                  className={`flex items-center rounded-xl bg-white border focus-within:border-blue-600 overflow-hidden ${
                    fieldErrors.whatsappNumber
                      ? 'border-rose-400'
                      : 'border-slate-200'
                  }`}
                >
                  <span className="px-3 py-2.5 bg-slate-100 border-r border-slate-200 text-xs font-mono font-semibold text-slate-700 flex items-center gap-1 shrink-0">
                    <Phone className="w-3.5 h-3.5 text-emerald-600" />
                    NG +234
                  </span>
                  <input
                    id="onboarding-whatsapp"
                    type="tel"
                    required
                    value={whatsappNumber}
                    onChange={(e) => setWhatsappNumber(e.target.value)}
                    placeholder="0803 000 1122"
                    className="w-full px-3.5 py-2.5 text-sm font-mono text-slate-900 focus:outline-none"
                  />
                </div>
                {fieldErrors.whatsappNumber && (
                  <p className="text-[11px] font-medium text-rose-600 mt-1">
                    {fieldErrors.whatsappNumber}
                  </p>
                )}
              </div>

              <div>
                <label
                  htmlFor="onboarding-calling"
                  className="block text-xs font-semibold text-slate-800 mb-1.5"
                >
                  Separate Calling Number (Optional)
                </label>
                <input
                  id="onboarding-calling"
                  type="tel"
                  value={callingNumber}
                  onChange={(e) => setCallingNumber(e.target.value)}
                  placeholder="0809 000 2233"
                  className={`w-full px-3.5 py-2.5 rounded-xl bg-white border text-sm font-mono text-slate-900 focus:outline-none focus:border-blue-600 ${
                    fieldErrors.callingNumber
                      ? 'border-rose-400'
                      : 'border-slate-200'
                  }`}
                />
                {fieldErrors.callingNumber && (
                  <p className="text-[11px] font-medium text-rose-600 mt-1">
                    {fieldErrors.callingNumber}
                  </p>
                )}
              </div>
            </div>

            <div className="rounded-2xl bg-slate-50 border border-slate-200/80 p-3.5 flex items-start gap-2.5 text-xs text-slate-600">
              <Lock className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
              <div className="space-y-0.5">
                <p className="font-semibold text-slate-800">
                  Private by Default · Normalised to +234 E.164 Format
                </p>
                <p>
                  Your phone number is normalised to international format (e.g.{' '}
                  <code className="font-mono">+2348030001122</code>), kept{' '}
                  <strong>private by default</strong> on your public profile, and
                  marked <strong>unverified</strong> (SMS/WhatsApp OTP
                  verification is not yet enabled).
                </p>
              </div>
            </div>
          </div>

          {/* 3. Location (Nigerian State & City/Town) */}
          <div className="space-y-3 pt-2 border-t border-slate-100">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-800">
              <MapPin className="w-4 h-4 text-blue-600" />
              <span>3. Confirm Your Primary Location in Nigeria *</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="onboarding-state"
                  className="block text-xs font-medium text-slate-700 mb-1"
                >
                  Nigerian State *
                </label>
                <select
                  id="onboarding-state"
                  required
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                  className={`w-full px-3.5 py-2.5 rounded-xl bg-white border text-sm text-slate-900 focus:outline-none focus:border-blue-600 ${
                    fieldErrors.state ? 'border-rose-400' : 'border-slate-200'
                  }`}
                >
                  <option value="">Select your Nigerian State...</option>
                  {NIGERIAN_STATES.map((st) => (
                    <option key={st} value={st}>
                      {st}
                    </option>
                  ))}
                </select>
                {fieldErrors.state && (
                  <p className="text-[11px] font-medium text-rose-600 mt-1">
                    {fieldErrors.state}
                  </p>
                )}
              </div>

              <div>
                <label
                  htmlFor="onboarding-city"
                  className="block text-xs font-medium text-slate-700 mb-1"
                >
                  City / Town *
                </label>
                <input
                  id="onboarding-city"
                  type="text"
                  required
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="e.g. Lekki Phase 1, Ikeja, Wuse 2"
                  className={`w-full px-3.5 py-2.5 rounded-xl bg-white border text-sm text-slate-900 focus:outline-none focus:border-blue-600 ${
                    fieldErrors.city ? 'border-rose-400' : 'border-slate-200'
                  }`}
                />
                {fieldErrors.city && (
                  <p className="text-[11px] font-medium text-rose-600 mt-1">
                    {fieldErrors.city}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* 4. Account Type */}
          <div className="space-y-3 pt-2 border-t border-slate-100">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-semibold text-slate-800">
                4. How will you use Selplase? *
              </label>
              <span className="text-[11px] text-slate-500">
                Changeable anytime in Account Settings
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {(
                [
                  {
                    value: 'both',
                    title: 'Both (Buyer & Seller)',
                    subtitle: 'Buy items, post requests & sell products',
                    icon: Users,
                  },
                  {
                    value: 'buyer',
                    title: 'Buyer Only',
                    subtitle: 'Browse deals & post buyer requests',
                    icon: UserCheck,
                  },
                  {
                    value: 'seller',
                    title: 'Seller / Service Pro',
                    subtitle: 'List products, services & respond to buyers',
                    icon: Store,
                  },
                ] as const
              ).map((option) => {
                const Icon = option.icon;
                const selected = accountRole === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setAccountRole(option.value)}
                    className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                      selected
                        ? 'bg-blue-50/90 border-blue-600 ring-2 ring-blue-600/15'
                        : 'bg-white border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <Icon
                        className={`w-4 h-4 ${
                          selected ? 'text-blue-600' : 'text-slate-500'
                        }`}
                      />
                      {selected && (
                        <span className="text-[10px] font-bold text-blue-700 uppercase">
                          Selected
                        </span>
                      )}
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-900">
                        {option.title}
                      </p>
                      <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                        {option.subtitle}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <Link
              href="/explore"
              className="text-xs font-semibold text-slate-500 hover:text-slate-800"
            >
              Skip for now &amp; browse public listings
            </Link>

            <button
              type="submit"
              disabled={submitting}
              className="px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-sm font-semibold shadow-[0_8px_24px_rgba(37,99,235,0.25)] flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
              <span>Complete Onboarding &amp; Continue</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function OnboardingPageContent() {
  const searchParams = useSearchParams();
  const nextPath = sanitizeRedirectPath(
    searchParams.get('next'),
    '/account?tab=dashboard'
  );
  return <OnboardingFormInner nextPath={nextPath} />;
}

export default function OnboardingPage() {
  return (
    <Suspense
      fallback={
        <div className="max-w-2xl mx-auto px-4 sm:px-6 py-12">
          <div className="h-10 w-64 rounded-xl bg-slate-200/70 animate-pulse mb-6" />
          <div className="h-96 w-full rounded-3xl bg-white/80 animate-pulse" />
        </div>
      }
    >
      <OnboardingPageContent />
    </Suspense>
  );
}
