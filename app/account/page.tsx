'use client';

import React, { Suspense, useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  AlertCircle,
  CheckCircle2,
  Database,
  Eye,
  EyeOff,
  Heart,
  Info,
  KeyRound,
  LayoutDashboard,
  Loader2,
  Lock,
  LogOut,
  Mail,
  MapPin,
  MessageCircle,
  MessageSquare,
  Phone,
  ShieldCheck,
  Store,
  UserCheck,
  UserCog,
  UserPlus,
} from 'lucide-react';
import { useMarketplace } from '@/context/MarketplaceContext';
import { DEMO_SELLERS, NIGERIAN_STATES } from '@/lib/data/mock-marketplace';
import { buildTelCallUrl, formatNaira } from '@/lib/utils/formatters';
import {
  normalizeNigerianPhone,
  toPublicSellerProfile,
  validateRegistrationInput,
} from '@/lib/utils/profile-utils';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import type { AccountRole } from '@/lib/types/profile';
import { ListingCard } from '@/components/marketplace/ListingCard';

type AccountScreenTab =
  | 'dashboard'
  | 'seller-profile'
  | 'login'
  | 'register'
  | 'forgot-password'
  | 'reset-password';

const ALL_DEMO_SELLERS = Object.values(DEMO_SELLERS);

