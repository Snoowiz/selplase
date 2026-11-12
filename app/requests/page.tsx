'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  HandHeart,
  PlusSquare,
  RotateCcw,
  Search,
} from 'lucide-react';
import { useMarketplace } from '@/context/MarketplaceContext';
import { CATEGORIES, NIGERIAN_STATES } from '@/lib/data/mock-marketplace';
import { filterBuyerRequests, formatNaira } from '@/lib/utils/formatters';
import type { CategorySlug, ListingType } from '@/lib/types/marketplace';
import { RequestCard } from '@/components/marketplace/RequestCard';

export default function BuyerRequestsPage() {
  const { buyerRequests, sellerOffers } = useMarketplace();

  const [query, setQuery] = useState('');
  const [requestType, setRequestType] = useState<'all' | ListingType>('all');
  const [category, setCategory] = useState<'all' | CategorySlug>('all');
  const [stateFilter, setStateFilter] = useState('all');

  const filtered = filterBuyerRequests(buyerRequests, {
    query,
    requestType,
    category,
    state: stateFilter,
  });

  const handleReset = () => {
    setQuery('');
    setRequestType('all');
    setCategory('all');
    setStateFilter('all');
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header Banner */}
      <div className="rounded-3xl bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 text-white p-6 sm:p-8 mb-8 shadow-[0_16px_40px_rgba(37,99,235,0.20)] flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="max-w-2xl space-y-2">
          <p className="text-xs font-semibold text-blue-100 uppercase tracking-wider">
            Selplase Reverse Marketplace
          </p>
          <h1 className="text-2xl sm:text-3xl font-extrabold font-display">
            Buyer Requests — Connect With Ready Buyers
          </h1>
          <p className="text-sm text-blue-100 leading-relaxed">
            Browse real-time requests from people across Nigeria looking for
            specific products or services. Click{' '}
            <strong className="text-white">&ldquo;I Have This&rdquo;</strong> to
            send your Naira offer and chat on WhatsApp.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 shrink-0">
          <Link
            href="/requests/new"
            className="px-5 py-3 rounded-2xl bg-white text-blue-700 hover:bg-blue-50 text-xs sm:text-sm font-bold shadow-md flex items-center gap-2 transition-colors whitespace-nowrap"
          >
            <PlusSquare className="w-4 h-4" />
            Post What You Need
          </Link>
        </div>
      </div>

      {/* Filter Bar */}
      <section
        aria-label="Filter Buyer Requests"
        className="rounded-3xl bg-white/85 backdrop-blur-xl border border-slate-200/80 p-5 mb-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3"
      >
        <div className="lg:col-span-4 relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <label htmlFor="requests-search-input" className="sr-only">
            Search buyer requests
          </label>
          <input
            id="requests-search-input"
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search buyer requests (e.g. Nike Air Force, iPhone 14, UI/UX)..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm text-slate-900 focus:outline-none focus:bg-white focus:border-blue-600"
          />
        </div>

        <div className="lg:col-span-3 flex items-center bg-slate-100 p-1 rounded-xl">
          <button
            type="button"
            onClick={() => setRequestType('all')}
            className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
              requestType === 'all'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600'
            }`}
          >
            All ({buyerRequests.length})
          </button>
          <button
            type="button"
            onClick={() => setRequestType('product')}
            className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
              requestType === 'product'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600'
            }`}
          >
            Products
          </button>
          <button
            type="button"
            onClick={() => setRequestType('service')}
            className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
              requestType === 'service'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600'
            }`}
          >
            Services
          </button>
        </div>

        <div className="lg:col-span-2">
          <label htmlFor="requests-category-select" className="sr-only">
            Filter by category
          </label>
          <select
            id="requests-category-select"
            value={category}
            onChange={(e) => setCategory(e.target.value as 'all' | CategorySlug)}
            className="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-medium text-slate-800 focus:outline-none focus:border-blue-600"
          >
            <option value="all">All Categories</option>
            {CATEGORIES.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </select>
        </div>

        <div className="lg:col-span-3 flex items-center gap-2">
          <label htmlFor="requests-state-select" className="sr-only">
            Filter by Nigerian state
          </label>
          <select
            id="requests-state-select"
            value={stateFilter}
            onChange={(e) => setStateFilter(e.target.value)}
            className="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-medium text-slate-800 focus:outline-none focus:border-blue-600"
          >
            <option value="all">All Nigerian States</option>
            {NIGERIAN_STATES.map((st) => (
              <option key={st} value={st}>
                {st}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={handleReset}
            aria-label="Reset request filters"
            className="p-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors cursor-pointer shrink-0"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </section>

      {/* Recently Submitted "I Have This" Seller Offers Banner (if user submitted any in session) */}
      {sellerOffers.length > 0 && (
        <div className="mb-8 rounded-2xl bg-emerald-50/90 border border-emerald-200 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 text-xs text-emerald-900">
            <HandHeart className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>
              You have responded to{' '}
              <strong>{sellerOffers.length}</strong> buyer{' '}
              {sellerOffers.length === 1 ? 'request' : 'requests'} in this
              session (Latest offer:{' '}
              <span className="font-mono font-bold">
                {formatNaira(sellerOffers[0].offeredPriceNaira)}
              </span>{' '}
              for {sellerOffers[0].requestTitle}).
            </span>
          </div>
          <Link
            href="/account"
            className="text-xs font-semibold text-emerald-800 hover:underline whitespace-nowrap"
          >
            View in Seller Dashboard →
          </Link>
        </div>
      )}

      {/* Buyer Requests Grid */}
      {filtered.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filtered.map((req) => (
            <div key={req.id} id={req.id}>
              <RequestCard request={req} />
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-3xl bg-white/85 backdrop-blur-xl border border-slate-200/80 p-12 text-center max-w-xl mx-auto">
          <h2 className="text-lg font-bold text-slate-900">
            No matching buyer requests
          </h2>
          <p className="text-sm text-slate-600 mt-1.5">
            Try clearing your filters or post a new buyer request for what you
            need.
          </p>
          <div className="mt-5 flex items-center justify-center gap-3">
            <button
              type="button"
              onClick={handleReset}
              className="px-4 py-2.5 rounded-xl bg-slate-900 text-white text-xs font-semibold cursor-pointer"
            >
              Reset Filters
            </button>
            <Link
              href="/requests/new"
              className="px-4 py-2.5 rounded-xl bg-blue-600 text-white text-xs font-semibold"
            >
              Create Request
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
