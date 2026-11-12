'use client';

import React, { useState } from 'react';
import {
  CheckCircle2,
  ExternalLink,
  HandHeart,
  Loader2,
  MessageCircle,
  ShieldCheck,
  X,
} from 'lucide-react';
import { useMarketplace } from '@/context/MarketplaceContext';
import {
  buildWhatsAppContactUrl,
  formatBudgetRange,
  formatNaira,
} from '@/lib/utils/formatters';
import { PRODUCT_CONDITIONS } from '@/lib/data/mock-marketplace';
import type { ProductCondition } from '@/lib/types/marketplace';

export function HaveThisModal() {
  const {
    userProfile,
    activeHaveThisRequest,
    closeHaveThisModal,
    publishOfferForRequest,
  } = useMarketplace();

  const [sellerName, setSellerName] = useState(
    userProfile?.display_name || 'Adebayo Ogunlesi'
  );
  const [sellerWhatsapp, setSellerWhatsapp] = useState(
    userProfile?.whatsapp_number || '08030001122'
  );
  const [offeredPrice, setOfferedPrice] = useState('');
  const [condition, setCondition] =
    useState<ProductCondition>('Foreign Used (Tokunbo)');
  const [location, setLocation] = useState('Lekki Phase 1, Lagos');
  const [note, setNote] = useState(
    'I have this exact item available for immediate physical inspection.'
  );
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submittedOfferPrice, setSubmittedOfferPrice] = useState<number | null>(
    null
  );
  const [persistedToDb, setPersistedToDb] = useState<boolean>(false);
  const [offerFeedback, setOfferFeedback] = useState<string | null>(null);

  if (!activeHaveThisRequest) return null;

  const budgetText = formatBudgetRange(
    activeHaveThisRequest.budgetMinNaira,
    activeHaveThisRequest.budgetMaxNaira
  );

  const origin =
    typeof window !== 'undefined' ? window.location.origin : 'https://selplas.ng';
  const requestUrl = `${origin}/requests#${activeHaveThisRequest.id}`;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const numericPrice = Number(
      offeredPrice || activeHaveThisRequest.budgetMaxNaira
    );
    if (!sellerName.trim() || sellerName.trim().length < 2) {
      setError('Please enter your name or business name.');
      return;
    }
    if (!numericPrice || numericPrice < 500) {
      setError('Please enter a valid offer price in Naira.');
      return;
    }
    setError('');
    setSubmitting(true);
    const result = await publishOfferForRequest({
      request: activeHaveThisRequest,
      sellerName,
      sellerWhatsapp,
      offeredPriceNaira: numericPrice,
      condition,
      location,
      note,
    });
    setSubmitting(false);
    setPersistedToDb(result.persistedToSupabase);
    setOfferFeedback(result.error || null);
    setSubmittedOfferPrice(numericPrice);
  };

  const handleClose = () => {
    setSubmittedOfferPrice(null);
    setPersistedToDb(false);
    setOfferFeedback(null);
    setError('');
    closeHaveThisModal();
  };

  const whatsappContactUrl = buildWhatsAppContactUrl({
    phone: activeHaveThisRequest.buyerWhatsapp,
    recipientName: activeHaveThisRequest.buyerName,
    itemTitle: activeHaveThisRequest.title,
    priceText: submittedOfferPrice
      ? formatNaira(submittedOfferPrice)
      : budgetText,
    url: requestUrl,
    mode: 'offer-request',
  });

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-150"
      role="dialog"
      aria-modal="true"
      aria-labelledby="have-this-modal-title"
    >
      <div className="w-full max-w-lg rounded-3xl bg-white/95 backdrop-blur-2xl border border-white/80 shadow-2xl p-6 relative max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <HandHeart className="w-4 h-4" />
            </div>
            <div>
              <h2
                id="have-this-modal-title"
                className="text-base font-bold text-slate-900"
              >
                I Have This — Respond to Buyer
              </h2>
              <p className="text-xs text-slate-500">
                Send your offer to {activeHaveThisRequest.buyerName}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            aria-label="Close response modal"
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Buyer Request Summary Box */}
        <div className="mt-4 rounded-2xl bg-slate-50 border border-slate-200/80 p-3.5">
          <p className="text-xs text-slate-500">
            Buyer Request · {activeHaveThisRequest.city},{' '}
            {activeHaveThisRequest.state}
          </p>
          <p className="text-sm font-semibold text-slate-900 mt-0.5">
            {activeHaveThisRequest.title}
          </p>
          <p className="text-xs font-bold text-blue-600 font-mono mt-1">
            Buyer Budget: {budgetText}
          </p>
        </div>

        {submittedOfferPrice !== null ? (
          <div className="mt-5 text-center py-4 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                {persistedToDb
                  ? `Offer Recorded in Supabase (${formatNaira(submittedOfferPrice)})`
                  : `Offer Saved in Local Preview (${formatNaira(submittedOfferPrice)})`}
              </h3>
              <p className="text-xs text-slate-600 mt-1 max-w-sm mx-auto">
                {persistedToDb ? (
                  <>
                    Your response has been persisted in{' '}
                    <code className="font-mono">public.request_offers</code>. You
                    can also connect with the buyer directly on WhatsApp below.
                  </>
                ) : (
                  <>
                    Your response has been saved in your current session preview.{' '}
                    {offerFeedback && (
                      <span className="block text-amber-700 mt-1">
                        {offerFeedback}
                      </span>
                    )}
                  </>
                )}
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-2.5 pt-2">
              <a
                href={whatsappContactUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 py-3 px-4 rounded-xl bg-[#16A34A] hover:bg-[#15803D] text-white text-xs font-semibold flex items-center justify-center gap-2 shadow-sm transition-colors"
              >
                <MessageCircle className="w-4 h-4" />
                Connect with Buyer on WhatsApp
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
              <button
                type="button"
                onClick={handleClose}
                className="py-3 px-5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-4 space-y-3.5">
            {error && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700">
                {error}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label
                  htmlFor="offer-seller-name"
                  className="block text-xs font-medium text-slate-700 mb-1"
                >
                  Your Name / Store Name
                </label>
                <input
                  id="offer-seller-name"
                  type="text"
                  value={sellerName}
                  onChange={(e) => setSellerName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-200 text-sm text-slate-900 focus:outline-none focus:border-blue-600"
                />
              </div>
              <div>
                <label
                  htmlFor="offer-seller-whatsapp"
                  className="block text-xs font-medium text-slate-700 mb-1"
                >
                  Your WhatsApp Number
                </label>
                <input
                  id="offer-seller-whatsapp"
                  type="tel"
                  value={sellerWhatsapp}
                  onChange={(e) => setSellerWhatsapp(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-200 text-sm text-slate-900 font-mono focus:outline-none focus:border-blue-600"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label
                  htmlFor="offer-price-naira"
                  className="block text-xs font-medium text-slate-700 mb-1"
                >
                  Your Offer Price (₦)
                </label>
                <input
                  id="offer-price-naira"
                  type="number"
                  placeholder={String(activeHaveThisRequest.budgetMaxNaira)}
                  value={offeredPrice}
                  onChange={(e) => setOfferedPrice(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-200 text-sm text-slate-900 font-mono focus:outline-none focus:border-blue-600"
                />
              </div>
              <div>
                <label
                  htmlFor="offer-condition"
                  className="block text-xs font-medium text-slate-700 mb-1"
                >
                  Item Condition
                </label>
                <select
                  id="offer-condition"
                  value={condition}
                  onChange={(e) =>
                    setCondition(e.target.value as ProductCondition)
                  }
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-200 text-sm text-slate-900 focus:outline-none focus:border-blue-600"
                >
                  {PRODUCT_CONDITIONS.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label
                htmlFor="offer-location"
                className="block text-xs font-medium text-slate-700 mb-1"
              >
                Inspection / Pickup Location
              </label>
              <input
                id="offer-location"
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-200 text-sm text-slate-900 focus:outline-none focus:border-blue-600"
              />
            </div>

            <div>
              <label
                htmlFor="offer-note"
                className="block text-xs font-medium text-slate-700 mb-1"
              >
                Short Message to Buyer
              </label>
              <textarea
                id="offer-note"
                rows={2}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl bg-white border border-slate-200 text-sm text-slate-900 focus:outline-none focus:border-blue-600"
              />
            </div>

            <div className="flex items-center gap-2 text-[11px] text-slate-500 bg-blue-50/70 rounded-xl p-2.5">
              <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0" />
              <span>
                Meet in a safe public place for physical inspection before payment.
              </span>
            </div>

            <div className="pt-2 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={handleClose}
                className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-xs font-semibold shadow-sm flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                {submitting ? 'Submitting...' : 'Submit Response & Connect'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
