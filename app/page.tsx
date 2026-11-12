'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowRight,
  Briefcase,
  Handshake,
  MapPin,
  PlusSquare,
  Search,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Store,
  Users,
  Zap,
  Headphones,
} from 'lucide-react';
import { useMarketplace } from '@/context/MarketplaceContext';
import { CATEGORIES, POPULAR_LOCATIONS } from '@/lib/data/mock-marketplace';
import { ListingCard } from '@/components/marketplace/ListingCard';
import { RequestCard } from '@/components/marketplace/RequestCard';

export default function HomePage() {
  const router = useRouter();
  const { listings, buyerRequests } = useMarketplace();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeQuickTab, setActiveQuickTab] = useState<
    'all' | 'product' | 'service'
  >('all');

  const handleHeroSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = searchQuery.trim();
    if (trimmed) {
      router.push(`/explore?query=${encodeURIComponent(trimmed)}`);
    } else {
      router.push('/explore');
    }
  };

  const featuredListings = listings
    .filter((item) =>
      activeQuickTab === 'all' ? true : item.type === activeQuickTab
    )
    .slice(0, 4);

  const recentRequests = buyerRequests.slice(0, 2);

  return (
    <div className="relative overflow-hidden">
      {/* Ambient Liquid-Glass Gradient Backdrop */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute top-0 inset-x-0 h-[680px] bg-[radial-gradient(ellipse_80%_60%_at_70%_20%,rgba(59,130,246,0.16),rgba(139,92,246,0.12)_45%,transparent_80%)]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute top-32 -left-24 w-96 h-96 rounded-full bg-sky-300/15 blur-3xl"
      />

      {/* 1. HERO SECTION */}
      <section className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-10 lg:pt-12 lg:pb-14">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
          {/* Left Column: Headline, Search & Primary Actions */}
          <div className="lg:col-span-7 space-y-6">
            <p className="text-xs font-medium text-blue-700 leading-relaxed">
              Selplase · Nigeria&apos;s Marketplace for Products, Services &amp;
              Buyer Requests
            </p>

            <h1 className="text-4xl sm:text-5xl lg:text-[3.5rem] font-extrabold tracking-tight text-slate-950 leading-[1.08] font-display text-balance">
              Find it. Sell it.{' '}
              <span className="block bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 bg-clip-text text-transparent">
                Request it.
              </span>
            </h1>

            <p className="text-base sm:text-lg text-slate-600 max-w-xl leading-relaxed">
              Nigeria&apos;s trusted marketplace to buy products, offer services,
              post requests for hard-to-find items, and connect directly with
              sellers on WhatsApp.
            </p>

            {/* Large Pill Search Input */}
            <form
              onSubmit={handleHeroSearch}
              className="relative max-w-xl bg-white/90 backdrop-blur-2xl rounded-full p-2 border border-white shadow-[0_12px_36px_rgba(37,99,235,0.10)] flex items-center gap-2"
            >
              <Search className="w-5 h-5 text-slate-400 ml-3.5 shrink-0" />
              <label htmlFor="hero-marketplace-search" className="sr-only">
                Search for products, services or what you need
              </label>
              <input
                id="hero-marketplace-search"
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search for iPhones, MacBooks, solar inverters, web design..."
                className="flex-1 bg-transparent px-2 py-2.5 text-sm sm:text-base text-slate-900 placeholder:text-slate-400 focus:outline-none"
              />
              <button
                type="submit"
                aria-label="Search Marketplace"
                className="w-11 h-11 rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white flex items-center justify-center shadow-md transition-all shrink-0 cursor-pointer"
              >
                <Search className="w-4 h-4" />
              </button>
            </form>

            {/* Primary Actions */}
            <div className="flex flex-wrap items-center gap-3 pt-1">
              <Link
                href="/explore"
                className="px-5 py-3 rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-sm font-semibold shadow-[0_8px_24px_rgba(37,99,235,0.28)] flex items-center gap-2 transition-all whitespace-nowrap shrink-0"
              >
                <ShoppingBag className="w-4 h-4" />
                Explore Marketplace
                <ArrowRight className="w-4 h-4" />
              </Link>

              <Link
                href="/requests/new"
                className="px-5 py-3 rounded-full bg-white/85 hover:bg-white backdrop-blur-xl border border-slate-200/90 text-slate-800 text-sm font-semibold shadow-xs flex items-center gap-2 transition-all whitespace-nowrap shrink-0"
              >
                <PlusSquare className="w-4 h-4 text-blue-600" />
                Post a Request
              </Link>

              <Link
                href="/sell"
                className="px-5 py-3 rounded-full bg-white/85 hover:bg-white backdrop-blur-xl border border-slate-200/90 text-slate-800 text-sm font-semibold shadow-xs flex items-center gap-2 transition-all whitespace-nowrap shrink-0"
              >
                <Store className="w-4 h-4 text-indigo-600" />
                Start Selling
              </Link>
            </div>
          </div>

          {/* Right Column: Liquid-Glass Interactive Showcase Card */}
          <div className="lg:col-span-5">
            <div className="relative mx-auto max-w-md lg:max-w-none">
              <div className="rounded-[32px] bg-gradient-to-br from-blue-600/10 via-indigo-500/15 to-violet-500/10 backdrop-blur-2xl border border-white/90 p-6 shadow-[0_24px_60px_rgba(37,99,235,0.14)] relative overflow-hidden">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="text-xs font-semibold text-blue-700">
                      Live Nigerian Marketplace Pulse
                    </p>
                    <h2 className="text-lg font-bold text-slate-900">
                      Direct Buyer & Seller Connections
                    </h2>
                  </div>
                  <div className="w-10 h-10 rounded-2xl bg-white/90 shadow-sm flex items-center justify-center text-blue-600">
                    <Handshake className="w-5 h-5" />
                  </div>
                </div>

                {/* Highlighted Deal Card inside Glass Showcase */}
                <div className="rounded-2xl bg-white/90 backdrop-blur-md border border-white p-4 shadow-sm space-y-3">
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span className="font-semibold text-blue-700">
                      Featured Product · Lagos
                    </span>
                    <span className="font-mono font-bold text-slate-900">
                      ₦1,350,000
                    </span>
                  </div>
                  <p className="text-sm font-bold text-slate-900">
                    iPhone 16 Pro Max — 256GB Natural Titanium
                  </p>
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-xs text-slate-500">
                      Lekki Phase 1 · Inspect in person
                    </span>
                    <Link
                      href="/listings/lst-iphone-16-pro-max"
                      className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1"
                    >
                      View Deal
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>

                {/* Highlighted Buyer Request Card inside Glass Showcase */}
                <div className="mt-3.5 rounded-2xl bg-white/85 backdrop-blur-md border border-white p-4 shadow-sm space-y-2">
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span className="font-semibold text-amber-700">
                      Active Buyer Request · Port Harcourt
                    </span>
                    <span className="font-mono font-bold text-blue-600">
                      ₦80k – ₦120k
                    </span>
                  </div>
                  <p className="text-sm font-semibold text-slate-900">
                    Looking for Nike Air Force 1 (Triple White, EU 43)
                  </p>
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-xs text-slate-500">
                      4 sellers responded
                    </span>
                    <Link
                      href="/requests"
                      className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
                    >
                      I Have This
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>

                {/* Quick Category Count Strip */}
                <div className="mt-4 pt-3 border-t border-white/60 grid grid-cols-3 gap-2 text-center">
                  <div className="rounded-xl bg-white/60 py-2 px-2">
                    <p className="text-sm font-bold text-slate-900 font-mono tabular-nums">
                      {listings.filter((l) => l.type === 'product').length}+
                    </p>
                    <p className="text-[11px] text-slate-600">Demo Products</p>
                  </div>
                  <div className="rounded-xl bg-white/60 py-2 px-2">
                    <p className="text-sm font-bold text-slate-900 font-mono tabular-nums">
                      {listings.filter((l) => l.type === 'service').length}+
                    </p>
                    <p className="text-[11px] text-slate-600">Pro Services</p>
                  </div>
                  <div className="rounded-xl bg-white/60 py-2 px-2">
                    <p className="text-sm font-bold text-slate-900 font-mono tabular-nums">
                      {buyerRequests.length}
                    </p>
                    <p className="text-[11px] text-slate-600">Buyer Requests</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* EVERYTHING IN ONE PLACE GLASS PANEL */}
        <div className="mt-10 rounded-[28px] bg-white/75 backdrop-blur-2xl border border-white/90 shadow-[0_12px_40px_rgba(37,99,235,0.07)] p-6 sm:p-7">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
            <div className="lg:col-span-3">
              <h2 className="text-xl sm:text-2xl font-bold text-slate-900 font-display">
                Everything in One Place
              </h2>
              <p className="mt-1 text-xs sm:text-sm text-slate-600 leading-relaxed">
                A smarter, safer and simpler way to connect across Nigeria.
              </p>
            </div>

            <div className="lg:col-span-9 grid grid-cols-2 sm:grid-cols-5 gap-3">
              <Link
                href="/explore?type=product"
                className="group rounded-2xl bg-white/90 hover:bg-white border border-slate-200/70 p-4 flex flex-col items-center justify-center text-center shadow-xs hover:shadow-md hover:-translate-y-0.5 transition-all"
              >
                <div className="w-11 h-11 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mb-2 group-hover:scale-105 transition-transform">
                  <ShoppingBag className="w-5 h-5" />
                </div>
                <span className="text-xs sm:text-sm font-semibold text-slate-900">
                  Products
                </span>
              </Link>

              <Link
                href="/explore?type=service"
                className="group rounded-2xl bg-white/90 hover:bg-white border border-slate-200/70 p-4 flex flex-col items-center justify-center text-center shadow-xs hover:shadow-md hover:-translate-y-0.5 transition-all"
              >
                <div className="w-11 h-11 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-2 group-hover:scale-105 transition-transform">
                  <Briefcase className="w-5 h-5" />
                </div>
                <span className="text-xs sm:text-sm font-semibold text-slate-900">
                  Services
                </span>
              </Link>

              <Link
                href="/requests"
                className="group rounded-2xl bg-white/90 hover:bg-white border border-slate-200/70 p-4 flex flex-col items-center justify-center text-center shadow-xs hover:shadow-md hover:-translate-y-0.5 transition-all"
              >
                <div className="w-11 h-11 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mb-2 group-hover:scale-105 transition-transform">
                  <Handshake className="w-5 h-5" />
                </div>
                <span className="text-xs sm:text-sm font-semibold text-slate-900">
                  Requests
                </span>
              </Link>

              <Link
                href="/sell"
                className="group rounded-2xl bg-white/90 hover:bg-white border border-slate-200/70 p-4 flex flex-col items-center justify-center text-center shadow-xs hover:shadow-md hover:-translate-y-0.5 transition-all"
              >
                <div className="w-11 h-11 rounded-2xl bg-sky-50 text-sky-600 flex items-center justify-center mb-2 group-hover:scale-105 transition-transform">
                  <Store className="w-5 h-5" />
                </div>
                <span className="text-xs sm:text-sm font-semibold text-slate-900">
                  Sell Now
                </span>
              </Link>

              <Link
                href="/explore?sortBy=featured"
                className="col-span-2 sm:col-span-1 group rounded-2xl bg-white/90 hover:bg-white border border-slate-200/70 p-4 flex flex-col items-center justify-center text-center shadow-xs hover:shadow-md hover:-translate-y-0.5 transition-all"
              >
                <div className="w-11 h-11 rounded-2xl bg-violet-50 text-violet-600 flex items-center justify-center mb-2 group-hover:scale-105 transition-transform">
                  <Sparkles className="w-5 h-5" />
                </div>
                <span className="text-xs sm:text-sm font-semibold text-slate-900">
                  Featured
                </span>
              </Link>
            </div>
          </div>

          {/* Category Quick Filter Bar */}
          <div className="mt-6 pt-5 border-t border-slate-200/60 flex flex-wrap items-center gap-2">
            {CATEGORIES.map((cat) => (
              <Link
                key={cat.id}
                href={`/explore?category=${cat.id}`}
                className="px-3.5 py-2 rounded-xl bg-slate-100/80 hover:bg-blue-50 hover:text-blue-700 text-xs font-medium text-slate-700 transition-colors whitespace-nowrap shrink-0"
              >
                {cat.name}
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* 2. POPULAR ON SELPLASE (FEATURED PRODUCTS & SERVICES) */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6">
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-950 font-display">
              Popular on Selplase
            </h2>
            <p className="text-sm text-slate-600 mt-1">
              Discover featured products and trusted professional services across
              Nigeria.
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* Functional Segmented Filter */}
            <div className="flex items-center gap-1 p-1 bg-slate-200/70 rounded-xl">
              <button
                type="button"
                onClick={() => setActiveQuickTab('all')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                  activeQuickTab === 'all'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                All
              </button>
              <button
                type="button"
                onClick={() => setActiveQuickTab('product')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                  activeQuickTab === 'product'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Products
              </button>
              <button
                type="button"
                onClick={() => setActiveQuickTab('service')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                  activeQuickTab === 'service'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Services
              </button>
            </div>

            <Link
              href="/explore"
              className="text-sm font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1 whitespace-nowrap shrink-0"
            >
              View All
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {featuredListings.map((listing) => (
            <ListingCard key={listing.id} listing={listing} />
          ))}
        </div>
      </section>

      {/* 3. BUYER REQUESTS & POPULAR NIGERIAN LOCATIONS */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Buyer Requests Column */}
          <div className="lg:col-span-7 space-y-5">
            <div className="flex items-end justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold text-slate-950 font-display">
                  Can&apos;t Find It? Buyers Are Requesting These
                </h2>
                <p className="text-sm text-slate-600 mt-1">
                  Have what a buyer needs? Click &ldquo;I Have This&rdquo; to
                  send your price and connect on WhatsApp.
                </p>
              </div>
              <Link
                href="/requests"
                className="text-sm font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1 whitespace-nowrap shrink-0"
              >
                All Requests
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              {recentRequests.map((req) => (
                <RequestCard key={req.id} request={req} />
              ))}
            </div>
          </div>

          {/* Popular Nigerian Locations Column */}
          <div className="lg:col-span-5 rounded-3xl bg-white/80 backdrop-blur-xl border border-slate-200/80 p-6 shadow-[0_8px_30px_rgba(15,23,42,0.04)]">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-xl font-bold text-slate-950 font-display">
                  Popular Nigerian Hubs
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Browse products and services near your city
                </p>
              </div>
              <MapPin className="w-5 h-5 text-blue-600" />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {POPULAR_LOCATIONS.map((loc) => (
                <Link
                  key={loc.id}
                  href={`/explore?state=${encodeURIComponent(loc.state)}`}
                  className="group rounded-2xl bg-slate-50/90 hover:bg-blue-50/70 border border-slate-200/70 hover:border-blue-200 p-3.5 transition-all flex flex-col justify-between"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-slate-900 group-hover:text-blue-700">
                      {loc.city}
                    </span>
                    <span className="text-xs font-mono text-slate-500 tabular-nums">
                      {loc.listingCount} ads
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1 truncate">
                    {loc.state} · {loc.area}
                  </p>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* 4. TRUST & SAFETY MESSAGING STRIP (MATCHING REFERENCE DESIGN) */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-2 pb-8">
        <div className="rounded-3xl bg-white/80 backdrop-blur-2xl border border-white/90 shadow-[0_8px_32px_rgba(37,99,235,0.06)] px-6 py-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 divide-y sm:divide-y-0 sm:divide-x divide-slate-200/70">
          <div className="flex items-center gap-3.5 pt-2 sm:pt-0">
            <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Safe & Secure</h3>
              <p className="text-xs text-slate-500">
                Inspect items in person before paying
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3.5 pt-4 sm:pt-0 sm:pl-6">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Built for Nigeria
              </h3>
              <p className="text-xs text-slate-500">
                Lagos, Abuja, Port Harcourt & nationwide
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3.5 pt-4 sm:pt-0 lg:pl-6">
            <div className="w-10 h-10 rounded-2xl bg-violet-50 text-violet-600 flex items-center justify-center shrink-0">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Fast & Easy</h3>
              <p className="text-xs text-slate-500">
                Post a listing or buyer request in 60s
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3.5 pt-4 sm:pt-0 sm:pl-6">
            <div className="w-10 h-10 rounded-2xl bg-sky-50 text-sky-600 flex items-center justify-center shrink-0">
              <Headphones className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                WhatsApp Ready
              </h3>
              <p className="text-xs text-slate-500">
                Share links & connect directly with sellers
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
