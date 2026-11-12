'use client';

import React from 'react';
import Link from 'next/link';
import { Heart, MapPin, Share2 } from 'lucide-react';
import type { Listing } from '@/lib/types/marketplace';
import { formatNaira } from '@/lib/utils/formatters';
import { useMarketplace } from '@/context/MarketplaceContext';
import { ProductVisual } from './ProductVisual';

interface ListingCardProps {
  listing: Listing;
}

export function ListingCard({ listing }: ListingCardProps) {
  const { savedListingIds, toggleSavedListing, openShareModal } = useMarketplace();
  const isSaved = savedListingIds.includes(listing.id);

  const priceDisplay =
    listing.type === 'service'
      ? `From ${formatNaira(listing.priceNaira)}`
      : formatNaira(listing.priceNaira);

  return (
    <article className="group relative bg-white/85 backdrop-blur-xl rounded-2xl border border-slate-200/80 shadow-[0_8px_30px_rgba(15,23,42,0.04)] hover:shadow-[0_16px_40px_rgba(37,99,235,0.10)] hover:-translate-y-0.5 transition-all duration-200 flex flex-col overflow-hidden">
      {/* Top Visual Area */}
      <div className="relative h-48 w-full overflow-hidden">
        <Link
          href={`/listings/${listing.id}`}
          className="block w-full h-full focus:outline-none"
          aria-label={`View details for ${listing.title}`}
        >
          <ProductVisual listing={listing} className="w-full h-full" />
        </Link>

        {/* Top-Right Action Controls: Save & WhatsApp Share */}
        <div className="absolute top-3 right-3 z-20 flex items-center gap-1.5">
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              openShareModal({
                title: listing.title,
                priceText: priceDisplay,
                location: `${listing.area}, ${listing.state}`,
                path: `/listings/${listing.id}`,
                type: listing.type,
              });
            }}
            aria-label={`Share ${listing.title} on WhatsApp`}
            className="w-8 h-8 rounded-full bg-white/90 backdrop-blur-md border border-slate-200/80 text-slate-700 hover:text-blue-600 hover:bg-white shadow-sm flex items-center justify-center transition-colors cursor-pointer"
          >
            <Share2 className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              toggleSavedListing(listing.id);
            }}
            aria-label={
              isSaved
                ? `Remove ${listing.title} from saved items`
                : `Save ${listing.title}`
            }
            className={`w-8 h-8 rounded-full backdrop-blur-md border shadow-sm flex items-center justify-center transition-colors cursor-pointer ${
              isSaved
                ? 'bg-rose-50 border-rose-200 text-rose-600'
                : 'bg-white/90 border-slate-200/80 text-slate-700 hover:text-rose-600 hover:bg-white'
            }`}
          >
            <Heart className={`w-4 h-4 ${isSaved ? 'fill-rose-500' : ''}`} />
          </button>
        </div>
      </div>

      {/* Card Body */}
      <div className="p-4 flex-1 flex flex-col justify-between">
        <div>
          {/* Unboxed Metadata Line */}
          <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-1.5">
            <span className="font-medium text-blue-700">
              {listing.type === 'service' ? 'Service' : 'Product'}
            </span>
            <span aria-hidden="true">·</span>
            <span className="truncate">{listing.categoryLabel}</span>
            {listing.featured && (
              <>
                <span aria-hidden="true">·</span>
                <span className="text-indigo-600 font-medium">Featured</span>
              </>
            )}
          </div>

          <Link
            href={`/listings/${listing.id}`}
            className="block group-hover:text-blue-600 transition-colors"
          >
            <h3 className="text-base font-semibold text-slate-900 line-clamp-1">
              {listing.title}
            </h3>
          </Link>

          <p className="mt-1.5 text-lg font-bold text-blue-600 font-mono tabular-nums">
            {priceDisplay}
          </p>
        </div>

        <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center gap-1 truncate">
            <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span className="truncate">
              {listing.area}, {listing.state}
            </span>
          </div>
          <span className="text-slate-400 shrink-0 ml-2">
            {listing.type === 'service' ? 'Verified Pro (Demo)' : listing.condition.split(' ')[0]}
          </span>
        </div>
      </div>
    </article>
  );
}
