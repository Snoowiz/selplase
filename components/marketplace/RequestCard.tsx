'use client';

import React from 'react';
import { HandHeart, MapPin, Share2 } from 'lucide-react';
import type { BuyerRequest } from '@/lib/types/marketplace';
import { formatBudgetRange } from '@/lib/utils/formatters';
import { useMarketplace } from '@/context/MarketplaceContext';

interface RequestCardProps {
  request: BuyerRequest;
  compact?: boolean;
}

export function RequestCard({ request, compact = false }: RequestCardProps) {
  const { openHaveThisModal, openShareModal } = useMarketplace();
  const budgetText = formatBudgetRange(
    request.budgetMinNaira,
    request.budgetMaxNaira
  );

  return (
    <article className="bg-white/85 backdrop-blur-xl rounded-2xl border border-slate-200/80 shadow-[0_8px_30px_rgba(15,23,42,0.04)] hover:shadow-[0_16px_40px_rgba(37,99,235,0.09)] transition-all duration-200 p-5 flex flex-col justify-between">
      <div>
        {/* Metadata Header */}
        <div className="flex items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <span className="font-semibold text-amber-700">Buyer Request</span>
            <span aria-hidden="true">·</span>
            <span>{request.categoryLabel}</span>
            <span aria-hidden="true">·</span>
            <span>{request.urgency}</span>
          </div>

          <button
            type="button"
            onClick={() =>
              openShareModal({
                title: request.title,
                priceText: budgetText,
                location: `${request.area}, ${request.state}`,
                path: `/requests#${request.id}`,
                type: 'request',
              })
            }
            aria-label={`Share buyer request ${request.title} on WhatsApp`}
            className="w-8 h-8 rounded-full bg-slate-100/80 hover:bg-blue-50 text-slate-600 hover:text-blue-600 flex items-center justify-center transition-colors cursor-pointer shrink-0"
          >
            <Share2 className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Title */}
        <h3 className="text-base font-semibold text-slate-900 leading-snug">
          {request.title}
        </h3>

        {/* Budget in Naira */}
        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-xs text-slate-500">Budget:</span>
          <span className="text-base font-bold text-blue-600 font-mono tabular-nums">
            {budgetText}
          </span>
        </div>

        {!compact && (
          <p className="mt-2.5 text-sm text-slate-600 line-clamp-2 leading-relaxed">
            {request.description}
          </p>
        )}

        {/* Buyer & Location Info */}
        <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
          <span className="inline-flex items-center gap-1">
            <MapPin className="w-3.5 h-3.5 text-slate-400" />
            {request.city}, {request.state}
          </span>
          <span aria-hidden="true">·</span>
          <span>Condition: {request.preferredCondition}</span>
          <span aria-hidden="true">·</span>
          <span>{request.offersCount} seller responses</span>
        </div>
      </div>

      {/* Prominent "I Have This" Seller Action */}
      <div className="mt-4 pt-3.5 border-t border-slate-100 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-7 h-7 rounded-full bg-blue-100 text-blue-700 text-xs font-bold flex items-center justify-center shrink-0">
            {request.buyerInitials}
          </div>
          <span className="text-xs font-medium text-slate-700 truncate">
            {request.buyerName}
          </span>
        </div>

        <button
          type="button"
          onClick={() => openHaveThisModal(request)}
          className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-sm hover:shadow transition-all flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
        >
          <HandHeart className="w-3.5 h-3.5" />
          I Have This
        </button>
      </div>
    </article>
  );
}
