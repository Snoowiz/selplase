'use client';

import React, { useState } from 'react';
import { Check, Copy, ExternalLink, MessageCircle, Share2, X } from 'lucide-react';
import { useMarketplace } from '@/context/MarketplaceContext';
import { buildWhatsAppShareUrl } from '@/lib/utils/formatters';

export function ShareModal() {
  const { activeShareTarget, closeShareModal } = useMarketplace();
  const [copied, setCopied] = useState(false);

  if (!activeShareTarget) return null;

  const origin =
    typeof window !== 'undefined' ? window.location.origin : 'https://selplase.ng';
  const fullUrl = `${origin}${activeShareTarget.path}`;

  const whatsappUrl = buildWhatsAppShareUrl({
    title: activeShareTarget.title,
    priceText: activeShareTarget.priceText,
    location: activeShareTarget.location,
    url: fullUrl,
    type: activeShareTarget.type,
  });

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(fullUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-150"
      role="dialog"
      aria-modal="true"
      aria-labelledby="share-modal-title"
    >
      <div className="w-full max-w-md rounded-3xl bg-white/95 backdrop-blur-2xl border border-white/80 shadow-2xl p-6 relative">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Share2 className="w-4 h-4" />
            </div>
            <div>
              <h2
                id="share-modal-title"
                className="text-base font-bold text-slate-900"
              >
                Share on WhatsApp
              </h2>
              <p className="text-xs text-slate-500">
                Open Graph link preview ready for WhatsApp chats
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={closeShareModal}
            aria-label="Close share dialog"
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Simulated WhatsApp Open Graph Link Card Preview */}
        <div className="mt-4 rounded-2xl bg-[#ECFDF5]/80 border border-emerald-200/80 p-4">
          <span className="text-[11px] font-medium text-emerald-800 block mb-2">
            WhatsApp Rich Preview Card (Open Graph Metadata)
          </span>
          <div className="rounded-xl bg-white border border-emerald-100 p-3 shadow-xs">
            <p className="text-[11px] text-slate-400 font-mono truncate">
              selplase.ng · {activeShareTarget.type.toUpperCase()}
            </p>
            <p className="text-sm font-semibold text-slate-900 mt-0.5 line-clamp-1">
              {activeShareTarget.title}
            </p>
            <p className="text-xs font-bold text-blue-600 font-mono mt-1">
              {activeShareTarget.priceText} · {activeShareTarget.location}
            </p>
          </div>
        </div>

        {/* Copy Shareable URL */}
        <div className="mt-4">
          <label
            htmlFor="share-url-input"
            className="block text-xs font-medium text-slate-700 mb-1.5"
          >
            Shareable Listing URL
          </label>
          <div className="flex items-center gap-2">
            <input
              id="share-url-input"
              type="text"
              readOnly
              value={fullUrl}
              className="flex-1 px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-mono text-slate-700 focus:outline-none"
            />
            <button
              type="button"
              onClick={handleCopy}
              className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  Copied
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  Copy Link
                </>
              )}
            </button>
          </div>
        </div>

        {/* Primary WhatsApp Share CTA */}
        <div className="mt-5 flex flex-col sm:flex-row items-center gap-2.5">
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full py-3 px-4 rounded-xl bg-[#16A34A] hover:bg-[#15803D] text-white text-sm font-semibold flex items-center justify-center gap-2 shadow-sm transition-colors"
          >
            <MessageCircle className="w-4 h-4" />
            Share via WhatsApp
            <ExternalLink className="w-3.5 h-3.5 opacity-80" />
          </a>
        </div>
      </div>
    </div>
  );
}
