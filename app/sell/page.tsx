'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Eye,
  ImagePlus,
  Loader2,
  MapPin,
  Sparkles,
  Store,
  Trash2,
} from 'lucide-react';
import { useMarketplace } from '@/context/MarketplaceContext';
import {
  CATEGORIES,
  NIGERIAN_STATES,
  PRODUCT_CONDITIONS,
} from '@/lib/data/mock-marketplace';
import { formatNaira, validateCreateListing } from '@/lib/utils/formatters';
import { uploadListingImageToSupabase } from '@/lib/supabase/client-ready';
import type {
  CategorySlug,
  ListingType,
  ProductCondition,
} from '@/lib/types/marketplace';
import { ProductVisual } from '@/components/marketplace/ProductVisual';

export default function CreateListingPage() {
  const router = useRouter();
  const { authUser, userProfile, isOnboardingComplete, publishListing } =
    useMarketplace();

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [type, setType] = useState<ListingType>('product');
  const [category, setCategory] = useState<CategorySlug>('phones-tablets');
  const [images, setImages] = useState<string[]>([]);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [uploadStatusNote, setUploadStatusNote] = useState<string | null>(null);

  const [title, setTitle] = useState('');
  const [priceNaira, setPriceNaira] = useState('');
  const [priceNote, setPriceNote] = useState('Slightly Negotiable');
  const [condition, setCondition] =
    useState<ProductCondition>('Foreign Used (Tokunbo)');
  const [state, setState] = useState(userProfile?.state || 'Lagos');
  const [city, setCity] = useState(userProfile?.city || 'Lekki Phase 1');
  const [area, setArea] = useState('Admiralty Way');
  const [description, setDescription] = useState('');
  const [highlightText] = useState('');
  const [sellerName, setSellerName] = useState(
    userProfile?.display_name || 'Adebayo Ogunlesi'
  );
  const [sellerWhatsapp, setSellerWhatsapp] = useState(
    userProfile?.whatsapp_number || '08030001122'
  );

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [publishedId, setPublishedId] = useState<string | null>(null);
  const [persistedToDb, setPersistedToDb] = useState<boolean>(false);
  const [publishFeedback, setPublishFeedback] = useState<string | null>(null);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const selected = Array.from(files).slice(0, 4 - images.length);
    setUploadingImages(true);
    setUploadStatusNote(null);

    for (const file of selected) {
      if (authUser) {
        const uploaded = await uploadListingImageToSupabase({
          userId: authUser.id,
          file,
        });
        if (uploaded.publicUrl) {
          setImages((prev) => [...prev, uploaded.publicUrl!].slice(0, 4));
          setUploadStatusNote(
            'Uploaded to Supabase Storage bucket `listing-images`.'
          );
          continue;
        } else {
          setUploadStatusNote(
            `Storage bucket upload note: ${uploaded.error}. Using local preview image.`
          );
        }
      }

      // Fallback data URL preview when signed out or before bucket migration is applied
      await new Promise<void>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => {
          if (typeof reader.result === 'string') {
            setImages((prev) => [...prev, reader.result as string].slice(0, 4));
          }
          resolve();
        };
        reader.onerror = () => resolve();
        reader.readAsDataURL(file);
      });
    }

    setUploadingImages(false);
  };

  const handleRemoveImage = (index: number) => {
    setImages((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleNextFromStep1 = () => {
    if (!category) {
      setErrors({ category: 'Please select a category.' });
      return;
    }
    setErrors({});
    setStep(2);
  };

  const handleNextFromStep2 = () => {
    const validation = validateCreateListing({
      title,
      type,
      category,
      priceNaira: Number(priceNaira),
      priceNote,
      condition: type === 'service' ? 'Service / N/A' : condition,
      state,
      city,
      area,
      description,
    });

    if (!validation.valid) {
      setErrors(validation.errors);
      return;
    }
    setErrors({});
    setStep(3);
  };

  const handlePublish = async (e: React.FormEvent) => {
    e.preventDefault();
    const validation = validateCreateListing({
      title,
      type,
      category,
      priceNaira: Number(priceNaira),
      priceNote,
      condition: type === 'service' ? 'Service / N/A' : condition,
      state,
      city,
      area,
      description,
    });

    if (!validation.valid) {
      setErrors(validation.errors);
      setStep(2);
      return;
    }

    const parsedHighlights = highlightText
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean);

    setSubmitting(true);
    const result = await publishListing({
      title,
      type,
      category,
      priceNaira: Number(priceNaira),
      priceNote,
      condition: type === 'service' ? 'Service / N/A' : condition,
      state,
      city,
      area,
      description,
      highlights: parsedHighlights,
      images,
      sellerName: userProfile?.display_name || sellerName,
      sellerWhatsapp: userProfile?.whatsapp_number || sellerWhatsapp,
    });
    setSubmitting(false);

    if (result.onboardingRequired) {
      setErrors({
        onboarding:
          result.error ||
          'Please complete your Selplase onboarding profile before publishing listings.',
      });
      return;
    }

    setPersistedToDb(result.persistedToSupabase);
    setPublishFeedback(result.error || null);
    setPublishedId(result.listing.id);
  };

  const categoryObj = CATEGORIES.find((c) => c.id === category);

  if (publishedId) {
    return (
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-14">
        <div className="rounded-3xl bg-white/90 backdrop-blur-2xl border border-slate-200/80 shadow-xl p-8 text-center space-y-5">
          <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <div>
            <p className="text-xs font-semibold text-emerald-700">
              {persistedToDb
                ? 'Published to Supabase PostgreSQL (public.listings)'
                : 'Saved to Local Session Preview'}
            </p>
            <h1 className="text-2xl font-extrabold text-slate-950 font-display mt-1">
              {persistedToDb
                ? 'Listing Live on Selplase Marketplace'
                : 'Saved to Local Marketplace Preview'}
            </h1>
            <p className="text-sm text-slate-600 mt-2 max-w-md mx-auto">
              {persistedToDb ? (
                <>
                  &ldquo;{title}&rdquo; ({formatNaira(Number(priceNaira))}) is
                  now persisted in <code className="font-mono">public.listings</code>{' '}
                  linked to your authenticated seller profile.
                </>
              ) : (
                <>
                  &ldquo;{title}&rdquo; ({formatNaira(Number(priceNaira))}) is
                  available in your current session preview.{' '}
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
              onClick={() => router.push(`/listings/${publishedId}`)}
              className="px-5 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-semibold shadow-sm transition-colors cursor-pointer"
            >
              View Published Listing
            </button>
            <button
              type="button"
              onClick={() => router.push('/explore')}
              className="px-5 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs sm:text-sm font-semibold transition-colors cursor-pointer"
            >
              Go to Explore Marketplace
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Page Heading */}
      <div className="mb-6">
        <p className="text-xs font-semibold text-blue-600">
          Selplase Seller Studio
        </p>
        <h1 className="text-3xl font-extrabold text-slate-950 font-display mt-1">
          Create a New Listing
        </h1>
        <p className="text-sm text-slate-600 mt-1">
          Publish a physical product or professional service in 3 simple steps.
        </p>
      </div>

      {/* Onboarding / Authentication Access Notice */}
      {authUser && !isOnboardingComplete && (
        <div className="mb-6 rounded-2xl bg-amber-50 border border-amber-200 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-amber-950">
          <div className="flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">
                Complete Onboarding Before Publishing Real Listings
              </p>
              <p className="text-amber-800 mt-0.5">
                Your WhatsApp number and Nigerian location are required to
                publish real listings on Selplase.
              </p>
            </div>
          </div>
          <Link
            href="/onboarding?next=/sell"
            className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-semibold whitespace-nowrap shrink-0"
          >
            Complete Onboarding →
          </Link>
        </div>
      )}

      {/* Stepper Progress Bar */}
      <div className="grid grid-cols-3 gap-3 mb-8">
        {[
          { num: 1, label: '1. Category & Photos' },
          { num: 2, label: '2. Details & Naira Price' },
          { num: 3, label: '3. Preview & Publish' },
        ].map((item) => {
          const active = step === item.num;
          const completed = step > item.num;
          return (
            <button
              key={item.num}
              type="button"
              onClick={() => {
                if (item.num < step) setStep(item.num as 1 | 2 | 3);
              }}
              className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
                active
                  ? 'bg-blue-600 border-blue-600 text-white shadow-sm'
                  : completed
                    ? 'bg-blue-50/80 border-blue-200 text-blue-900'
                    : 'bg-white/80 border-slate-200/80 text-slate-500'
              }`}
            >
              <span className="text-xs sm:text-sm font-semibold block truncate">
                {item.label}
              </span>
            </button>
          );
        })}
      </div>

      {/* Form Card */}
      <div className="rounded-3xl bg-white/90 backdrop-blur-2xl border border-slate-200/80 shadow-[0_12px_40px_rgba(15,23,42,0.05)] p-6 sm:p-8">
        {/* STEP 1: TYPE, CATEGORY & IMAGES */}
        {step === 1 && (
          <div className="space-y-6">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-2">
                What are you listing on Selplase?
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setType('product');
                    setCategory('phones-tablets');
                    setCondition('Foreign Used (Tokunbo)');
                  }}
                  className={`p-4 rounded-2xl border text-left transition-all cursor-pointer flex items-start gap-3 ${
                    type === 'product'
                      ? 'bg-blue-50/80 border-blue-600 ring-2 ring-blue-600/15'
                      : 'bg-white border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <Store className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-bold text-slate-900">
                      Physical Product for Sale
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Phones, laptops, inverters, appliances, fashion & more
                    </p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setType('service');
                    setCategory('digital-services');
                    setCondition('Service / N/A');
                  }}
                  className={`p-4 rounded-2xl border text-left transition-all cursor-pointer flex items-start gap-3 ${
                    type === 'service'
                      ? 'bg-indigo-50/80 border-indigo-600 ring-2 ring-indigo-600/15'
                      : 'bg-white border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <Sparkles className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-bold text-slate-900">
                      Professional Service
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Web design, solar/AC installation, photography & repairs
                    </p>
                  </div>
                </button>
              </div>
            </div>

            {/* Category Selection */}
            <div>
              <label
                htmlFor="sell-category-select"
                className="block text-xs font-semibold text-slate-700 mb-2"
              >
                Choose a Marketplace Category
              </label>
              <select
                id="sell-category-select"
                value={category}
                onChange={(e) => setCategory(e.target.value as CategorySlug)}
                className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 text-sm font-medium text-slate-900 focus:outline-none focus:bg-white focus:border-blue-600"
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name} — {cat.description}
                  </option>
                ))}
              </select>
            </div>

            {/* Image Upload Box */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label
                  htmlFor="sell-image-upload"
                  className="block text-xs font-semibold text-slate-700"
                >
                  Product / Service Photos (Optional — Auto-Studio Visual Ready)
                </label>
                <span className="text-xs text-slate-400">
                  {images.length} / 4 uploaded
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {images.map((src, idx) => (
                  <div
                    key={idx}
                    className="relative h-28 rounded-2xl border border-slate-200 overflow-hidden bg-slate-100 group"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={src}
                      alt={`Uploaded preview ${idx + 1}`}
                      className="w-full h-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveImage(idx)}
                      aria-label={`Remove photo ${idx + 1}`}
                      className="absolute top-2 right-2 w-7 h-7 rounded-full bg-slate-900/75 text-white flex items-center justify-center cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}

                {images.length < 4 && (
                  <label
                    htmlFor="sell-image-upload"
                    className="h-28 rounded-2xl border-2 border-dashed border-slate-300 hover:border-blue-500 bg-slate-50/70 hover:bg-blue-50/40 flex flex-col items-center justify-center text-center p-3 cursor-pointer transition-colors"
                  >
                    <ImagePlus className="w-5 h-5 text-blue-600 mb-1" />
                    <span className="text-xs font-semibold text-slate-700">
                      Add Photo
                    </span>
                    <span className="text-[10px] text-slate-400">
                      PNG, JPG, WebP
                    </span>
                    <input
                      id="sell-image-upload"
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handleImageUpload}
                      className="sr-only"
                    />
                  </label>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-2">
                {uploadingImages
                  ? 'Uploading photo to Supabase Storage bucket `listing-images`...'
                  : uploadStatusNote ||
                    'Authenticated uploads are stored in Supabase Storage bucket `listing-images` under your user ID folder.'}
              </p>
            </div>

            <div className="pt-4 border-t border-slate-100 flex justify-end">
              <button
                type="button"
                onClick={handleNextFromStep1}
                className="px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold flex items-center gap-2 shadow-sm transition-colors cursor-pointer"
              >
                Continue to Details & Pricing
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: DETAILS, NAIRA PRICE & NIGERIAN LOCATION */}
        {step === 2 && (
          <div className="space-y-5">
            {Object.keys(errors).length > 0 && (
              <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-xs text-rose-800 space-y-1">
                <p className="font-bold">Please check the following fields:</p>
                {Object.values(errors).map((err, i) => (
                  <p key={i}>• {err}</p>
                ))}
              </div>
            )}

            <div>
              <label
                htmlFor="sell-title-input"
                className="block text-xs font-semibold text-slate-700 mb-1.5"
              >
                Listing Title *
              </label>
              <input
                id="sell-title-input"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={
                  type === 'service'
                    ? 'e.g., Full-Stack Business Website & E-Commerce Design'
                    : 'e.g., Samsung Galaxy S24 Ultra 512GB Titanium Gray'
                }
                className="w-full px-4 py-2.5 rounded-xl bg-white border border-slate-200 text-sm text-slate-900 focus:outline-none focus:border-blue-600"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label
                  htmlFor="sell-price-input"
                  className="block text-xs font-semibold text-slate-700 mb-1.5"
                >
                  Price in Naira (₦) *
                </label>
                <input
                  id="sell-price-input"
                  type="number"
                  value={priceNaira}
                  onChange={(e) => setPriceNaira(e.target.value)}
                  placeholder="e.g. 450000"
                  className="w-full px-4 py-2.5 rounded-xl bg-white border border-slate-200 text-sm font-mono text-slate-900 focus:outline-none focus:border-blue-600"
                />
              </div>

              <div>
                <label
                  htmlFor="sell-price-note"
                  className="block text-xs font-semibold text-slate-700 mb-1.5"
                >
                  Pricing Note
                </label>
                <select
                  id="sell-price-note"
                  value={priceNote}
                  onChange={(e) => setPriceNote(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-200 text-sm text-slate-900 focus:outline-none focus:border-blue-600"
                >
                  <option value="Slightly Negotiable">Slightly Negotiable</option>
                  <option value="Fixed Price">Fixed Price</option>
                  <option value="Starting from">Starting from</option>
                  <option value="Per Session / Project">
                    Per Session / Project
                  </option>
                </select>
              </div>

              <div>
                <label
                  htmlFor="sell-condition-select"
                  className="block text-xs font-semibold text-slate-700 mb-1.5"
                >
                  Condition
                </label>
                <select
                  id="sell-condition-select"
                  value={type === 'service' ? 'Service / N/A' : condition}
                  disabled={type === 'service'}
                  onChange={(e) =>
                    setCondition(e.target.value as ProductCondition)
                  }
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-200 text-sm text-slate-900 disabled:bg-slate-100 focus:outline-none focus:border-blue-600"
                >
                  {PRODUCT_CONDITIONS.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Nigerian State, City & Area */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label
                  htmlFor="sell-state-select"
                  className="block text-xs font-semibold text-slate-700 mb-1.5"
                >
                  Nigerian State *
                </label>
                <select
                  id="sell-state-select"
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
                  htmlFor="sell-city-input"
                  className="block text-xs font-semibold text-slate-700 mb-1.5"
                >
                  City / Town *
                </label>
                <input
                  id="sell-city-input"
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="e.g. Lekki Phase 1, Wuse 2"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-200 text-sm text-slate-900 focus:outline-none focus:border-blue-600"
                />
              </div>

              <div>
                <label
                  htmlFor="sell-area-input"
                  className="block text-xs font-semibold text-slate-700 mb-1.5"
                >
                  Inspection Landmark
                </label>
                <input
                  id="sell-area-input"
                  type="text"
                  value={area}
                  onChange={(e) => setArea(e.target.value)}
                  placeholder="e.g. Admiralty Way"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-200 text-sm text-slate-900 focus:outline-none focus:border-blue-600"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="sell-description-textarea"
                className="block text-xs font-semibold text-slate-700 mb-1.5"
              >
                Detailed Description *
              </label>
              <textarea
                id="sell-description-textarea"
                rows={4}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Include full specifications, battery health, included accessories, or service deliverables..."
                className="w-full px-4 py-2.5 rounded-xl bg-white border border-slate-200 text-sm text-slate-900 focus:outline-none focus:border-blue-600"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="sell-seller-name"
                  className="block text-xs font-semibold text-slate-700 mb-1.5"
                >
                  Seller Name (Demo)
                </label>
                <input
                  id="sell-seller-name"
                  type="text"
                  value={sellerName}
                  onChange={(e) => setSellerName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-200 text-sm text-slate-900 focus:outline-none focus:border-blue-600"
                />
              </div>

              <div>
                <label
                  htmlFor="sell-seller-whatsapp"
                  className="block text-xs font-semibold text-slate-700 mb-1.5"
                >
                  WhatsApp Contact Number
                </label>
                <input
                  id="sell-seller-whatsapp"
                  type="tel"
                  value={sellerWhatsapp}
                  onChange={(e) => setSellerWhatsapp(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-200 text-sm font-mono text-slate-900 focus:outline-none focus:border-blue-600"
                />
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs sm:text-sm font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
                Back
              </button>

              <button
                type="button"
                onClick={handleNextFromStep2}
                className="px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-semibold flex items-center gap-2 shadow-sm transition-colors cursor-pointer"
              >
                <Eye className="w-4 h-4" />
                Preview Listing
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: LIVE PREVIEW & PUBLISH */}
        {step === 3 && (
          <form onSubmit={handlePublish} className="space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  Review Your Listing Preview
                </h2>
                <p className="text-xs text-slate-500">
                  Confirm how buyers across Nigeria will see your listing.
                </p>
              </div>
              <span className="text-xs font-semibold text-blue-600">
                Ready to Publish
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center rounded-2xl bg-slate-50/90 border border-slate-200/80 p-5">
              <div className="md:col-span-5 rounded-2xl overflow-hidden border border-slate-200">
                <ProductVisual
                  listing={{
                    title: title || 'Untitled Listing',
                    type,
                    categoryLabel: categoryObj?.name || 'Marketplace',
                    images,
                    visualTheme: {
                      primaryColor: '#2563EB',
                      secondaryColor: '#4F46E5',
                      illustrationType:
                        category === 'phones-tablets'
                          ? 'iphone'
                          : category === 'computing'
                            ? 'macbook'
                            : type === 'service'
                              ? 'webdesign'
                              : 'custom',
                    },
                  }}
                  className="h-52 w-full"
                />
              </div>

              <div className="md:col-span-7 space-y-3">
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <span className="font-semibold text-blue-700 uppercase">
                    {type}
                  </span>
                  <span aria-hidden="true">·</span>
                  <span>{categoryObj?.name}</span>
                  <span aria-hidden="true">·</span>
                  <span>{type === 'service' ? 'Service / N/A' : condition}</span>
                </div>

                <h3 className="text-xl font-bold text-slate-900">{title}</h3>

                <p className="text-2xl font-extrabold text-blue-600 font-mono tabular-nums">
                  {formatNaira(Number(priceNaira))}{' '}
                  <span className="text-xs font-sans font-normal text-slate-500">
                    ({priceNote})
                  </span>
                </p>

                <p className="text-xs text-slate-600 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-blue-600" />
                  {area ? `${area}, ` : ''}
                  {city}, {state}
                </p>

                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed line-clamp-3">
                  {description}
                </p>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs sm:text-sm font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
                Edit Details
              </button>

              <button
                type="submit"
                disabled={submitting}
                className="px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-sm font-semibold shadow-[0_8px_24px_rgba(37,99,235,0.25)] flex items-center gap-2 transition-all cursor-pointer"
              >
                {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                {submitting ? 'Publishing...' : 'Publish Listing Now'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
