'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, CheckCircle2, Handshake, Loader2 } from 'lucide-react';
import { useMarketplace } from '@/context/MarketplaceContext';
import {
  CATEGORIES,
  NIGERIAN_STATES,
  PRODUCT_CONDITIONS,
} from '@/lib/data/mock-marketplace';
import { validateCreateRequest } from '@/lib/utils/formatters';
import type {
  BuyerRequest,
  CategorySlug,
  ListingType,
  ProductCondition,
} from '@/lib/types/marketplace';

export default function CreateRequestPage() {
  const router = useRouter();
  const { userProfile, publishBuyerRequest } = useMarketplace();

  const [title, setTitle] = useState('');
  const [requestType, setRequestType] = useState<ListingType>('product');
  const [category, setCategory] = useState<CategorySlug>('phones-tablets');
  const [budgetMinNaira, setBudgetMinNaira] = useState('');
  const [budgetMaxNaira, setBudgetMaxNaira] = useState('');
  const [preferredCondition, setPreferredCondition] =
    useState<ProductCondition>('Foreign Used (Tokunbo)');
  const [state, setState] = useState(userProfile?.state || 'Lagos');
  const [city, setCity] = useState(userProfile?.city || 'Ikeja');
  const [area, setArea] = useState('Ikeja GRA');
  const [urgency, setUrgency] =
    useState<BuyerRequest['urgency']>('This Week');
  const [description, setDescription] = useState('');
  const [buyerName, setBuyerName] = useState(userProfile?.display_name || '');
  const [buyerWhatsapp, setBuyerWhatsapp] = useState(
    userProfile?.whatsapp_number || '08030001122'
  );

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [createdId, setCreatedId] = useState<string | null>(null);
  const [persistedToDb, setPersistedToDb] = useState<boolean>(false);
  const [publishFeedback, setPublishFeedback] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const minVal = budgetMinNaira
      ? Number(budgetMinNaira)
      : Number(budgetMaxNaira);
    const maxVal = Number(budgetMaxNaira);

    const validation = validateCreateRequest({
      title,
      requestType,
      category,
      budgetMinNaira: minVal,
      budgetMaxNaira: maxVal,
      preferredCondition:
        requestType === 'service' ? 'Service / N/A' : preferredCondition,
      state,
      city,
      area,
      urgency,
      description,
      buyerName,
      buyerWhatsapp,
    });

    if (!validation.valid) {
      setErrors(validation.errors);
      return;
    }

    setErrors({});
    setSubmitting(true);
    const result = await publishBuyerRequest({
      title,
      requestType,
      category,
      budgetMinNaira: minVal,
      budgetMaxNaira: maxVal,
      preferredCondition:
        requestType === 'service' ? 'Service / N/A' : preferredCondition,
      state,
      city,
      area,
      urgency,
      description,
      buyerName,
      buyerWhatsapp,
    });
    setSubmitting(false);

    setPersistedToDb(result.persistedToSupabase);
    setPublishFeedback(result.error || null);
    setCreatedId(result.request.id);
  };

  if (createdId) {
    return (
      <div className="max-w-xl mx-auto px-4 sm:px-6 py-14">
        <div className="rounded-3xl bg-white/90 backdrop-blur-2xl border border-slate-200/80 shadow-xl p-8 text-center space-y-5">
          <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <div>
            <p className="text-xs font-semibold text-blue-600">
              {persistedToDb
                ? 'Published to Supabase PostgreSQL (public.buyer_requests)'
                : 'Saved to Local Session Preview'}
            </p>
            <h1 className="text-2xl font-extrabold text-slate-950 font-display mt-1">
              {persistedToDb
                ? 'Buyer Request Live on SELPLAS'
                : 'Saved to Local Buyer Requests Board'}
            </h1>
            <p className="text-sm text-slate-600 mt-2">
              {persistedToDb ? (
                <>
                  Your request &ldquo;{title}&rdquo; is now persisted in{' '}
                  <code className="font-mono">public.buyer_requests</code> so
                  verified and registered sellers can respond.
                </>
              ) : (
                <>
                  Your request &ldquo;{title}&rdquo; is saved in your current
                  session preview.
                  {publishFeedback && (
                    <span className="block text-xs text-amber-700 mt-1.5">
                      Note: {publishFeedback}
                    </span>
                  )}
                </>
              )}
            </p>
          </div>
          <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => router.push('/requests')}
              className="px-5 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-semibold shadow-sm transition-colors cursor-pointer"
            >
              View Buyer Requests Board
            </button>
            <button
              type="button"
              onClick={() => router.push('/explore')}
              className="px-5 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs sm:text-sm font-semibold transition-colors cursor-pointer"
            >
              Explore Marketplace
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6">
        <Link
          href="/requests"
          className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-slate-600 hover:text-slate-900 mb-3"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Buyer Requests
        </Link>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <Handshake className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-950 font-display">
              Post a Buyer Request
            </h1>
            <p className="text-xs sm:text-sm text-slate-600">
              Tell sellers across Nigeria what you want, your Naira budget, and
              preferred location.
            </p>
          </div>
        </div>
      </div>

      <form
        onSubmit={handleSubmit}
        className="rounded-3xl bg-white/90 backdrop-blur-2xl border border-slate-200/80 shadow-[0_12px_40px_rgba(15,23,42,0.05)] p-6 sm:p-8 space-y-5"
      >
        {Object.keys(errors).length > 0 && (
          <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-xs text-rose-800 space-y-1">
            <p className="font-bold">Please fix the following to continue:</p>
            {Object.values(errors).map((err, i) => (
              <p key={i}>• {err}</p>
            ))}
          </div>
        )}

        {/* Request Type Toggle */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-2">
            What are you looking for?
          </label>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => {
                setRequestType('product');
                setPreferredCondition('Foreign Used (Tokunbo)');
              }}
              className={`py-2.5 px-4 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
                requestType === 'product'
                  ? 'bg-blue-600 border-blue-600 text-white shadow-xs'
                  : 'bg-slate-50 border-slate-200 text-slate-700'
              }`}
            >
              A Physical Product
            </button>
            <button
              type="button"
              onClick={() => {
                setRequestType('service');
                setCategory('digital-services');
                setPreferredCondition('Service / N/A');
              }}
              className={`py-2.5 px-4 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
                requestType === 'service'
                  ? 'bg-blue-600 border-blue-600 text-white shadow-xs'
                  : 'bg-slate-50 border-slate-200 text-slate-700'
              }`}
            >
              A Professional Service
            </button>
          </div>
        </div>

        {/* Request Title */}
        <div>
          <label
            htmlFor="req-title-input"
            className="block text-xs font-semibold text-slate-700 mb-1.5"
          >
            What do you need? *
          </label>
          <input
            id="req-title-input"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g., Looking for Clean UK-Used iPad Pro M2 11-inch (128GB)"
            className="w-full px-4 py-2.5 rounded-xl bg-white border border-slate-200 text-sm text-slate-900 focus:outline-none focus:border-blue-600"
          />
        </div>

        {/* Category & Condition */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label
              htmlFor="req-category-select"
              className="block text-xs font-semibold text-slate-700 mb-1.5"
            >
              Category *
            </label>
            <select
              id="req-category-select"
              value={category}
              onChange={(e) => setCategory(e.target.value as CategorySlug)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-200 text-sm text-slate-900 focus:outline-none focus:border-blue-600"
            >
              {CATEGORIES.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="req-condition-select"
              className="block text-xs font-semibold text-slate-700 mb-1.5"
            >
              Preferred Condition
            </label>
            <select
              id="req-condition-select"
              value={
                requestType === 'service' ? 'Service / N/A' : preferredCondition
              }
              disabled={requestType === 'service'}
              onChange={(e) =>
                setPreferredCondition(e.target.value as ProductCondition)
              }
              className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-200 text-sm text-slate-900 disabled:bg-slate-100 focus:outline-none focus:border-blue-600"
            >
              {PRODUCT_CONDITIONS.map((cond) => (
                <option key={cond} value={cond}>
                  {cond}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Budget in Nigerian Naira & Urgency */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label
              htmlFor="req-budget-min"
              className="block text-xs font-semibold text-slate-700 mb-1.5"
            >
              Min Budget (₦)
            </label>
            <input
              id="req-budget-min"
              type="number"
              value={budgetMinNaira}
              onChange={(e) => setBudgetMinNaira(e.target.value)}
              placeholder="e.g. 400000"
              className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-200 text-sm font-mono text-slate-900 focus:outline-none focus:border-blue-600"
            />
          </div>

          <div>
            <label
              htmlFor="req-budget-max"
              className="block text-xs font-semibold text-slate-700 mb-1.5"
            >
              Max Budget (₦) *
            </label>
            <input
              id="req-budget-max"
              type="number"
              value={budgetMaxNaira}
              onChange={(e) => setBudgetMaxNaira(e.target.value)}
              placeholder="e.g. 520000"
              className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-200 text-sm font-mono text-slate-900 focus:outline-none focus:border-blue-600"
            />
          </div>

          <div>
            <label
              htmlFor="req-urgency-select"
              className="block text-xs font-semibold text-slate-700 mb-1.5"
            >
              Urgency
            </label>
            <select
              id="req-urgency-select"
              value={urgency}
              onChange={(e) =>
                setUrgency(e.target.value as BuyerRequest['urgency'])
              }
              className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-200 text-sm text-slate-900 focus:outline-none focus:border-blue-600"
            >
              <option value="Urgent (Within 48h)">Urgent (Within 48h)</option>
              <option value="This Week">This Week</option>
              <option value="Flexible">Flexible</option>
            </select>
          </div>
        </div>

        {/* Preferred Nigerian Location */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label
              htmlFor="req-state-select"
              className="block text-xs font-semibold text-slate-700 mb-1.5"
            >
              Preferred State *
            </label>
            <select
              id="req-state-select"
              value={state}
              onChange={(e) => setState(e.target.value)}
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
              htmlFor="req-city-input"
              className="block text-xs font-semibold text-slate-700 mb-1.5"
            >
              Preferred City *
            </label>
            <input
              id="req-city-input"
              type="text"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="e.g. Ikeja, Wuse 2, Port Harcourt"
              className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-200 text-sm text-slate-900 focus:outline-none focus:border-blue-600"
            />
          </div>

          <div>
            <label
              htmlFor="req-area-input"
              className="block text-xs font-semibold text-slate-700 mb-1.5"
            >
              Area / Landmark
            </label>
            <input
              id="req-area-input"
              type="text"
              value={area}
              onChange={(e) => setArea(e.target.value)}
              placeholder="e.g. Ikeja GRA"
              className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-200 text-sm text-slate-900 focus:outline-none focus:border-blue-600"
            />
          </div>
        </div>

        {/* Description */}
        <div>
          <label
            htmlFor="req-description-textarea"
            className="block text-xs font-semibold text-slate-700 mb-1.5"
          >
            Specific Requirements & Description *
          </label>
          <textarea
            id="req-description-textarea"
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe exact storage size, colour, warranty expectations, or project timeline..."
            className="w-full px-4 py-2.5 rounded-xl bg-white border border-slate-200 text-sm text-slate-900 focus:outline-none focus:border-blue-600"
          />
        </div>

        {/* Buyer Contact Info */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-100">
          <div>
            <label
              htmlFor="req-buyer-name"
              className="block text-xs font-semibold text-slate-700 mb-1.5"
            >
              Your Name *
            </label>
            <input
              id="req-buyer-name"
              type="text"
              value={buyerName}
              onChange={(e) => setBuyerName(e.target.value)}
              placeholder="e.g. Chinedu Okeke"
              className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-200 text-sm text-slate-900 focus:outline-none focus:border-blue-600"
            />
          </div>

          <div>
            <label
              htmlFor="req-buyer-whatsapp"
              className="block text-xs font-semibold text-slate-700 mb-1.5"
            >
              Your WhatsApp Number
            </label>
            <input
              id="req-buyer-whatsapp"
              type="tel"
              value={buyerWhatsapp}
              onChange={(e) => setBuyerWhatsapp(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-200 text-sm font-mono text-slate-900 focus:outline-none focus:border-blue-600"
            />
          </div>
        </div>

        <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
          <Link
            href="/requests"
            className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs sm:text-sm font-semibold transition-colors"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={submitting}
            className="px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-xs sm:text-sm font-semibold shadow-sm flex items-center gap-2 transition-colors cursor-pointer"
          >
            {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
            {submitting ? 'Publishing...' : 'Publish Buyer Request'}
          </button>
        </div>
      </form>
    </div>
  );
}
