'use client';

import React, { Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  Filter,
  PlusSquare,
  RotateCcw,
  Search,
  SlidersHorizontal,
} from 'lucide-react';
import { useMarketplace } from '@/context/MarketplaceContext';
import {
  CATEGORIES,
  NIGERIAN_STATES,
  PRODUCT_CONDITIONS,
} from '@/lib/data/mock-marketplace';
import { filterListings } from '@/lib/utils/formatters';
import type {
  CategorySlug,
  ListingFilterParams,
  ListingType,
  ProductCondition,
} from '@/lib/types/marketplace';
import { ListingCard } from '@/components/marketplace/ListingCard';

function ExploreMarketplaceInner({
  initialQuery,
  initialType,
  initialCategory,
  initialState,
}: {
  initialQuery: string;
  initialType: 'all' | ListingType;
  initialCategory: 'all' | CategorySlug;
  initialState: string;
}) {
  const { listings } = useMarketplace();

  const [query, setQuery] = useState(initialQuery);
  const [type, setType] = useState<'all' | ListingType>(initialType);
  const [category, setCategory] = useState<'all' | CategorySlug>(
    initialCategory
  );
  const [stateFilter, setStateFilter] = useState(initialState);
  const [condition, setCondition] = useState<'all' | ProductCondition>('all');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [sortBy, setSortBy] =
    useState<ListingFilterParams['sortBy']>('featured');

  const filteredListings = filterListings(listings, {
    query,
    type,
    category,
    state: stateFilter,
    condition,
    minPrice: minPrice ? Number(minPrice) : undefined,
    maxPrice: maxPrice ? Number(maxPrice) : undefined,
    sortBy,
  });

  const handleResetFilters = () => {
    setQuery('');
    setType('all');
    setCategory('all');
    setStateFilter('all');
    setCondition('all');
    setMinPrice('');
    setMaxPrice('');
    setSortBy('featured');
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6">
        <div>
          <p className="text-xs font-semibold text-blue-600">
            Selplase Marketplace Directory
          </p>
          <h1 className="text-3xl font-extrabold text-slate-950 font-display mt-1">
            Explore Products & Services
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            Filter by Nigerian state, category, condition, or Naira price range.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/requests/new"
            className="px-4 py-2.5 rounded-xl bg-white border border-slate-200 hover:border-blue-300 text-xs font-semibold text-slate-700 hover:text-blue-600 flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0"
          >
            <PlusSquare className="w-4 h-4 text-blue-600" />
            Can&apos;t find it? Post a Request
          </Link>
        </div>
      </div>

      {/* Liquid-Glass Filter Control Panel */}
      <section
        aria-label="Marketplace Filters"
        className="rounded-3xl bg-white/85 backdrop-blur-2xl border border-slate-200/80 shadow-[0_8px_30px_rgba(15,23,42,0.04)] p-5 mb-8 space-y-4"
      >
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
          {/* Keyword Search */}
          <div className="md:col-span-5 relative">
            <label htmlFor="explore-keyword-input" className="sr-only">
              Keyword search
            </label>
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              id="explore-keyword-input"
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search keyword (e.g. iPhone 16, MacBook, Inverter, Web Design)..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-blue-600"
            />
          </div>

          {/* Listing Type Segmented Control */}
          <div className="md:col-span-4 flex items-center bg-slate-100 p-1 rounded-xl">
            <button
              type="button"
              onClick={() => setType('all')}
              className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-colors cursor-pointer whitespace-nowrap ${
                type === 'all'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All ({listings.length})
            </button>
            <button
              type="button"
              onClick={() => setType('product')}
              className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-colors cursor-pointer whitespace-nowrap ${
                type === 'product'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Products
            </button>
            <button
              type="button"
              onClick={() => setType('service')}
              className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-colors cursor-pointer whitespace-nowrap ${
                type === 'service'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Services
            </button>
          </div>

          {/* Sort By */}
          <div className="md:col-span-3">
            <label htmlFor="explore-sort-select" className="sr-only">
              Sort listings
            </label>
            <select
              id="explore-sort-select"
              value={sortBy}
              onChange={(e) =>
                setSortBy(e.target.value as ListingFilterParams['sortBy'])
              }
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm text-slate-800 focus:outline-none focus:border-blue-600"
            >
              <option value="featured">Sort: Featured First</option>
              <option value="newest">Sort: Newest Listed</option>
              <option value="price-asc">Price: Low to High (₦)</option>
              <option value="price-desc">Price: High to Low (₦)</option>
            </select>
          </div>
        </div>

        {/* Second Row: Category, Location (Nigerian State), Condition, Min/Max Price */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 pt-2 border-t border-slate-100">
          <div>
            <label
              htmlFor="explore-category-select"
              className="block text-[11px] font-medium text-slate-500 mb-1"
            >
              Category
            </label>
            <select
              id="explore-category-select"
              value={category}
              onChange={(e) =>
                setCategory(e.target.value as 'all' | CategorySlug)
              }
              className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs font-medium text-slate-800 focus:outline-none focus:border-blue-600"
            >
              <option value="all">All Categories</option>
              {CATEGORIES.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="explore-location-select"
              className="block text-[11px] font-medium text-slate-500 mb-1"
            >
              Nigerian Location
            </label>
            <select
              id="explore-location-select"
              value={stateFilter}
              onChange={(e) => setStateFilter(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs font-medium text-slate-800 focus:outline-none focus:border-blue-600"
            >
              <option value="all">All Nigerian States</option>
              {NIGERIAN_STATES.map((st) => (
                <option key={st} value={st}>
                  {st}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="explore-condition-select"
              className="block text-[11px] font-medium text-slate-500 mb-1"
            >
              Condition
            </label>
            <select
              id="explore-condition-select"
              value={condition}
              onChange={(e) =>
                setCondition(e.target.value as 'all' | ProductCondition)
              }
              className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs font-medium text-slate-800 focus:outline-none focus:border-blue-600"
            >
              <option value="all">Any Condition</option>
              {PRODUCT_CONDITIONS.map((cond) => (
                <option key={cond} value={cond}>
                  {cond}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="explore-min-price"
              className="block text-[11px] font-medium text-slate-500 mb-1"
            >
              Min Price (₦)
            </label>
            <input
              id="explore-min-price"
              type="number"
              value={minPrice}
              onChange={(e) => setMinPrice(e.target.value)}
              placeholder="e.g. 50000"
              className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs font-mono text-slate-800 focus:outline-none focus:border-blue-600"
            />
          </div>

          <div>
            <label
              htmlFor="explore-max-price"
              className="block text-[11px] font-medium text-slate-500 mb-1"
            >
              Max Price (₦)
            </label>
            <div className="flex items-center gap-2">
              <input
                id="explore-max-price"
                type="number"
                value={maxPrice}
                onChange={(e) => setMaxPrice(e.target.value)}
                placeholder="e.g. 1500000"
                className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs font-mono text-slate-800 focus:outline-none focus:border-blue-600"
              />
              <button
                type="button"
                onClick={handleResetFilters}
                aria-label="Reset all filters"
                title="Reset all filters"
                className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors shrink-0 cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Results Count & Active State Bar */}
      <div className="flex items-center justify-between mb-5 text-xs text-slate-600">
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="w-3.5 h-3.5 text-blue-600" />
          <span>
            Showing{' '}
            <strong className="font-semibold text-slate-900 font-mono tabular-nums">
              {filteredListings.length}
            </strong>{' '}
            {filteredListings.length === 1 ? 'listing' : 'listings'}
          </span>
        </div>

        {(query ||
          type !== 'all' ||
          category !== 'all' ||
          stateFilter !== 'all' ||
          condition !== 'all' ||
          minPrice ||
          maxPrice) && (
          <button
            type="button"
            onClick={handleResetFilters}
            className="text-blue-600 hover:text-blue-700 font-semibold cursor-pointer"
          >
            Clear active filters
          </button>
        )}
      </div>

      {/* Results Grid or Friendly Empty State */}
      {filteredListings.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {filteredListings.map((item) => (
            <ListingCard key={item.id} listing={item} />
          ))}
        </div>
      ) : (
        <div className="rounded-3xl bg-white/85 backdrop-blur-xl border border-slate-200/80 p-12 text-center max-w-xl mx-auto my-6">
          <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto mb-4">
            <Filter className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-bold text-slate-900">
            No matching listings found
          </h2>
          <p className="text-sm text-slate-600 mt-1.5 leading-relaxed">
            We couldn&apos;t find any products or services matching your exact
            filter combination. Reset your filters or post a Buyer Request so
            sellers in Nigeria can reach out to you.
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              onClick={handleResetFilters}
              className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold transition-colors cursor-pointer"
            >
              Reset All Filters
            </button>
            <Link
              href="/requests/new"
              className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold transition-colors"
            >
              Post a Buyer Request Instead
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

function ExploreMarketplaceContent() {
  const searchParams = useSearchParams();
  return (
    <ExploreMarketplaceInner
      key={searchParams.toString()}
      initialQuery={searchParams.get('query') || ''}
      initialType={
        (searchParams.get('type') as 'all' | ListingType) || 'all'
      }
      initialCategory={
        (searchParams.get('category') as 'all' | CategorySlug) || 'all'
      }
      initialState={searchParams.get('state') || 'all'}
    />
  );
}

export default function ExplorePage() {
  return (
    <Suspense
      fallback={
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="h-10 w-64 rounded-xl bg-slate-200/70 animate-pulse mb-6" />
          <div className="h-36 w-full rounded-3xl bg-white/80 animate-pulse mb-8" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map((n) => (
              <div
                key={n}
                className="h-72 rounded-2xl bg-white/80 animate-pulse"
              />
            ))}
          </div>
        </div>
      }
    >
      <ExploreMarketplaceContent />
    </Suspense>
  );
}