function AccountInterfaceInner({
  initialTab,
  initialSellerId,
  confirmedFlag,
  errorFlag,
}: {
  initialTab: AccountScreenTab;
  initialSellerId: string;
  confirmedFlag: boolean;
  errorFlag: string | null;
}) {
  const {
    isSupabaseConfigured,
    authLoading,
    authUser,
    userProfile,
    isOnboardingComplete,
    refreshUserProfile,
    signInWithGoogle,
    signOutUser,
    listings,
    buyerRequests,
    savedListingIds,
    sellerOffers,
    platformMessages,
    openContactModal,
  } = useMarketplace();

  const [activeTab, setActiveTab] = useState<AccountScreenTab>(initialTab);
  const [selectedSellerId, setSelectedSellerId] = useState<string>(
    initialSellerId || DEMO_SELLERS.adebayoTech.id
  );

  // Auth Status & Error/Success Messages
  const [authSubmitting, setAuthSubmitting] = useState(false);
  const [googleSubmitting, setGoogleSubmitting] = useState(false);
  const [authError, setAuthError] = useState<string | null>(
    errorFlag === 'confirmation_failed'
      ? 'Email confirmation or recovery link expired or was invalid. Please request a new link.'
      : errorFlag === 'oauth_callback_failed' ||
          errorFlag === 'missing_oauth_code'
        ? 'Google sign-in could not be completed or was cancelled. Please try again.'
        : errorFlag === 'supabase_unconfigured'
          ? 'Supabase environment variables are not configured yet.'
          : null
  );
  const [authSuccess, setAuthSuccess] = useState<string | null>(
    confirmedFlag
      ? 'Your session is active and verified.'
      : null
  );

  // Login Form State
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Registration Form State
  const [regDisplayName, setRegDisplayName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');
  const [regWhatsapp, setRegWhatsapp] = useState('');
  const [regCalling, setRegCalling] = useState('');
  const [regState, setRegState] = useState('Lagos');
  const [regCity, setRegCity] = useState('Lekki Phase 1');
  const [regRole, setRegRole] = useState<AccountRole>('both');
  const [regFieldErrors, setRegFieldErrors] = useState<Record<string, string>>(
    {}
  );

  // Forgot & Reset Password State
  const [forgotEmail, setForgotEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');

  // Authenticated User Profile Edit State
  const [editDisplayName, setEditDisplayName] = useState('');
  const [editWhatsapp, setEditWhatsapp] = useState('');
  const [editCalling, setEditCalling] = useState('');
  const [editState, setEditState] = useState('Lagos');
  const [editCity, setEditCity] = useState('Lagos');
  const [editRole, setEditRole] = useState<AccountRole>('both');
  const [editAvatarUrl, setEditAvatarUrl] = useState('');
  const [editShowWhatsapp, setEditShowWhatsapp] = useState(false);
  const [editShowCalling, setEditShowCalling] = useState(false);
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileFeedback, setProfileFeedback] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  // Sync profile editor fields when `userProfile` loads
  useEffect(() => {
    if (!userProfile) return;
    queueMicrotask(() => {
      setEditDisplayName(userProfile.display_name || '');
      setEditWhatsapp(userProfile.whatsapp_number || '');
      setEditCalling(userProfile.calling_number || '');
      setEditState(userProfile.state || 'Lagos');
      setEditCity(userProfile.city || 'Lagos');
      setEditRole(userProfile.account_role || 'both');
      setEditAvatarUrl(userProfile.avatar_url || '');
      setEditShowWhatsapp(Boolean(userProfile.show_whatsapp_publicly));
      setEditShowCalling(Boolean(userProfile.show_calling_publicly));
    });
  }, [userProfile]);

  const demoSeller =
    ALL_DEMO_SELLERS.find((s) => s.id === selectedSellerId) ||
    DEMO_SELLERS.adebayoTech;

  const savedListings = listings.filter((l) => savedListingIds.includes(l.id));
  const sellerListings = listings.filter((l) => l.seller.id === demoSeller.id);
  const displayedSellerListings =
    sellerListings.length > 0 ? sellerListings : listings.slice(0, 4);

  // ---------------------------------------------------------------------------
  // AUTHENTICATION HANDLERS
  // ---------------------------------------------------------------------------

  const handleGoogleSignIn = async () => {
    setAuthError(null);
    setAuthSuccess(null);
    setGoogleSubmitting(true);
    const result = await signInWithGoogle('/account?tab=dashboard');
    if (result.error) {
      setAuthError(result.error);
      setGoogleSubmitting(false);
    }
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setAuthSuccess(null);

    const supabase = createSupabaseBrowserClient();
    if (!supabase) {
      setAuthError(
        'Supabase is not yet connected. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY in .env.local to sign in.'
      );
      return;
    }

    setAuthSubmitting(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: loginEmail.trim(),
      password: loginPassword,
    });
    setAuthSubmitting(false);

    if (error) {
      setAuthError(error.message);
      return;
    }

    await refreshUserProfile();
    setLoginPassword('');
    setAuthSuccess('Signed in successfully.');
    setActiveTab('dashboard');
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setAuthSuccess(null);

    const validation = validateRegistrationInput({
      displayName: regDisplayName,
      email: regEmail,
      password: regPassword,
      confirmPassword: regConfirmPassword,
      whatsappNumber: regWhatsapp,
      callingNumber: regCalling,
      state: regState,
      city: regCity,
      accountRole: regRole,
    });

    if (!validation.valid) {
      setRegFieldErrors(validation.errors);
      return;
    }
    setRegFieldErrors({});

    const supabase = createSupabaseBrowserClient();
    if (!supabase) {
      setAuthError(
        'Form validated (Nigerian phone normalised to ' +
          (validation.normalizedWhatsapp || '') +
          '). However, Supabase is not connected yet — configure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY to create live accounts.'
      );
      return;
    }

    setAuthSubmitting(true);
    const origin =
      typeof window !== 'undefined' ? window.location.origin : '';

    const { data, error } = await supabase.auth.signUp({
      email: regEmail.trim(),
      password: regPassword,
      options: {
        emailRedirectTo: `${origin}/auth/confirm`,
        data: {
          display_name: regDisplayName.trim(),
          whatsapp_number: validation.normalizedWhatsapp,
          calling_number: validation.normalizedCalling,
          state: regState,
          city: regCity.trim(),
          account_role: regRole,
        },
      },
    });
    setAuthSubmitting(false);

    if (error) {
      setAuthError(error.message);
      return;
    }

    setRegPassword('');
    setRegConfirmPassword('');

    if (data.session) {
      await refreshUserProfile();
      setAuthSuccess(
        'Account created and signed in! Your profile has been initialised with unverified status and private contact settings.'
      );
      setActiveTab('dashboard');
    } else {
      setAuthSuccess(
        `Registration submitted for ${regEmail.trim()}. Please check your email inbox and click the confirmation link to activate your session.`
      );
    }
  };

  const handleForgotPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setAuthSuccess(null);

    if (!forgotEmail.trim()) {
      setAuthError('Please enter the email address for your account.');
      return;
    }

    const supabase = createSupabaseBrowserClient();
    if (!supabase) {
      setAuthError(
        'Supabase is not yet connected. Configure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY to send password recovery emails.'
      );
      return;
    }

    setAuthSubmitting(true);
    const origin =
      typeof window !== 'undefined' ? window.location.origin : '';
    const { error } = await supabase.auth.resetPasswordForEmail(
      forgotEmail.trim(),
      {
        redirectTo: `${origin}/auth/confirm?type=recovery&next=/account?tab=reset-password`,
      }
    );
    setAuthSubmitting(false);

    if (error) {
      setAuthError(error.message);
      return;
    }

    setAuthSuccess(
      `If an account exists for ${forgotEmail.trim()}, a password reset link has been sent.`
    );
  };

  const handleResetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setAuthSuccess(null);

    if (newPassword.length < 8) {
      setAuthError('New password must be at least 8 characters long.');
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setAuthError('New password and confirmation do not match.');
      return;
    }

    const supabase = createSupabaseBrowserClient();
    if (!supabase) {
      setAuthError('Supabase is not yet connected.');
      return;
    }

    setAuthSubmitting(true);
    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });
    setAuthSubmitting(false);

    if (error) {
      setAuthError(error.message);
      return;
    }

    setNewPassword('');
    setConfirmNewPassword('');
    setAuthSuccess('Your password has been updated successfully.');
    setActiveTab('dashboard');
  };

  // ---------------------------------------------------------------------------
  // AUTHENTICATED PROFILE UPDATE HANDLER
  // ---------------------------------------------------------------------------

  const handleProfileSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileFeedback(null);

    if (!authUser) {
      setProfileFeedback({
        type: 'error',
        text: 'You must be signed in to update your profile.',
      });
      return;
    }

    const whatsappNorm = normalizeNigerianPhone(editWhatsapp);
    if (editWhatsapp.trim() && !whatsappNorm.valid) {
      setProfileFeedback({
        type: 'error',
        text: whatsappNorm.error || 'Invalid WhatsApp phone number.',
      });
      return;
    }

    const callingNorm = normalizeNigerianPhone(editCalling);
    if (editCalling.trim() && !callingNorm.valid) {
      setProfileFeedback({
        type: 'error',
        text: callingNorm.error || 'Invalid calling phone number.',
      });
      return;
    }

    setProfileSaving(true);
    try {
      const response = await fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetProfileId: authUser.id,
          updates: {
            display_name: editDisplayName.trim(),
            whatsapp_number: whatsappNorm.normalized,
            calling_number: callingNorm.normalized,
            state: editState,
            city: editCity.trim(),
            account_role: editRole,
            avatar_url: editAvatarUrl.trim() || null,
            show_whatsapp_publicly: editShowWhatsapp,
            show_calling_publicly: editShowCalling,
          },
        }),
      });

      const result = await response.json();
      if (!response.ok) {
        setProfileFeedback({
          type: 'error',
          text: result.error || 'Failed to update profile.',
        });
      } else {
        await refreshUserProfile();
        setProfileFeedback({
          type: 'success',
          text: 'Your profile and contact privacy preferences have been saved.',
        });
      }
    } catch {
      setProfileFeedback({
        type: 'error',
        text: 'Network error while saving profile.',
      });
    } finally {
      setProfileSaving(false);
    }
  };

  const publicProfileProjection = userProfile
    ? toPublicSellerProfile(userProfile)
    : null;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Stage 2 Connection & Honesty Status Banner */}
      <div
        className={`rounded-2xl border p-4 mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs ${
          isSupabaseConfigured
            ? 'bg-emerald-50/90 border-emerald-200 text-emerald-950'
            : 'bg-blue-50/90 border-blue-200/80 text-blue-950'
        }`}
      >
        <div className="flex items-start gap-3">
          <Info
            className={`w-4 h-4 shrink-0 mt-0.5 ${
              isSupabaseConfigured ? 'text-emerald-600' : 'text-blue-600'
            }`}
          />
          <div className="leading-relaxed">
            {isSupabaseConfigured ? (
              <>
                <strong>Selplase Auth &amp; User Profiles Connected:</strong>{' '}
                {authUser ? (
                  <>
                    Signed in as{' '}
                    <span className="font-mono font-semibold">
                      {authUser.email}
                    </span>
                    . Your profile is protected by Row Level Security (RLS) ·
                    Onboarding:{' '}
                    <strong>
                      {isOnboardingComplete ? 'Completed' : 'Action Required'}
                    </strong>
                    .
                  </>
                ) : (
                  'Continue with Google or sign in below to access your private Selplase profile and publish marketplace listings.'
                )}
              </>
            ) : (
              <>
                <strong>Selplase Google OAuth &amp; Supabase RLS Ready (Awaiting Project Keys):</strong>{' '}
                Google OAuth (<code className="font-mono">signInWithOAuth</code>),
                first-time onboarding (<code className="font-mono">/onboarding</code>),
                Nigerian phone normalisation, and PostgreSQL RLS migrations are
                implemented. Configure{' '}
                <code className="font-mono">NEXT_PUBLIC_SUPABASE_URL</code> and{' '}
                <code className="font-mono">
                  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
                </code>{' '}
                to connect your Supabase project.
              </>
            )}
          </div>
        </div>

        {authUser && (
          <button
            type="button"
            onClick={() => signOutUser()}
            className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold flex items-center gap-1.5 shrink-0 cursor-pointer self-start sm:self-center"
          >
            <LogOut className="w-3.5 h-3.5" />
            Sign Out
          </button>
        )}
      </div>

      {/* Global Auth Alert Messages */}
      {authError && (
        <div className="mb-6 rounded-2xl bg-rose-50 border border-rose-200 p-4 flex items-start gap-2.5 text-xs text-rose-800">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
          <span>{authError}</span>
        </div>
      )}

      {authSuccess && (
        <div className="mb-6 rounded-2xl bg-emerald-50 border border-emerald-200 p-4 flex items-start gap-2.5 text-xs text-emerald-900">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
          <span>{authSuccess}</span>
        </div>
      )}

      {/* Header & Navigation Tabs */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 mb-8">
        <div>
          <p className="text-xs font-semibold text-blue-600">
            Selplase Account &amp; Seller Center
          </p>
          <h1 className="text-3xl font-extrabold text-slate-950 font-display mt-1">
            Account &amp; Profile
          </h1>
        </div>

        <div
          role="tablist"
          aria-label="Account Screens"
          className="flex flex-wrap items-center gap-1.5 p-1.5 bg-white/85 backdrop-blur-xl border border-slate-200/80 rounded-2xl shadow-xs"
        >
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'dashboard'}
            onClick={() => {
              setActiveTab('dashboard');
              setAuthError(null);
            }}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'dashboard'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <LayoutDashboard className="w-3.5 h-3.5" />
            Account Dashboard
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'seller-profile'}
            onClick={() => {
              setActiveTab('seller-profile');
              setAuthError(null);
            }}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'seller-profile'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Store className="w-3.5 h-3.5" />
            Seller Profiles
          </button>

          {!authUser && (
            <>
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === 'login'}
                onClick={() => {
                  setActiveTab('login');
                  setAuthError(null);
                }}
                className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
                  activeTab === 'login'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Lock className="w-3.5 h-3.5" />
                Sign In
              </button>

              <button
                type="button"
                role="tab"
                aria-selected={activeTab === 'register'}
                onClick={() => {
                  setActiveTab('register');
                  setAuthError(null);
                }}
                className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
                  activeTab === 'register'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <UserPlus className="w-3.5 h-3.5" />
                Register
              </button>
            </>
          )}

          {authUser && (
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'reset-password'}
              onClick={() => {
                setActiveTab('reset-password');
                setAuthError(null);
              }}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'reset-password'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <KeyRound className="w-3.5 h-3.5" />
              Change Password
            </button>
          )}
        </div>
      </div>

      {/* =================================================================== */}
      {/* TAB 1: ACCOUNT DASHBOARD & PROTECTED USER PROFILE                   */}
      {/* =================================================================== */}
      {activeTab === 'dashboard' && (
        <div className="space-y-8">
          {/* SECTION A: REAL AUTHENTICATED USER PROFILE (OR AUTH GATE) */}
          <div className="rounded-3xl bg-white/90 backdrop-blur-2xl border border-slate-200/80 shadow-[0_12px_40px_rgba(15,23,42,0.05)] p-6 sm:p-8">
            {authLoading ? (
              <div className="py-10 flex items-center justify-center gap-2.5 text-sm text-slate-600">
                <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
                <span>Verifying your authenticated session...</span>
              </div>
            ) : authUser && userProfile ? (
              <div className="space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-100">
                  <div className="flex items-center gap-3.5">
                    <div className="w-14 h-14 rounded-2xl bg-blue-600 text-white font-bold text-lg flex items-center justify-center shrink-0">
                      {userProfile.display_name
                        .split(' ')
                        .map((n) => n[0])
                        .join('')
                        .slice(0, 2)
                        .toUpperCase()}
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                        <span className="font-semibold text-emerald-700">
                          Authenticated Registered Account
                        </span>
                        <span aria-hidden="true">·</span>
                        <span>Role: {userProfile.account_role.toUpperCase()}</span>
                        <span aria-hidden="true">·</span>
                        <span className="text-amber-700 font-semibold">
                          Verification: {userProfile.verification_status}
                        </span>
                      </div>
                      <h2 className="text-xl font-extrabold text-slate-950 font-display mt-0.5">
                        {userProfile.display_name}
                      </h2>
                      <p className="text-xs text-slate-500 font-mono">
                        {userProfile.email} · ID: {userProfile.id.slice(0, 8)}...
                      </p>
                    </div>
                  </div>

                  <div className="text-xs text-slate-500 space-y-1">
                    <p>
                      Joined:{' '}
                      {new Date(userProfile.created_at).toLocaleDateString(
                        'en-NG'
                      )}
                    </p>
                    <p>
                      Updated:{' '}
                      {new Date(userProfile.updated_at).toLocaleDateString(
                        'en-NG'
                      )}
                    </p>
                  </div>
                </div>

                {!isOnboardingComplete && (
                  <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-amber-950">
                    <div>
                      <p className="font-bold">
                        Complete Your Selplase Onboarding Profile
                      </p>
                      <p className="text-amber-800 mt-0.5">
                        Your WhatsApp number, Nigerian location, and account
                        role are required before publishing listings, buyer
                        requests, or seller offers.
                      </p>
                    </div>
                    <Link
                      href="/onboarding?next=/account?tab=dashboard"
                      className="px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-semibold whitespace-nowrap shrink-0"
                    >
                      Complete Onboarding →
                    </Link>
                  </div>
                )}

                {profileFeedback && (
                  <div
                    className={`p-3.5 rounded-2xl border text-xs ${
                      profileFeedback.type === 'success'
                        ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                        : 'bg-rose-50 border-rose-200 text-rose-800'
                    }`}
                  >
                    {profileFeedback.text}
                  </div>
                )}

                <form onSubmit={handleProfileSave} className="space-y-5">
                  <div className="flex items-center gap-2 text-sm font-bold text-slate-900">
                    <UserCog className="w-4 h-4 text-blue-600" />
                    <h3>Edit Your Permitted Profile Information</h3>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div>
                      <label
                        htmlFor="profile-display-name"
                        className="block text-xs font-semibold text-slate-700 mb-1"
                      >
                        Display Name *
                      </label>
                      <input
                        id="profile-display-name"
                        type="text"
                        required
                        value={editDisplayName}
                        onChange={(e) => setEditDisplayName(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-200 text-sm text-slate-900 focus:outline-none focus:border-blue-600"
                      />
                    </div>

                    <div>
                      <label
                        htmlFor="profile-email-readonly"
                        className="block text-xs font-semibold text-slate-700 mb-1"
                      >
                        Email (Managed by Supabase Auth)
                      </label>
                      <input
                        id="profile-email-readonly"
                        type="email"
                        readOnly
                        disabled
                        value={userProfile.email}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-slate-100 border border-slate-200 text-sm text-slate-500 font-mono cursor-not-allowed"
                      />
                    </div>

                    <div>
                      <label
                        htmlFor="profile-role-select"
                        className="block text-xs font-semibold text-slate-700 mb-1"
                      >
                        Account Role
                      </label>
                      <select
                        id="profile-role-select"
                        value={editRole}
                        onChange={(e) =>
                          setEditRole(e.target.value as AccountRole)
                        }
                        className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-200 text-sm text-slate-900 focus:outline-none focus:border-blue-600"
                      >
                        <option value="both">Buyer &amp; Seller (Combined)</option>
                        <option value="buyer">Buyer Only</option>
                        <option value="seller">Seller Only</option>
                      </select>
                    </div>

                    <div>
                      <label
                        htmlFor="profile-whatsapp-input"
                        className="block text-xs font-semibold text-slate-700 mb-1"
                      >
                        WhatsApp Number (+234) — Unverified
                      </label>
                      <input
                        id="profile-whatsapp-input"
                        type="tel"
                        value={editWhatsapp}
                        onChange={(e) => setEditWhatsapp(e.target.value)}
                        placeholder="+2348030001122"
                        className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-200 text-sm font-mono text-slate-900 focus:outline-none focus:border-blue-600"
                      />
                    </div>

                    <div>
                      <label
                        htmlFor="profile-calling-input"
                        className="block text-xs font-semibold text-slate-700 mb-1"
                      >
                        Separate Calling Number (Optional)
                      </label>
                      <input
                        id="profile-calling-input"
                        type="tel"
                        value={editCalling}
                        onChange={(e) => setEditCalling(e.target.value)}
                        placeholder="+2348090002233"
                        className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-200 text-sm font-mono text-slate-900 focus:outline-none focus:border-blue-600"
                      />
                    </div>

                    <div>
                      <label
                        htmlFor="profile-avatar-input"
                        className="block text-xs font-semibold text-slate-700 mb-1"
                      >
                        Profile Image URL (Optional)
                      </label>
                      <input
                        id="profile-avatar-input"
                        type="url"
                        value={editAvatarUrl}
                        onChange={(e) => setEditAvatarUrl(e.target.value)}
                        placeholder="https://..."
                        className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-200 text-sm text-slate-900 focus:outline-none focus:border-blue-600"
                      />
                    </div>

                    <div>
                      <label
                        htmlFor="profile-state-select"
                        className="block text-xs font-semibold text-slate-700 mb-1"
                      >
                        Nigerian State *
                      </label>
                      <select
                        id="profile-state-select"
                        value={editState}
                        onChange={(e) => setEditState(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-200 text-sm text-slate-900 focus:outline-none focus:border-blue-600"
                      >
                        {NIGERIAN_STATES.map((st) => (
                          <option key={st} value={st}>
                            {st}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label
                        htmlFor="profile-city-input"
                        className="block text-xs font-semibold text-slate-700 mb-1"
                      >
                        City / Town *
                      </label>
                      <input
                        id="profile-city-input"
                        type="text"
                        required
                        value={editCity}
                        onChange={(e) => setEditCity(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-200 text-sm text-slate-900 focus:outline-none focus:border-blue-600"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Verification Status (Read-Only)
                      </label>
                      <div className="px-3.5 py-2.5 rounded-xl bg-amber-50/80 border border-amber-200 text-xs font-semibold text-amber-900 flex items-center gap-1.5">
                        <UserCheck className="w-4 h-4 text-amber-600 shrink-0" />
                        <span>
                          {userProfile.verification_status.toUpperCase()} (Phone
                          &amp; ID not verified yet)
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Contact Visibility Preferences (Private by Default) */}
                  <div className="rounded-2xl bg-slate-50 border border-slate-200/80 p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-bold text-slate-900">
                        Contact Visibility Preferences (Private by Default)
                      </p>
                      <span className="text-[11px] text-slate-500">
                        Controls what appears on your public seller profile
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                      <label className="flex items-center gap-2.5 p-3 rounded-xl bg-white border border-slate-200 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={editShowWhatsapp}
                          onChange={(e) =>
                            setEditShowWhatsapp(e.target.checked)
                          }
                          className="w-4 h-4 rounded text-blue-600"
                        />
                        <div>
                          <span className="font-semibold text-slate-900 block">
                            Show WhatsApp number on public seller profile
                          </span>
                          <span className="text-slate-500">
                            {editShowWhatsapp
                              ? 'Visible to marketplace visitors'
                              : 'Hidden (Private)'}
                          </span>
                        </div>
                      </label>

                      <label className="flex items-center gap-2.5 p-3 rounded-xl bg-white border border-slate-200 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={editShowCalling}
                          onChange={(e) => setEditShowCalling(e.target.checked)}
                          className="w-4 h-4 rounded text-blue-600"
                        />
                        <div>
                          <span className="font-semibold text-slate-900 block">
                            Show calling number on public seller profile
                          </span>
                          <span className="text-slate-500">
                            {editShowCalling
                              ? 'Visible to marketplace visitors'
                              : 'Hidden (Private)'}
                          </span>
                        </div>
                      </label>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-4 pt-2">
                    <p className="text-xs text-slate-500">
                      Note: Real registered accounts have 0 completed sales or
                      ratings until marketplace transactions are connected.
                    </p>
                    <button
                      type="submit"
                      disabled={profileSaving}
                      className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-xs font-semibold shadow-xs flex items-center gap-2 cursor-pointer shrink-0"
                    >
                      {profileSaving && (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      )}
                      Save Profile Changes
                    </button>
                  </div>
                </form>
              </div>
            ) : (
              /* AUTH GATE WHEN VISITOR IS NOT SIGNED IN */
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                <div className="space-y-2 max-w-2xl">
                  <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-700">
                    <ShieldCheck className="w-4 h-4" />
                    <span>Protected Selplase Account Area</span>
                  </div>
                  <h2 className="text-xl font-bold text-slate-900 font-display">
                    Continue with Google to Access Your Selplase Profile
                  </h2>
                  <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                    Private user profile data (contact numbers, email, and
                    visibility settings) is protected by Supabase Auth and Row
                    Level Security. Sign in with Google to manage your profile,
                    complete onboarding, and publish marketplace listings.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-3 shrink-0">
                  <button
                    type="button"
                    onClick={handleGoogleSignIn}
                    disabled={googleSubmitting}
                    className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 disabled:opacity-60 text-white text-xs font-semibold shadow-xs flex items-center gap-2 transition-colors cursor-pointer"
                  >
                    {googleSubmitting && (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    )}
                    Continue with Google
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('login')}
                    className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
                  >
                    Email Sign In
                  </button>
                  <Link
                    href="/onboarding"
                    className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold transition-colors"
                  >
                    Preview Onboarding
                  </Link>
                </div>
              </div>
            )}
          </div>

          {/* SECTION B: BROWSER-LOCAL DEMONSTRATION ACTIVITY (CLEARLY DISTINGUISHED) */}
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h2 className="text-lg font-bold text-slate-900 font-display">
                  Browser-Local Demonstration Activity
                </h2>
                <p className="text-xs text-slate-500">
                  These sample listings, saved items, and messages are stored in
                  your browser for Stage 1/2 demonstration and are not linked to
                  real user transactions.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              <div className="rounded-3xl bg-white/85 backdrop-blur-xl border border-slate-200/80 p-5">
                <p className="text-xs text-slate-500">Demo Listings in Browser</p>
                <p className="text-2xl font-extrabold text-slate-900 font-mono tabular-nums mt-1">
                  {listings.length}
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  Local demonstration catalog
                </p>
              </div>

              <div className="rounded-3xl bg-white/85 backdrop-blur-xl border border-slate-200/80 p-5">
                <p className="text-xs text-slate-500">Saved Demo Items</p>
                <p className="text-2xl font-extrabold text-slate-900 font-mono tabular-nums mt-1">
                  {savedListings.length}
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  Bookmarked in this browser
                </p>
              </div>

              <div className="rounded-3xl bg-white/85 backdrop-blur-xl border border-slate-200/80 p-5">
                <p className="text-xs text-slate-500">
                  Mocked In-Platform Messages
                </p>
                <p className="text-2xl font-extrabold text-slate-900 font-mono tabular-nums mt-1">
                  {platformMessages.length}
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  Browser-only preview threads
                </p>
              </div>

              <div className="rounded-3xl bg-white/85 backdrop-blur-xl border border-slate-200/80 p-5">
                <p className="text-xs text-slate-500">
                  Local &ldquo;I Have This&rdquo; Offers
                </p>
                <p className="text-2xl font-extrabold text-blue-600 font-mono tabular-nums mt-1">
                  {sellerOffers.length}
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  Saved in current browser only
                </p>
              </div>
            </div>
          </div>

          {/* Mocked Messages, Seller Responses & Supabase Configuration Guide */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-7 space-y-6">
              {/* Mocked In-Platform Messages Box */}
              <div className="rounded-3xl bg-white/85 backdrop-blur-xl border border-slate-200/80 p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-bold text-slate-900 font-display flex items-center gap-2">
                    <MessageSquare className="w-4 h-4 text-blue-600" />
                    In-Platform Messages (Browser-Only Mock)
                  </h2>
                  <Link
                    href="/explore"
                    className="text-xs font-semibold text-blue-600 hover:text-blue-700"
                  >
                    Explore Listings
                  </Link>
                </div>

                <div className="space-y-3">
                  {platformMessages.map((msg) => (
                    <div
                      key={msg.id}
                      className="rounded-2xl bg-slate-50 border border-slate-200/70 p-4 space-y-1.5"
                    >
                      <div className="flex items-center justify-between text-xs text-slate-500">
                        <span className="font-semibold text-slate-800">
                          To: {msg.sellerName}
                        </span>
                        <Link
                          href={`/listings/${msg.listingId}`}
                          className="text-blue-600 hover:underline truncate max-w-[200px]"
                        >
                          {msg.listingTitle}
                        </Link>
                      </div>
                      <p className="text-xs text-slate-700">
                        <strong>{msg.senderName}:</strong> {msg.messageText}
                      </p>
                      <p className="text-xs text-blue-800 bg-blue-50/80 rounded-xl px-3 py-2">
                        {msg.replyPreview}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Saved Listings */}
              <div className="rounded-3xl bg-white/85 backdrop-blur-xl border border-slate-200/80 p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-bold text-slate-900 font-display flex items-center gap-2">
                    <Heart className="w-4 h-4 text-rose-500" />
                    Saved Demo Listings ({savedListings.length})
                  </h2>
                  <Link
                    href="/explore"
                    className="text-xs font-semibold text-blue-600 hover:text-blue-700"
                  >
                    Browse All ({buyerRequests.length} Requests)
                  </Link>
                </div>

                {savedListings.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {savedListings.slice(0, 2).map((item) => (
                      <ListingCard key={item.id} listing={item} />
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-500">
                    Tap the heart icon on any listing card to bookmark it in
                    your browser.
                  </p>
                )}
              </div>
            </div>

            {/* Supabase Setup & RLS Summary Box */}
            <div className="lg:col-span-5 rounded-3xl bg-white/85 backdrop-blur-xl border border-slate-200/80 p-6 space-y-4 h-fit">
              <div className="flex items-center gap-2.5">
                <Database className="w-5 h-5 text-blue-600" />
                <h2 className="text-lg font-bold text-slate-900 font-display">
                  Selplase Supabase &amp; Security Architecture
                </h2>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Google OAuth authentication, first-time user onboarding,
                profiles, marketplace listings, buyer requests, offers, and
                photo uploads use <code className="font-mono">@supabase/ssr</code>{' '}
                with hardened PostgreSQL Row Level Security and column-level
                privileges.
              </p>
              <ul className="space-y-2 text-xs text-slate-700">
                <li>
                  • <strong>Stage 2 Migration (Profiles):</strong>{' '}
                  <code className="font-mono text-[11px]">
                    supabase/migrations/20261112000001_user_profiles_and_rls.sql
                  </code>
                </li>
                <li>
                  • <strong>Stage 3 Migration (Marketplace &amp; Storage):</strong>{' '}
                  <code className="font-mono text-[11px]">
                    supabase/migrations/20261112000002_marketplace_listings_requests_offers.sql
                  </code>
                </li>
                <li>
                  • <strong>Stage 4 Migration (Onboarding &amp; Security Hardening):</strong>{' '}
                  <code className="font-mono text-[11px]">
                    supabase/migrations/20261112000003_stage4_onboarding_and_security_hardening.sql
                  </code>
                </li>
                <li>
                  • <strong>Active PostgreSQL Tables:</strong>{' '}
                  <code className="font-mono text-[11px]">
                    public.profiles, public.listings, public.buyer_requests, public.request_offers
                  </code>
                </li>
                <li>
                  • <strong>Auth &amp; Onboarding Endpoints:</strong>{' '}
                  <code className="font-mono text-[11px]">
                    /auth/callback, /onboarding, /api/onboarding, /api/profile
                  </code>
                </li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* TAB 2: PUBLIC SELLER PROFILES (REAL USER PREVIEW vs FICTIONAL DEMO) */}
      {/* =================================================================== */}
      {activeTab === 'seller-profile' && (
        <div className="space-y-8">
          {/* If signed in, show how the user's OWN public seller profile looks to visitors */}
          {authUser && publicProfileProjection && (
            <div className="rounded-3xl bg-emerald-50/70 border border-emerald-200 p-6 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider">
                    Your Real Public Seller Profile Preview
                  </span>
                  <h2 className="text-xl font-extrabold text-slate-950 font-display mt-0.5">
                    {publicProfileProjection.display_name}
                  </h2>
                  <p className="text-xs text-slate-600">
                    {publicProfileProjection.city},{' '}
                    {publicProfileProjection.state} · Role:{' '}
                    {publicProfileProjection.account_role} · Status:{' '}
                    <strong>{publicProfileProjection.verification_status}</strong>
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className="px-3 py-1.5 rounded-xl bg-white border border-emerald-200 text-slate-700 flex items-center gap-1.5">
                    {publicProfileProjection.public_whatsapp_number ? (
                      <>
                        <Eye className="w-3.5 h-3.5 text-emerald-600" />
                        Public WhatsApp:{' '}
                        <strong className="font-mono">
                          {publicProfileProjection.public_whatsapp_number}
                        </strong>
                      </>
                    ) : (
                      <>
                        <EyeOff className="w-3.5 h-3.5 text-slate-400" />
                        WhatsApp Hidden (Private)
                      </>
                    )}
                  </span>

                  <span className="px-3 py-1.5 rounded-xl bg-white border border-emerald-200 text-slate-700 flex items-center gap-1.5">
                    {publicProfileProjection.public_calling_number ? (
                      <>
                        <Eye className="w-3.5 h-3.5 text-emerald-600" />
                        Public Call:{' '}
                        <strong className="font-mono">
                          {publicProfileProjection.public_calling_number}
                        </strong>
                      </>
                    ) : (
                      <>
                        <EyeOff className="w-3.5 h-3.5 text-slate-400" />
                        Call Number Hidden (Private)
                      </>
                    )}
                  </span>
                </div>
              </div>
              <p className="text-xs text-slate-600">
                Your private email is never exposed on public seller profiles,
                and no fictional sales or ratings are attached to your real
                account.
              </p>
            </div>
          )}

          {/* Fictional Sample Seller Switcher */}
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-white/80 border border-slate-200/80 p-4">
            <span className="text-xs font-semibold text-slate-600">
              Previewing Fictional Sample Seller Profiles (Stage 1/2 Demo Data):
            </span>
            <div className="flex flex-wrap items-center gap-2">
              {ALL_DEMO_SELLERS.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setSelectedSellerId(s.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                    demoSeller.id === s.id
                      ? 'bg-slate-900 text-white'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                  }`}
                >
                  {s.fullName.replace(' (Demo)', '')} ({s.city})
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-3xl bg-white/90 backdrop-blur-2xl border border-slate-200/80 p-6 sm:p-8 shadow-xs">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="flex items-start sm:items-center gap-4">
                <div
                  className="w-16 h-16 rounded-3xl text-white font-extrabold text-xl flex items-center justify-center shrink-0 shadow-md"
                  style={{ backgroundColor: demoSeller.avatarColor }}
                >
                  {demoSeller.initials}
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                    <span className="font-semibold text-blue-700">
                      Fictional Demonstration Seller Profile (Not a Real User)
                    </span>
                    <span aria-hidden="true">·</span>
                    <span>{demoSeller.handle}</span>
                  </div>
                  <h2 className="text-2xl font-extrabold text-slate-950 font-display mt-0.5">
                    {demoSeller.fullName}
                  </h2>
                  <p className="text-sm font-medium text-slate-700">
                    {demoSeller.businessName} ·{' '}
                    <span className="inline-flex items-center gap-1 text-slate-500">
                      <MapPin className="w-3.5 h-3.5 text-blue-600" />
                      {demoSeller.city}, {demoSeller.state}
                    </span>
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2.5">
                <a
                  href={`https://wa.me/234${demoSeller.whatsappPhone.replace(
                    /^0/,
                    ''
                  )}?text=${encodeURIComponent(
                    `Hello ${demoSeller.fullName}, I viewed your Seller Profile on Selplase.`
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2.5 rounded-xl bg-[#16A34A] hover:bg-[#15803D] text-white text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors"
                >
                  <MessageCircle className="w-4 h-4" />
                  WhatsApp
                </a>

                <a
                  href={buildTelCallUrl(demoSeller.whatsappPhone)}
                  className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors"
                >
                  <Phone className="w-3.5 h-3.5" />
                  Call ({demoSeller.whatsappPhone})
                </a>

                <button
                  type="button"
                  onClick={() =>
                    openContactModal(displayedSellerListings[0] || listings[0])
                  }
                  className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  In-Platform Message (Mock)
                </button>
              </div>
            </div>

            <p className="mt-5 text-sm text-slate-600 max-w-3xl leading-relaxed">
              {demoSeller.bio}
            </p>

            <div className="mt-5 pt-5 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-600">
              <div className="flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-amber-600 shrink-0" />
                <span>
                  <strong>Verification Status:</strong> Unverified Demo Account
                  (Identity verification is not yet implemented).
                </span>
              </div>
              <span className="text-slate-400">
                Joined {demoSeller.joinedDate} · {demoSeller.responseTime}
              </span>
            </div>
          </div>

          <div>
            <h3 className="text-xl font-bold text-slate-950 font-display mb-4">
              Fictional Demo Listings by {demoSeller.fullName}
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {displayedSellerListings.map((item) => (
                <ListingCard key={item.id} listing={item} />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* TAB 3: LOGIN SCREEN (PRIMARY GOOGLE OAUTH + EMAIL FALLBACK)         */}
      {/* =================================================================== */}
      {activeTab === 'login' && (
        <div className="max-w-md mx-auto">
          <div className="rounded-3xl bg-white/90 backdrop-blur-2xl border border-slate-200/80 shadow-xl p-7 sm:p-8 space-y-5">
            <div>
              <p className="text-xs font-semibold text-blue-600">
                Selplase Authentication
              </p>
              <h2 className="text-2xl font-extrabold text-slate-950 font-display mt-1">
                Sign In to Selplase
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Continue with Google for fast one-click sign-in and account
                creation, or use your email and password below.
              </p>
            </div>

            {/* Primary: Continue with Google */}
            <div className="space-y-2.5">
              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={googleSubmitting}
                className="w-full py-3 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 disabled:opacity-60 text-white text-sm font-semibold shadow-sm flex items-center justify-center gap-2.5 transition-colors cursor-pointer"
              >
                {googleSubmitting && (
                  <Loader2 className="w-4 h-4 animate-spin" />
                )}
                <span>Continue with Google</span>
              </button>
              <p className="text-[11px] text-center text-slate-500">
                First-time Google users are guided through a quick 1-minute
                Selplase onboarding step.
              </p>
            </div>

            <div className="relative flex items-center py-1">
              <div className="flex-grow border-t border-slate-200" />
              <span className="shrink-0 mx-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                or sign in with email
              </span>
              <div className="flex-grow border-t border-slate-200" />
            </div>

            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <div>
                <label
                  htmlFor="login-email-input"
                  className="block text-xs font-semibold text-slate-700 mb-1.5"
                >
                  Email Address
                </label>
                <input
                  id="login-email-input"
                  type="email"
                  required
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full px-4 py-2.5 rounded-xl bg-white border border-slate-200 text-sm text-slate-900 focus:outline-none focus:border-blue-600"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label
                    htmlFor="login-password-input"
                    className="block text-xs font-semibold text-slate-700"
                  >
                    Password
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab('forgot-password');
                      setAuthError(null);
                    }}
                    className="text-xs font-semibold text-blue-600 hover:underline cursor-pointer"
                  >
                    Forgot password?
                  </button>
                </div>
                <input
                  id="login-password-input"
                  type="password"
                  required
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-4 py-2.5 rounded-xl bg-white border border-slate-200 text-sm text-slate-900 focus:outline-none focus:border-blue-600"
                />
              </div>

              <button
                type="submit"
                disabled={authSubmitting}
                className="w-full py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-sm font-semibold shadow-sm flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                {authSubmitting && (
                  <Loader2 className="w-4 h-4 animate-spin" />
                )}
                Sign In with Email
              </button>
            </form>

            <div className="pt-4 border-t border-slate-100 text-center text-xs text-slate-600">
              New to Selplase?{' '}
              <button
                type="button"
                onClick={handleGoogleSignIn}
                className="font-semibold text-blue-600 hover:underline cursor-pointer"
              >
                Continue with Google
              </button>{' '}
              or{' '}
              <button
                type="button"
                onClick={() => {
                  setActiveTab('register');
                  setAuthError(null);
                }}
                className="font-semibold text-slate-700 hover:underline cursor-pointer"
              >
                use email registration
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* TAB 4: REGISTRATION SCREEN (GOOGLE RECOMMENDED + EMAIL COMPAT)      */}
      {/* =================================================================== */}
      {activeTab === 'register' && (
        <div className="max-w-xl mx-auto">
          <div className="rounded-3xl bg-white/90 backdrop-blur-2xl border border-slate-200/80 shadow-xl p-7 sm:p-8 space-y-5">
            <div>
              <p className="text-xs font-semibold text-blue-600">
                Selplase Account Creation
              </p>
              <h2 className="text-2xl font-extrabold text-slate-950 font-display mt-1">
                Create Your Selplase Account
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                We recommend signing up with Google, then completing your
                1-minute Nigerian WhatsApp &amp; location onboarding.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2.5">
              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={googleSubmitting}
                className="w-full py-3 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 disabled:opacity-60 text-white text-sm font-semibold shadow-sm flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                {googleSubmitting && (
                  <Loader2 className="w-4 h-4 animate-spin" />
                )}
                Continue with Google (Recommended)
              </button>
              <p className="text-[11px] text-center text-slate-500">
                No password to remember — your contact numbers remain private by
                default and marked unverified.
              </p>
            </div>

            <div className="relative flex items-center py-1">
              <div className="flex-grow border-t border-slate-200" />
              <span className="shrink-0 mx-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                or register with email &amp; password
              </span>
              <div className="flex-grow border-t border-slate-200" />
            </div>

            {Object.keys(regFieldErrors).length > 0 && (
              <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-xs text-rose-800 space-y-1">
                {Object.values(regFieldErrors).map((err, idx) => (
                  <p key={idx}>• {err}</p>
                ))}
              </div>
            )}

            <form onSubmit={handleRegisterSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label
                    htmlFor="reg-fullname-input"
                    className="block text-xs font-semibold text-slate-700 mb-1.5"
                  >
                    Display Name / Business Name *
                  </label>
                  <input
                    id="reg-fullname-input"
                    type="text"
                    required
                    value={regDisplayName}
                    onChange={(e) => setRegDisplayName(e.target.value)}
                    placeholder="e.g. Chidinma Okafor"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-200 text-sm text-slate-900 focus:outline-none focus:border-blue-600"
                  />
                </div>

                <div>
                  <label
                    htmlFor="reg-email-input"
                    className="block text-xs font-semibold text-slate-700 mb-1.5"
                  >
                    Email Address *
                  </label>
                  <input
                    id="reg-email-input"
                    type="email"
                    required
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-200 text-sm text-slate-900 focus:outline-none focus:border-blue-600"
                  />
                </div>
              </div>

              {/* Password & Password Confirmation Fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label
                    htmlFor="reg-password-input"
                    className="block text-xs font-semibold text-slate-700 mb-1.5"
                  >
                    Password (min 8 chars) *
                  </label>
                  <input
                    id="reg-password-input"
                    type="password"
                    required
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-200 text-sm text-slate-900 focus:outline-none focus:border-blue-600"
                  />
                </div>

                <div>
                  <label
                    htmlFor="reg-confirm-password-input"
                    className="block text-xs font-semibold text-slate-700 mb-1.5"
                  >
                    Confirm Password *
                  </label>
                  <input
                    id="reg-confirm-password-input"
                    type="password"
                    required
                    value={regConfirmPassword}
                    onChange={(e) => setRegConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-200 text-sm text-slate-900 focus:outline-none focus:border-blue-600"
                  />
                </div>
              </div>

              {/* WhatsApp & Optional Separate Calling Number */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label
                    htmlFor="reg-whatsapp-input"
                    className="block text-xs font-semibold text-slate-700 mb-1.5"
                  >
                    WhatsApp Number *
                  </label>
                  <input
                    id="reg-whatsapp-input"
                    type="tel"
                    required
                    value={regWhatsapp}
                    onChange={(e) => setRegWhatsapp(e.target.value)}
                    placeholder="0803 000 1122"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-200 text-sm font-mono text-slate-900 focus:outline-none focus:border-blue-600"
                  />
                </div>

                <div>
                  <label
                    htmlFor="reg-calling-input"
                    className="block text-xs font-semibold text-slate-700 mb-1.5"
                  >
                    Separate Calling Number (Optional)
                  </label>
                  <input
                    id="reg-calling-input"
                    type="tel"
                    value={regCalling}
                    onChange={(e) => setRegCalling(e.target.value)}
                    placeholder="0809 000 2233"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-200 text-sm font-mono text-slate-900 focus:outline-none focus:border-blue-600"
                  />
                </div>
              </div>

              {/* Nigerian State, City & Account Role */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                <div>
                  <label
                    htmlFor="reg-state-select"
                    className="block text-xs font-semibold text-slate-700 mb-1.5"
                  >
                    Nigerian State *
                  </label>
                  <select
                    id="reg-state-select"
                    value={regState}
                    onChange={(e) => setRegState(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-200 text-sm text-slate-900 focus:outline-none focus:border-blue-600"
                  >
                    {NIGERIAN_STATES.map((st) => (
                      <option key={st} value={st}>
                        {st}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="reg-city-input"
                    className="block text-xs font-semibold text-slate-700 mb-1.5"
                  >
                    City / Town *
                  </label>
                  <input
                    id="reg-city-input"
                    type="text"
                    required
                    value={regCity}
                    onChange={(e) => setRegCity(e.target.value)}
                    placeholder="e.g. Lekki, Wuse 2"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-200 text-sm text-slate-900 focus:outline-none focus:border-blue-600"
                  />
                </div>

                <div>
                  <label
                    htmlFor="reg-role-select"
                    className="block text-xs font-semibold text-slate-700 mb-1.5"
                  >
                    Account Role *
                  </label>
                  <select
                    id="reg-role-select"
                    value={regRole}
                    onChange={(e) => setRegRole(e.target.value as AccountRole)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-200 text-sm text-slate-900 focus:outline-none focus:border-blue-600"
                  >
                    <option value="both">Buyer &amp; Seller</option>
                    <option value="buyer">Buyer Only</option>
                    <option value="seller">Seller Only</option>
                  </select>
                </div>
              </div>

              <button
                type="submit"
                disabled={authSubmitting}
                className="w-full py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-sm font-semibold shadow-sm flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                {authSubmitting && (
                  <Loader2 className="w-4 h-4 animate-spin" />
                )}
                Create Account
              </button>
            </form>

            <div className="pt-4 border-t border-slate-100 text-center text-xs text-slate-600">
              Already have an account?{' '}
              <button
                type="button"
                onClick={() => {
                  setActiveTab('login');
                  setAuthError(null);
                }}
                className="font-semibold text-blue-600 hover:underline cursor-pointer"
              >
                Sign In
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* TAB 5: FORGOT PASSWORD SCREEN                                       */}
      {/* =================================================================== */}
      {activeTab === 'forgot-password' && (
        <div className="max-w-md mx-auto">
          <div className="rounded-3xl bg-white/90 backdrop-blur-2xl border border-slate-200/80 shadow-xl p-7 sm:p-8 space-y-5">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">
                <Mail className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-xl font-extrabold text-slate-950 font-display">
                  Forgot Your Password?
                </h2>
                <p className="text-xs text-slate-500">
                  We will send a password recovery link to your email.
                </p>
              </div>
            </div>

            <form onSubmit={handleForgotPasswordSubmit} className="space-y-4">
              <div>
                <label
                  htmlFor="forgot-email-input"
                  className="block text-xs font-semibold text-slate-700 mb-1.5"
                >
                  Account Email Address
                </label>
                <input
                  id="forgot-email-input"
                  type="email"
                  required
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full px-4 py-2.5 rounded-xl bg-white border border-slate-200 text-sm text-slate-900 focus:outline-none focus:border-blue-600"
                />
              </div>

              <button
                type="submit"
                disabled={authSubmitting}
                className="w-full py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-sm font-semibold shadow-sm flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                {authSubmitting && (
                  <Loader2 className="w-4 h-4 animate-spin" />
                )}
                Send Recovery Link
              </button>
            </form>

            <div className="pt-4 border-t border-slate-100 text-center text-xs text-slate-600">
              Remembered your password?{' '}
              <button
                type="button"
                onClick={() => setActiveTab('login')}
                className="font-semibold text-blue-600 hover:underline cursor-pointer"
              >
                Back to Sign In
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* TAB 6: PASSWORD RESET SCREEN                                        */}
      {/* =================================================================== */}
      {activeTab === 'reset-password' && (
        <div className="max-w-md mx-auto">
          <div className="rounded-3xl bg-white/90 backdrop-blur-2xl border border-slate-200/80 shadow-xl p-7 sm:p-8 space-y-5">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">
                <KeyRound className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-xl font-extrabold text-slate-950 font-display">
                  Set a New Password
                </h2>
                <p className="text-xs text-slate-500">
                  Enter and confirm your new account password below.
                </p>
              </div>
            </div>

            <form onSubmit={handleResetPasswordSubmit} className="space-y-4">
              <div>
                <label
                  htmlFor="reset-new-password"
                  className="block text-xs font-semibold text-slate-700 mb-1.5"
                >
                  New Password (min 8 chars)
                </label>
                <input
                  id="reset-new-password"
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-4 py-2.5 rounded-xl bg-white border border-slate-200 text-sm text-slate-900 focus:outline-none focus:border-blue-600"
                />
              </div>

              <div>
                <label
                  htmlFor="reset-confirm-password"
                  className="block text-xs font-semibold text-slate-700 mb-1.5"
                >
                  Confirm New Password
                </label>
                <input
                  id="reset-confirm-password"
                  type="password"
                  required
                  value={confirmNewPassword}
                  onChange={(e) => setConfirmNewPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-4 py-2.5 rounded-xl bg-white border border-slate-200 text-sm text-slate-900 focus:outline-none focus:border-blue-600"
                />
              </div>

              <button
                type="submit"
                disabled={authSubmitting}
                className="w-full py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-sm font-semibold shadow-sm flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                {authSubmitting && (
                  <Loader2 className="w-4 h-4 animate-spin" />
                )}
                Update Password
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function AccountPageContent() {
  const searchParams = useSearchParams();
  const rawTab = searchParams.get('tab');
  const validTab: AccountScreenTab =
    rawTab === 'seller-profile' || rawTab === 'seller'
      ? 'seller-profile'
      : rawTab === 'login' ||
          rawTab === 'register' ||
          rawTab === 'forgot-password' ||
          rawTab === 'reset-password' ||
          rawTab === 'dashboard'
        ? rawTab
        : 'dashboard';
  const sellerId =
    searchParams.get('seller') ||
    searchParams.get('sellerId') ||
    DEMO_SELLERS.adebayoTech.id;
  const confirmedFlag = searchParams.get('confirmed') === '1';
  const errorFlag = searchParams.get('error');

  return (
    <AccountInterfaceInner
      key={`${validTab}-${sellerId}-${confirmedFlag}-${errorFlag || ''}`}
      initialTab={validTab}
      initialSellerId={sellerId}
      confirmedFlag={confirmedFlag}
      errorFlag={errorFlag}
    />
  );
}

export default function AccountInterfacePage() {
  return (
    <Suspense
      fallback={
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="h-12 w-72 rounded-xl bg-slate-200/70 animate-pulse mb-6" />
          <div className="h-64 w-full rounded-3xl bg-white/80 animate-pulse" />
        </div>
      }
    >
      <AccountPageContent />
    </Suspense>
  );
}
