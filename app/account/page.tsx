'use client';

import React, { Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  Database,
  Heart,
  Info,
  LayoutDashboard,
  Lock,
  MapPin,
  MessageCircle,
  MessageSquare,
  Phone,
  PlusCircle,
  Store,
  UserCheck,
  UserPlus,
} from 'lucide-react';
import { useMarketplace } from '@/context/MarketplaceContext';
import { DEMO_SELLERS, NIGERIAN_STATES } from '@/lib/data/mock-marketplace';
import { buildTelCallUrl, formatNaira } from '@/lib/utils/formatters';
import { ListingCard } from '@/components/marketplace/ListingCard';

type AccountScreenTab = 'dashboard' | 'seller-profile' | 'login' | 'register';

const ALL_DEMO_SELLERS = Object.values(DEMO_SELLERS);

function AccountInterfaceInner({
  initialTab,
  initialSellerId,
}: {
  initialTab: AccountScreenTab;
  initialSellerId: string;
}) {
  const {
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
  const [authPreviewFeedback, setAuthPreviewFeedback] = useState<string | null>(
    null
  );

  // Login Form Preview State
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Register Form Preview State
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regWhatsapp, setRegWhatsapp] = useState('');
  const [regState, setRegState] = useState('Lagos');
  const [regRole, setRegRole] = useState<'both' | 'buyer' | 'seller'>('both');

  const demoSeller =
    ALL_DEMO_SELLERS.find((s) => s.id === selectedSellerId) ||
    DEMO_SELLERS.adebayoTech;

  const savedListings = listings.filter((l) => savedListingIds.includes(l.id));
  const sellerListings = listings.filter(
    (l) => l.seller.id === demoSeller.id
  );
  const displayedSellerListings =
    sellerListings.length > 0 ? sellerListings : listings.slice(0, 4);

  const handlePreviewAuthSubmit = (
    e: React.FormEvent,
    mode: 'login' | 'register'
  ) => {
    e.preventDefault();
    setAuthPreviewFeedback(
      mode === 'login'
        ? 'Stage 1 Design-Ready UI: Authentication is not connected to a live backend yet. In Stage 2, this form will call supabase.auth.signInWithPassword().'
        : 'Stage 1 Design-Ready UI: Registration is prepared for Stage 2 Supabase Auth (supabase.auth.signUp) and profile table creation.'
    );
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Stage 1 Transparency Notice */}
      <div className="rounded-2xl bg-blue-50/90 border border-blue-200/80 p-4 mb-6 flex items-start gap-3 text-xs text-blue-950">
        <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
        <div className="leading-relaxed">
          <strong>Stage 1 Account Interface Preview:</strong> These Account
          Dashboard, Seller Profile, Login, and Registration screens work with
          typed mock data and are design-ready for Stage 2 Supabase Auth &amp;
          PostgreSQL integration. No fake authentication or identity
          verification claims are active.
        </div>
      </div>

      {/* Header & 4-Screen Switcher */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 mb-8">
        <div>
          <p className="text-xs font-semibold text-blue-600">
            SELPLAS Account &amp; Seller Center
          </p>
          <h1 className="text-3xl font-extrabold text-slate-950 font-display mt-1">
            Account Interface
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
              setAuthPreviewFeedback(null);
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
              setAuthPreviewFeedback(null);
            }}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'seller-profile'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Store className="w-3.5 h-3.5" />
            Seller Profile
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'login'}
            onClick={() => {
              setActiveTab('login');
              setAuthPreviewFeedback(null);
            }}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'login'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Lock className="w-3.5 h-3.5" />
            Login Screen
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'register'}
            onClick={() => {
              setActiveTab('register');
              setAuthPreviewFeedback(null);
            }}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'register'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <UserPlus className="w-3.5 h-3.5" />
            Registration Screen
          </button>
        </div>
      </div>

      {/* TAB 1: ACCOUNT DASHBOARD */}
      {activeTab === 'dashboard' && (
        <div className="space-y-8">
          {/* Summary Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            <div className="rounded-3xl bg-white/85 backdrop-blur-xl border border-slate-200/80 p-5">
              <p className="text-xs text-slate-500">Marketplace Listings</p>
              <p className="text-2xl font-extrabold text-slate-900 font-mono tabular-nums mt-1">
                {listings.length}
              </p>
              <p className="text-xs text-blue-600 mt-1">
                Active in Stage 1 state
              </p>
            </div>

            <div className="rounded-3xl bg-white/85 backdrop-blur-xl border border-slate-200/80 p-5">
              <p className="text-xs text-slate-500">Saved Items</p>
              <p className="text-2xl font-extrabold text-slate-900 font-mono tabular-nums mt-1">
                {savedListings.length}
              </p>
              <p className="text-xs text-slate-500 mt-1">
                Bookmarked for comparison
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
                Simulated buyer-seller threads
              </p>
            </div>

            <div className="rounded-3xl bg-white/85 backdrop-blur-xl border border-slate-200/80 p-5">
              <p className="text-xs text-slate-500">
                Your &ldquo;I Have This&rdquo; Responses
              </p>
              <p className="text-2xl font-extrabold text-blue-600 font-mono tabular-nums mt-1">
                {sellerOffers.length}
              </p>
              <p className="text-xs text-slate-500 mt-1">
                Sent to buyers in this session
              </p>
            </div>
          </div>

          {/* Mocked Messages, Seller Responses & Stage 2 Readiness */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-7 space-y-6">
              {/* Mocked In-Platform Messages Box */}
              <div className="rounded-3xl bg-white/85 backdrop-blur-xl border border-slate-200/80 p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-bold text-slate-900 font-display flex items-center gap-2">
                    <MessageSquare className="w-4 h-4 text-blue-600" />
                    In-Platform Messages (Mocked)
                  </h2>
                  <Link
                    href="/explore"
                    className="text-xs font-semibold text-blue-600 hover:text-blue-700"
                  >
                    Message a Seller
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

              {/* Seller Responses ("I Have This") */}
              <div className="rounded-3xl bg-white/85 backdrop-blur-xl border border-slate-200/80 p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-bold text-slate-900 font-display">
                    Seller Responses (&ldquo;I Have This&rdquo;)
                  </h2>
                  <Link
                    href="/requests"
                    className="text-xs font-semibold text-blue-600 hover:text-blue-700"
                  >
                    Browse Buyer Requests ({buyerRequests.length})
                  </Link>
                </div>

                {sellerOffers.length > 0 ? (
                  <div className="space-y-3">
                    {sellerOffers.map((offer) => (
                      <div
                        key={offer.id}
                        className="rounded-2xl bg-slate-50 border border-slate-200/70 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                      >
                        <div>
                          <p className="text-sm font-semibold text-slate-900">
                            {offer.requestTitle}
                          </p>
                          <p className="text-xs text-slate-500 mt-0.5">
                            Condition: {offer.condition} · Location:{' '}
                            {offer.location}
                          </p>
                        </div>
                        <div className="text-right">
                          <span className="text-sm font-bold text-blue-600 font-mono tabular-nums">
                            {formatNaira(offer.offeredPriceNaira)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-2xl bg-slate-50/80 border border-slate-200/60 p-6 text-center">
                    <p className="text-sm font-semibold text-slate-800">
                      No &ldquo;I Have This&rdquo; offers sent yet
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
                      Visit the Buyer Requests page and click &ldquo;I Have
                      This&rdquo; on any item you can supply.
                    </p>
                    <Link
                      href="/requests"
                      className="mt-3 inline-flex px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-semibold"
                    >
                      Explore Buyer Requests
                    </Link>
                  </div>
                )}
              </div>
            </div>

            <div className="lg:col-span-5 rounded-3xl bg-white/85 backdrop-blur-xl border border-slate-200/80 p-6 space-y-4 h-fit">
              <div className="flex items-center gap-2.5">
                <Database className="w-5 h-5 text-blue-600" />
                <h2 className="text-lg font-bold text-slate-900 font-display">
                  Stage 2 Backend Readiness
                </h2>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                This Next.js App Router frontend is structured for seamless
                connection to{' '}
                <strong>Supabase PostgreSQL, Auth, and Storage</strong> plus a
                shared <strong>React Native Expo</strong> mobile app.
              </p>
              <ul className="space-y-2 text-xs text-slate-700">
                <li>
                  • <strong>Typed Data Layer:</strong>{' '}
                  <code className="font-mono text-[11px]">
                    lib/supabase/client-ready.ts
                  </code>
                </li>
                <li>
                  • <strong>API Route Handlers:</strong>{' '}
                  <code className="font-mono text-[11px]">/api/listings</code>{' '}
                  &amp;{' '}
                  <code className="font-mono text-[11px]">/api/requests</code>
                </li>
                <li>
                  • <strong>Identity Verification Status:</strong> Not yet
                  connected (planned for later trust phase).
                </li>
              </ul>
              <div className="pt-2 flex flex-wrap gap-2">
                <Link
                  href="/sell"
                  className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold flex items-center gap-1.5"
                >
                  <PlusCircle className="w-3.5 h-3.5" />
                  Create Listing
                </Link>
                <button
                  type="button"
                  onClick={() => setActiveTab('seller-profile')}
                  className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold cursor-pointer"
                >
                  Preview Seller Profile
                </button>
              </div>
            </div>
          </div>

          {/* Saved Listings Section */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-slate-950 font-display flex items-center gap-2">
                <Heart className="w-5 h-5 text-rose-500" />
                Saved Listings ({savedListings.length})
              </h2>
              <Link
                href="/explore"
                className="text-xs font-semibold text-blue-600 hover:text-blue-700"
              >
                Explore More
              </Link>
            </div>

            {savedListings.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {savedListings.map((item) => (
                  <ListingCard key={item.id} listing={item} />
                ))}
              </div>
            ) : (
              <div className="rounded-3xl bg-white/80 border border-slate-200/80 p-8 text-center">
                <p className="text-sm font-semibold text-slate-800">
                  You haven&apos;t saved any listings yet.
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  Tap the heart icon on any product or service card to save it
                  here.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: SELLER PROFILE (DESIGN-READY) */}
      {activeTab === 'seller-profile' && (
        <div className="space-y-8">
          {/* Demo Seller Switcher */}
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-white/80 border border-slate-200/80 p-4">
            <span className="text-xs font-semibold text-slate-600">
              Previewing Fictional Seller Profile:
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
                      Fictional Demonstration Seller Profile
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

              {/* Contact Seller Options: WhatsApp, Call, or In-Platform Message */}
              <div className="flex flex-wrap items-center gap-2.5">
                <a
                  href={`https://wa.me/234${demoSeller.whatsappPhone.replace(
                    /^0/,
                    ''
                  )}?text=${encodeURIComponent(
                    `Hello ${demoSeller.fullName}, I viewed your Seller Profile on SELPLAS.`
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
                  In-Platform Message
                </button>
              </div>
            </div>

            <p className="mt-5 text-sm text-slate-600 max-w-3xl leading-relaxed">
              {demoSeller.bio}
            </p>

            {/* Transparent Identity Verification Status Box */}
            <div className="mt-5 pt-5 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-600">
              <div className="flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-amber-600 shrink-0" />
                <span>
                  <strong>Verification Status:</strong> Unverified Demo Account
                  (Identity verification is not yet implemented in Stage 1).
                </span>
              </div>
              <span className="text-slate-400">
                Joined {demoSeller.joinedDate} · {demoSeller.responseTime}
              </span>
            </div>
          </div>

          <div>
            <h3 className="text-xl font-bold text-slate-950 font-display mb-4">
              Listings by {demoSeller.fullName}
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {displayedSellerListings.map((item) => (
                <ListingCard key={item.id} listing={item} />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: DESIGN-READY LOGIN SCREEN */}
      {activeTab === 'login' && (
        <div className="max-w-md mx-auto">
          <div className="rounded-3xl bg-white/90 backdrop-blur-2xl border border-slate-200/80 shadow-xl p-7 sm:p-8 space-y-5">
            <div>
              <p className="text-xs font-semibold text-blue-600">
                Design-Ready Screen (Stage 2 Supabase Auth Ready)
              </p>
              <h2 className="text-2xl font-extrabold text-slate-950 font-display mt-1">
                Sign In to SELPLAS
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Manage your listings, buyer requests, and WhatsApp inquiries.
              </p>
            </div>

            {authPreviewFeedback && (
              <div className="p-3.5 rounded-2xl bg-blue-50 border border-blue-200 text-xs text-blue-900 leading-relaxed">
                {authPreviewFeedback}
              </div>
            )}

            <form
              onSubmit={(e) => handlePreviewAuthSubmit(e, 'login')}
              className="space-y-4"
            >
              <div>
                <label
                  htmlFor="login-email-input"
                  className="block text-xs font-semibold text-slate-700 mb-1.5"
                >
                  Email Address or Phone Number
                </label>
                <input
                  id="login-email-input"
                  type="text"
                  required
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  placeholder="you@example.com or 0803 000 0000"
                  className="w-full px-4 py-2.5 rounded-xl bg-white border border-slate-200 text-sm text-slate-900 focus:outline-none focus:border-blue-600"
                />
              </div>

              <div>
                <label
                  htmlFor="login-password-input"
                  className="block text-xs font-semibold text-slate-700 mb-1.5"
                >
                  Password
                </label>
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
                className="w-full py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold shadow-sm transition-colors cursor-pointer"
              >
                Preview Sign In (Stage 2 Auth Ready)
              </button>
            </form>

            <div className="pt-4 border-t border-slate-100 text-center text-xs text-slate-600">
              New to SELPLAS?{' '}
              <button
                type="button"
                onClick={() => {
                  setActiveTab('register');
                  setAuthPreviewFeedback(null);
                }}
                className="font-semibold text-blue-600 hover:underline cursor-pointer"
              >
                Create an Account
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: DESIGN-READY REGISTRATION SCREEN */}
      {activeTab === 'register' && (
        <div className="max-w-lg mx-auto">
          <div className="rounded-3xl bg-white/90 backdrop-blur-2xl border border-slate-200/80 shadow-xl p-7 sm:p-8 space-y-5">
            <div>
              <p className="text-xs font-semibold text-blue-600">
                Design-Ready Screen (Stage 2 Supabase Auth Ready)
              </p>
              <h2 className="text-2xl font-extrabold text-slate-950 font-display mt-1">
                Create Your SELPLAS Account
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Buy products, offer services, or post buyer requests across
                Nigeria.
              </p>
            </div>

            {authPreviewFeedback && (
              <div className="p-3.5 rounded-2xl bg-blue-50 border border-blue-200 text-xs text-blue-900 leading-relaxed">
                {authPreviewFeedback}
              </div>
            )}

            <form
              onSubmit={(e) => handlePreviewAuthSubmit(e, 'register')}
              className="space-y-4"
            >
              <div>
                <label
                  htmlFor="reg-fullname-input"
                  className="block text-xs font-semibold text-slate-700 mb-1.5"
                >
                  Full Name or Business Name
                </label>
                <input
                  id="reg-fullname-input"
                  type="text"
                  required
                  value={regName}
                  onChange={(e) => setRegName(e.target.value)}
                  placeholder="e.g. Chidinma Okafor"
                  className="w-full px-4 py-2.5 rounded-xl bg-white border border-slate-200 text-sm text-slate-900 focus:outline-none focus:border-blue-600"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label
                    htmlFor="reg-email-input"
                    className="block text-xs font-semibold text-slate-700 mb-1.5"
                  >
                    Email Address
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

                <div>
                  <label
                    htmlFor="reg-whatsapp-input"
                    className="block text-xs font-semibold text-slate-700 mb-1.5"
                  >
                    WhatsApp Number
                  </label>
                  <input
                    id="reg-whatsapp-input"
                    type="tel"
                    required
                    value={regWhatsapp}
                    onChange={(e) => setRegWhatsapp(e.target.value)}
                    placeholder="0803 000 0000"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-200 text-sm font-mono text-slate-900 focus:outline-none focus:border-blue-600"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label
                    htmlFor="reg-state-select"
                    className="block text-xs font-semibold text-slate-700 mb-1.5"
                  >
                    Primary Nigerian State
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
                    htmlFor="reg-role-select"
                    className="block text-xs font-semibold text-slate-700 mb-1.5"
                  >
                    How will you use SELPLAS?
                  </label>
                  <select
                    id="reg-role-select"
                    value={regRole}
                    onChange={(e) =>
                      setRegRole(e.target.value as 'both' | 'buyer' | 'seller')
                    }
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-200 text-sm text-slate-900 focus:outline-none focus:border-blue-600"
                  >
                    <option value="both">Buying, Selling &amp; Requests</option>
                    <option value="buyer">Mostly Buying &amp; Requesting</option>
                    <option value="seller">Mostly Selling &amp; Services</option>
                  </select>
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold shadow-sm transition-colors cursor-pointer"
              >
                Preview Account Registration (Stage 2 Ready)
              </button>
            </form>

            <div className="pt-4 border-t border-slate-100 text-center text-xs text-slate-600">
              Already have an account?{' '}
              <button
                type="button"
                onClick={() => {
                  setActiveTab('login');
                  setAuthPreviewFeedback(null);
                }}
                className="font-semibold text-blue-600 hover:underline cursor-pointer"
              >
                Sign In
              </button>
            </div>
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
    rawTab === 'seller-profile' ||
    rawTab === 'login' ||
    rawTab === 'register' ||
    rawTab === 'dashboard'
      ? rawTab
      : 'dashboard';
  const sellerId = searchParams.get('seller') || DEMO_SELLERS.adebayoTech.id;

  return (
    <AccountInterfaceInner
      key={`${validTab}-${sellerId}`}
      initialTab={validTab}
      initialSellerId={sellerId}
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
