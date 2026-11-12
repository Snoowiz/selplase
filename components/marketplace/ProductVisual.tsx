'use client';

import React, { useState } from 'react';
import {
  Smartphone,
  Laptop,
  Code2,
  Zap,
  Gamepad2,
  Wrench,
  Camera,
  ShoppingBag,
  Sparkles,
} from 'lucide-react';
import type { Listing } from '@/lib/types/marketplace';

interface ProductVisualProps {
  listing: Pick<Listing, 'title' | 'type' | 'categoryLabel' | 'images' | 'visualTheme'>;
  className?: string;
  priority?: boolean;
}

export function ProductVisual({ listing, className = '' }: ProductVisualProps) {
  const [imgError, setImgError] = useState(false);
  const customImage =
    listing.images &&
    listing.images.length > 0 &&
    !listing.images[0].startsWith('/images/products/')
      ? listing.images[0]
      : null;

  if (customImage && !imgError) {
    return (
      <div
        className={`relative overflow-hidden bg-gradient-to-br from-slate-100 to-slate-200 ${className}`}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={customImage}
          alt={listing.title}
          referrerPolicy="no-referrer"
          onError={() => setImgError(true)}
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
        />
      </div>
    );
  }

  const illustration = listing.visualTheme?.illustrationType || 'custom';

  if (illustration === 'iphone') {
    return (
      <div
        className={`relative overflow-hidden bg-gradient-to-b from-[#E5E7EB] via-[#F3F4F6] to-[#E2E8F0] flex items-center justify-center p-6 ${className}`}
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(99,102,241,0.12),transparent_60%)]" />
        {/* Studio Dual iPhone 16 Pro Max Render */}
        <div className="relative flex items-center justify-center gap-1 transform transition-transform duration-300 group-hover:scale-105">
          {/* Back titanium frame */}
          <div className="w-24 h-44 rounded-[22px] bg-gradient-to-b from-[#9CA3AF] via-[#6B7280] to-[#4B5563] p-2 shadow-[0_20px_35px_rgba(15,23,42,0.28)] border border-white/50 flex flex-col justify-between relative z-10">
            <div className="w-11 h-11 rounded-2xl bg-[#4B5563]/90 border border-white/30 p-1.5 grid grid-cols-2 gap-1 shadow-inner">
              <div className="w-3.5 h-3.5 rounded-full bg-slate-900 border border-slate-500 shadow-inner" />
              <div className="w-2.5 h-2.5 rounded-full bg-amber-100/80 self-center justify-self-center" />
              <div className="w-3.5 h-3.5 rounded-full bg-slate-900 border border-slate-500 shadow-inner" />
              <div className="w-3.5 h-3.5 rounded-full bg-slate-900 border border-slate-500 shadow-inner" />
            </div>
            <div className="self-center w-4 h-4 rounded-full bg-white/25" />
            <div className="h-2" />
          </div>
          {/* Front display frame */}
          <div className="w-22 h-42 -ml-4 rounded-[20px] bg-gradient-to-br from-[#1E1B4B] via-[#312E81] to-[#0F172A] p-1.5 shadow-xl border border-slate-400/50 flex flex-col items-center justify-between">
            <div className="w-8 h-2 rounded-full bg-black mt-1" />
            <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-blue-500/40 to-violet-400/40 blur-sm" />
            <div className="w-10 h-1 rounded-full bg-white/40 mb-1" />
          </div>
        </div>
        <div className="absolute bottom-0 inset-x-0 h-6 bg-gradient-to-t from-white/80 to-transparent" />
      </div>
    );
  }

  if (illustration === 'macbook') {
    return (
      <div
        className={`relative overflow-hidden bg-gradient-to-b from-[#DDE3EA] via-[#EDF1F5] to-[#E2E8F0] flex items-center justify-center p-6 ${className}`}
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_20%,rgba(37,99,235,0.12),transparent_65%)]" />
        <div className="relative flex flex-col items-center transform transition-transform duration-300 group-hover:scale-105">
          {/* Screen */}
          <div className="w-48 h-30 rounded-t-xl bg-[#0F172A] p-1.5 border-[2px] border-slate-700 shadow-2xl relative overflow-hidden">
            <div className="w-full h-full rounded-lg bg-gradient-to-br from-indigo-950 via-blue-900 to-fuchsia-900 relative overflow-hidden flex items-center justify-center">
              <div className="absolute -top-6 -left-6 w-24 h-24 rounded-full bg-amber-400/40 blur-xl" />
              <div className="absolute -bottom-6 -right-4 w-28 h-28 rounded-full bg-blue-400/40 blur-xl" />
              <span className="relative text-[10px] font-medium tracking-widest text-white/80 uppercase">
                MacBook Air M2
              </span>
            </div>
          </div>
          {/* Base */}
          <div className="w-56 h-2.5 rounded-b-xl bg-gradient-to-r from-slate-400 via-slate-200 to-slate-400 shadow-[0_12px_24px_rgba(15,23,42,0.22)] border-t border-white" />
        </div>
      </div>
    );
  }

  if (illustration === 'webdesign') {
    return (
      <div
        className={`relative overflow-hidden bg-gradient-to-br from-[#0F172A] via-[#1E293B] to-[#1E1B4B] flex items-center justify-center p-6 ${className}`}
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,rgba(56,189,248,0.22),transparent_55%)]" />
        <div className="relative w-52 h-32 rounded-xl bg-slate-900/95 border border-slate-700/80 shadow-2xl p-3 flex flex-col justify-between transform transition-transform duration-300 group-hover:scale-105">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-rose-400" />
              <span className="w-2 h-2 rounded-full bg-amber-400" />
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
            </div>
            <span className="text-[10px] font-mono text-sky-400">storefront.tsx</span>
          </div>
          <div className="space-y-1.5 my-auto">
            <div className="flex items-center gap-2">
              <span className="w-8 h-1.5 rounded bg-indigo-400/80" />
              <span className="w-16 h-1.5 rounded bg-sky-400/80" />
            </div>
            <div className="flex items-center gap-2 pl-3">
              <span className="w-20 h-1.5 rounded bg-emerald-400/70" />
              <span className="w-10 h-1.5 rounded bg-slate-600" />
            </div>
            <div className="flex items-center gap-2 pl-3">
              <span className="w-14 h-1.5 rounded bg-violet-400/80" />
              <span className="w-12 h-1.5 rounded bg-amber-300/70" />
            </div>
          </div>
          <div className="flex items-center justify-between pt-1 border-t border-slate-800/80">
            <span className="text-[10px] text-slate-400">Next.js · UI/UX</span>
            <Code2 className="w-3.5 h-3.5 text-sky-400" />
          </div>
        </div>
      </div>
    );
  }

  if (illustration === 'sneakers') {
    return (
      <div
        className={`relative overflow-hidden bg-gradient-to-b from-[#E5E7EB] via-[#F8FAFC] to-[#F1F5F9] flex items-center justify-center p-6 ${className}`}
      >
        <div className="relative flex flex-col items-center transform transition-transform duration-300 group-hover:scale-105">
          {/* Studio Sneaker Silhouette */}
          <div className="w-48 h-26 rounded-2xl bg-white shadow-[0_16px_30px_rgba(15,23,42,0.12)] border border-slate-200/90 p-3.5 flex flex-col justify-between relative">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400">
                AF1 &apos;07 Low
              </span>
              <ShoppingBag className="w-4 h-4 text-blue-600" />
            </div>
            <div className="my-auto flex items-center gap-2">
              <div className="flex-1 h-7 rounded-full bg-gradient-to-r from-slate-100 via-white to-slate-200 border border-slate-300 shadow-inner flex items-center px-3">
                <div className="w-12 h-2 rounded-full bg-slate-300" />
              </div>
            </div>
            <div className="w-full h-3 rounded-b-lg bg-slate-100 border-t border-slate-200 flex items-center justify-end px-2">
              <span className="text-[8px] font-bold tracking-widest text-slate-400">
                AIR
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (illustration === 'inverter') {
    return (
      <div
        className={`relative overflow-hidden bg-gradient-to-br from-[#ECFEFF] via-[#F0FDFA] to-[#E0F2FE] flex items-center justify-center p-6 ${className}`}
      >
        <div className="relative flex items-center gap-3 transform transition-transform duration-300 group-hover:scale-105">
          <div className="w-24 h-36 rounded-2xl bg-white border-2 border-teal-500/30 shadow-xl p-3 flex flex-col justify-between items-center">
            <div className="w-full flex items-center justify-between">
              <span className="text-[9px] font-bold text-teal-700">5kVA MPPT</span>
              <Zap className="w-3.5 h-3.5 text-amber-500" />
            </div>
            <div className="w-14 h-9 rounded-lg bg-slate-900 flex flex-col items-center justify-center border border-teal-400/40">
              <span className="text-[10px] font-mono text-emerald-400 font-semibold">
                230V OK
              </span>
              <span className="text-[8px] font-mono text-slate-400">100% LiFePO4</span>
            </div>
            <div className="w-8 h-1.5 rounded-full bg-teal-500/40" />
          </div>
        </div>
      </div>
    );
  }

  if (illustration === 'ps5') {
    return (
      <div
        className={`relative overflow-hidden bg-gradient-to-br from-[#EFF6FF] via-[#E0E7FF] to-[#F8FAFC] flex items-center justify-center p-6 ${className}`}
      >
        <div className="relative flex items-center gap-3 transform transition-transform duration-300 group-hover:scale-105">
          <div className="w-16 h-38 rounded-t-2xl rounded-b-md bg-white shadow-xl border border-slate-200 flex flex-col items-center justify-between py-3">
            <div className="w-1.5 h-24 rounded-full bg-gradient-to-b from-blue-600 to-indigo-900" />
            <span className="text-[8px] font-mono text-slate-400">1TB SLIM</span>
          </div>
          <div className="w-14 h-10 rounded-xl bg-white shadow-lg border border-slate-200 flex items-center justify-center">
            <Gamepad2 className="w-6 h-6 text-blue-600" />
          </div>
        </div>
      </div>
    );
  }

  if (illustration === 'camera') {
    return (
      <div
        className={`relative overflow-hidden bg-gradient-to-br from-[#F1F5F9] via-[#E2E8F0] to-[#CBD5E1] flex items-center justify-center p-6 ${className}`}
      >
        <div className="relative w-36 h-26 rounded-2xl bg-slate-900 shadow-2xl border border-slate-700 flex items-center justify-center transform transition-transform duration-300 group-hover:scale-105">
          <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-slate-800 via-slate-950 to-blue-950 border-4 border-slate-600 flex items-center justify-center shadow-inner">
            <Camera className="w-6 h-6 text-blue-400" />
          </div>
          <span className="absolute top-2 right-3 text-[9px] font-mono text-amber-400 font-semibold">
            α7 IV
          </span>
        </div>
      </div>
    );
  }

  if (illustration === 'ac-repair') {
    return (
      <div
        className={`relative overflow-hidden bg-gradient-to-br from-[#E0F2FE] via-[#F0F9FF] to-[#ECFEFF] flex items-center justify-center p-6 ${className}`}
      >
        <div className="relative w-44 h-28 rounded-2xl bg-white/90 border border-sky-200 shadow-lg p-4 flex flex-col justify-between transform transition-transform duration-300 group-hover:scale-105">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-semibold text-sky-700">
              HVAC & Solar Tech
            </span>
            <Wrench className="w-4 h-4 text-sky-600" />
          </div>
          <div className="h-2 rounded-full bg-sky-100 overflow-hidden">
            <div className="w-3/4 h-full bg-gradient-to-r from-sky-500 to-blue-600 rounded-full" />
          </div>
          <span className="text-[10px] text-slate-500">
            Certified Diagnostics & Servicing
          </span>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`relative overflow-hidden bg-gradient-to-br from-blue-50 via-indigo-50 to-slate-100 flex flex-col items-center justify-center p-6 text-center ${className}`}
    >
      <div className="w-14 h-14 rounded-2xl bg-white/90 shadow-md border border-blue-100 flex items-center justify-center mb-2 text-blue-600">
        {listing.type === 'service' ? (
          <Sparkles className="w-6 h-6" />
        ) : (
          <Smartphone className="w-6 h-6" />
        )}
      </div>
      <span className="text-xs font-medium text-slate-700 line-clamp-1 max-w-[180px]">
        {listing.title}
      </span>
    </div>
  );
}
