'use client';

import React from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  Heart,
  MapPin,
  MessageCircle,
  Share2,
  ShieldCheck,
  Sparkles,
  Store,
  Tag,
} from 'lucide-react';
import { useMarketplace } from '@/context/MarketplaceContext';
import { formatNaira } from '@/lib/utils/formatters';
import { ProductVisual } from './ProductVisual';
import { ListingCard } from './ListingCard';

interface ListingDetailClientProps {
  listingId: string;
}

export function ListingDetailClient({ listingId }: ListingDetailClientProps) {
  const {
    listings,
    savedListingIds,
    toggleSavedListing,
    openShareModal,
    openContactModal,
  } = useMarketplace();

  const listing = listings.find(
    (item) => item.id === listingId || item.slug === listingId
  );

  if (!listing) {
    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-16 text-center">
        <div className="rounded-3xl bg-white/90 backdrop-blur-xl border border-slate-200 p-10">
          <h1 className="text-2xl font-bold text-slate-900 font-display">
            Listing Not Found
          </h1>
          <p className="text-sm text-slate-600 mt-2">
            This listing may have been removed or the URL is incorrect.
          </p>
          <div className="mt-6 flex items-center justify-center gap-3">
            <Link
              href="/explore"
              className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold transition-colors"
            >
              Browse Marketplace
            </Link>
            <Link
              href="/requests/new"
              className="px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold transition-colors"
            >
              Request This Item
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const isSaved = savedListingIds.includes(listing.id);
  const priceDisplay =
    listing.type === 'service'
      ? `From ${formatNaira(listing.priceNaira)}`
      : formatNaira(listing.priceNaira);

  const relatedListings = listings
    .filter((l) => l.id !== listing.id && l.category === listing.category)
    .slice(0, 4);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Breadcrumb & Back Link */}
      <div className="flex items-center justify-between gap-4 mb-6">
        <Link
          href="/explore"
          className="inline-flex items-center gap-2 text-xs sm:text-sm font-semibold text-slate-600 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Marketplace
        </Link>

        <div className="text-xs text-slate-500">
          <span>Demonstration Listing</span>
          <span aria-hidden="true" className="mx-1.5">
            ·
          </span>
          <span className="font-mono">{listing.id}</span>
        </div>
      </div>

      {/* Main Contiguous 2-Column Product/Service Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Large Product Visual & Description */}
        <div className="lg:col-span-7 space-y-6">
          <div className="rounded-3xl bg-white/90 backdrop-blur-xl border border-slate-200/80 shadow-[0_12px_36px_rgba(15,23,42,0.05)] overflow-hidden">
            <ProductVisual
              listing={listing}
              className="w-full h-80 sm:h-[420px]"
            />
          </div>

          {/* Detailed Description & Highlights */}
          <div className="rounded-3xl bg-white/85 backdrop-blur-xl border border-slate-200/80 p-6 sm:p-8 space-y-6">
            <div>
              <h2 className="text-lg font-bold text-slate-900 font-display">
                {listing.type === 'service'
                  ? 'Service Overview & Deliverables'
                  : 'Product Description & Specifications'}
              </h2>
              <p className="mt-3 text-sm sm:text-base text-slate-600 leading-relaxed">
                {listing.description}
              </p>
            </div>

            {listing.highlights && listing.highlights.length > 0 && (
              <div className="pt-5 border-t border-slate-100">
                <h3 className="text-sm font-semibold text-slate-900 mb-3">
                  Key Highlights
                </h3>
                <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {listing.highlights.map((point, idx) => (
                    <li
                      key={idx}
                      className="flex items-start gap-2 text-xs sm:text-sm text-slate-700"
                    >
                      <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                      <span>{point}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Open Graph / WhatsApp Preview Ready Notice */}
            <div className="pt-5 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-500">
              <span>
                Open Graph link metadata prepared for rich WhatsApp link previews.
              </span>
              <button
                type="button"
                onClick={() =>
                  openShareModal({
                    title: listing.title,
                    priceText: priceDisplay,
                    location: `${listing.area}, ${listing.state}`,
                    path: `/listings/${listing.id}`,
                    type: listing.type,
                  })
                }
                className="text-blue-600 hover:text-blue-700 font-semibold inline-flex items-center gap-1.5 cursor-pointer"
              >
                <Share2 className="w-3.5 h-3.5" />
                Preview WhatsApp Share Link
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Sticky Contiguous Purchase / Contact & Seller Module */}
        <div className="lg:col-span-5 space-y-6 lg:sticky lg:top-20">
          <div className="rounded-3xl bg-white/90 backdrop-blur-2xl border border-slate-200/80 shadow-[0_12px_40px_rgba(37,99,235,0.07)] p-6 sm:p-7 space-y-5">
            {/* Clear Indication of Product vs Service */}
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-xs font-semibold">
                {listing.type === 'service' ? (
                  <span className="inline-flex items-center gap-1.5 text-indigo-700">
                    <Sparkles className="w-4 h-4" />
                    PROFESSIONAL SERVICE LISTING
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 text-blue-700">
                    <Tag className="w-4 h-4" />
                    PHYSICAL PRODUCT FOR SALE
                  </span>
                )}
              </div>

              <button
                type="button"
                onClick={() => toggleSavedListing(listing.id)}
                aria-label={isSaved ? 'Remove from saved' : 'Save listing'}
                className={`px-3 py-1.5 rounded-xl border text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer ${
                  isSaved
                    ? 'bg-rose-50 border-rose-200 text-rose-600'
                    : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                }`}
              >
                <Heart
                  className={`w-3.5 h-3.5 ${isSaved ? 'fill-rose-500' : ''}`}
                />
                {isSaved ? 'Saved' : 'Save'}
              </button>
            </div>

            {/* Listing Title & Price in Nigerian Naira */}
            <div>
              <h1 className="text-xl sm:text-2xl font-extrabold text-slate-950 font-display leading-snug">
                {listing.title}
              </h1>

              <div className="mt-3 flex items-baseline gap-3">
                <span className="text-2xl sm:text-3xl font-extrabold text-blue-600 font-mono tabular-nums">
                  {priceDisplay}
                </span>
                {listing.priceNote && (
                  <span className="text-xs font-medium text-slate-500">
                    · {listing.priceNote}
                  </span>
                )}
              </div>
            </div>

            {/* Key Attributes Grid */}
            <div className="grid grid-cols-2 gap-3 py-4 border-y border-slate-100 text-xs">
              <div>
                <p className="text-slate-400">Category</p>
                <p className="font-semibold text-slate-900 mt-0.5">
                  {listing.categoryLabel}
                </p>
              </div>
              <div>
                <p className="text-slate-400">
                  {listing.type === 'service' ? 'Service Type' : 'Condition'}
                </p>
                <p className="font-semibold text-slate-900 mt-0.5">
                  {listing.condition}
                </p>
              </div>
              <div>
                <p className="text-slate-400">State</p>
                <p className="font-semibold text-slate-900 mt-0.5 flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                  {listing.state}
                </p>
              </div>
              <div>
                <p className="text-slate-400">City / Inspection Area</p>
                <p className="font-semibold text-slate-900 mt-0.5">
                  {listing.area !== listing.city
                    ? `${listing.area}, ${listing.city}`
                    : listing.area}
                </p>
              </div>
            </div>

            {/* Primary Actions: Contact Seller (WhatsApp, Call, or Message) & Share to WhatsApp */}
            <div className="space-y-2.5">
              <button
                type="button"
                onClick={() => openContactModal(listing)}
                className="w-full py-3.5 px-5 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold shadow-[0_8px_24px_rgba(37,99,235,0.25)] flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <MessageCircle className="w-4 h-4" />
                Contact Seller (WhatsApp · Call · Message)
              </button>

              <button
                type="button"
                onClick={() =>
                  openShareModal({
                    title: listing.title,
                    priceText: priceDisplay,
                    location: `${listing.area}, ${listing.state}`,
                    path: `/listings/${listing.id}`,
                    type: listing.type,
                  })
                }
                className="w-full py-3 px-5 rounded-2xl bg-[#ECFDF5] hover:bg-[#D1FAE5] border border-emerald-200 text-emerald-900 text-sm font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <Share2 className="w-4 h-4 text-emerald-700" />
                Share to WhatsApp
              </button>
            </div>

            {/* Seller Information Card */}
            <div className="pt-4 border-t border-slate-100">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold text-slate-500">
                  Seller Information (Demo Profile)
                </span>
                <Link
                  href={`/account?tab=seller-profile&seller=${encodeURIComponent(
                    listing.seller.id
                  )}`}
                  className="text-xs font-semibold text-blue-600 hover:text-blue-700"
                >
                  View Seller Profile →
                </Link>
              </div>

              <div className="rounded-2xl bg-slate-50/90 border border-slate-200/70 p-4 space-y-3">
                <div className="flex items-center gap-3">
                  <div
                    className="w-11 h-11 rounded-2xl text-white font-bold text-sm flex items-center justify-center shrink-0"
                    style={{ backgroundColor: listing.seller.avatarColor }}
                  >
                    {listing.seller.initials}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-slate-900 truncate">
                      {listing.seller.fullName}
                    </p>
                    {listing.seller.businessName && (
                      <p className="text-xs text-slate-600 flex items-center gap-1 truncate">
                        <Store className="w-3 h-3 text-slate-400 shrink-0" />
                        {listing.seller.businessName}
                      </p>
                    )}
                  </div>
                </div>

                <div className="text-xs text-slate-500 space-y-1">
                  <p className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    {listing.seller.responseTime}
                  </p>
                  <p>
                    Joined {listing.seller.joinedDate} ·{' '}
                    {listing.seller.totalListings} active listings
                  </p>
                </div>
              </div>
            </div>

            {/* Safety Messaging */}
            <div className="rounded-2xl bg-slate-50 p-3.5 flex items-start gap-2.5 text-xs text-slate-600">
              <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
              <p className="leading-relaxed">
                <strong>Safe Trading Tip:</strong> Meet the seller in a well-lit
                public place in {listing.city} to inspect and test before
                making payment.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Related Listings */}
      {relatedListings.length > 0 && (
        <section className="mt-14 pt-10 border-t border-slate-200/70">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-slate-950 font-display">
              Similar Listings in {listing.categoryLabel}
            </h2>
            <Link
              href={`/explore?category=${listing.category}`}
              className="text-xs font-semibold text-blue-600 hover:text-blue-700"
            >
              See more
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {relatedListings.map((item) => (
              <ListingCard key={item.id} listing={item} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
