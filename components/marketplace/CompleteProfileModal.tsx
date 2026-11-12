'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { AnimatePresence, motion } from 'motion/react';
import {
  ArrowRight,
  CheckCircle2,
  Circle,
  HandHeart,
  Lock,
  Megaphone,
  Sparkles,
  Store,
  X,
} from 'lucide-react';
import {
  getOnboardingCompletionSummary,
  sanitizeRedirectPath,
} from '@/lib/utils/profile-utils';
import type { UserProfileRow } from '@/lib/types/profile';

export interface CompleteProfileModalProps {
  /** Whether the modal should currently be displayed */
  isOpen: boolean;
  /** Called when the user dismisses the modal ("Maybe Later", Escape, or close button) */
  onClose: () => void;
  /** Current user profile row (optional — works for both partial OAuth profiles and new visitors) */
  userProfile?: Partial<UserProfileRow> | null;
  /** Whether the user currently has an active Supabase Auth session */
  isAuthenticated?: boolean;
  /** Safe internal path to return to after completing onboarding */
  nextPath?: string;
  /** Optional custom heading override */
  title?: string;
  /** Optional custom subtitle override */
  subtitle?: string;
}

const UNLOCKED_MARKETPLACE_FEATURES = [
  {
    title: 'Sell Products & Services',
    description: 'Publish verified-ready listings across all Nigerian states',
    icon: Store,
  },
  {
    title: 'Post Buyer Requests',
    description: 'Tell sellers what you need with your budget in Naira (₦)',
    icon: Megaphone,
  },
  {
    title: 'Send "I Have This" Offers',
    description: 'Respond directly to buyers & connect on WhatsApp',
    icon: HandHeart,
  },
] as const;

/**
 * Reusable "Complete Your Profile" modal (`CompleteProfileModal`)
 * Appears on top of the Account Dashboard when `isOnboardingComplete` is false,
 * gently encouraging users to finish onboarding to unlock full Selplase marketplace features.
 * Enhanced with subtle Framer Motion (`motion/react`) backdrop, card spring, and checklist animations.
 */
export function CompleteProfileModal({
  isOpen,
  onClose,
  userProfile = null,
  isAuthenticated = false,
  nextPath = '/account?tab=dashboard',
  title = 'Complete Your Profile',
  subtitle = 'Finish setting up your Selplase profile in under a minute to unlock full buying, selling, and request features.',
}: CompleteProfileModalProps) {
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const summary = getOnboardingCompletionSummary(userProfile);
  const safeNext = sanitizeRedirectPath(nextPath, '/account?tab=dashboard');
  const onboardingHref = `/onboarding?next=${encodeURIComponent(safeNext)}`;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key="complete-profile-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.22, ease: 'easeOut' }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/45 backdrop-blur-md"
          role="dialog"
          aria-modal="true"
          aria-labelledby="complete-profile-modal-title"
          aria-describedby="complete-profile-modal-description"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              onClose();
            }
          }}
        >
          <motion.div
            key="complete-profile-card"
            initial={{ opacity: 0, scale: 0.96, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 10 }}
            transition={{
              type: 'spring',
              stiffness: 360,
              damping: 28,
              mass: 0.85,
            }}
            className="w-full max-w-lg rounded-3xl bg-white/95 backdrop-blur-2xl border border-white/90 shadow-[0_24px_64px_rgba(15,23,42,0.18)] p-6 sm:p-7 relative max-h-[90vh] overflow-y-auto"
          >
            {/* Top Accent Gradient Bar */}
            <div
              aria-hidden="true"
              className="absolute inset-x-6 top-0 h-1 rounded-b-full bg-gradient-to-r from-blue-600 via-indigo-500 to-cyan-500"
            />

            {/* Modal Header */}
            <div className="flex items-start justify-between gap-4 pb-4 border-b border-slate-100">
              <div className="flex items-start gap-3">
                <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-sm flex items-center justify-center shrink-0">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <div className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-blue-600">
                    <span>Selplase Onboarding</span>
                    <span aria-hidden="true">·</span>
                    <span>
                      {summary.completedCount}/{summary.totalSteps} Steps Ready
                    </span>
                  </div>
                  <h2
                    id="complete-profile-modal-title"
                    className="text-xl font-extrabold text-slate-950 font-display mt-0.5"
                  >
                    {title}
                  </h2>
                  <p
                    id="complete-profile-modal-description"
                    className="text-xs text-slate-600 mt-1 leading-relaxed"
                  >
                    {subtitle}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={onClose}
                aria-label="Close complete profile dialog"
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-colors cursor-pointer shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Progress Bar */}
            <div className="mt-4">
              <div className="flex items-center justify-between text-xs mb-1.5">
                <span className="font-semibold text-slate-700">
                  Profile Setup Progress
                </span>
                <span className="font-mono font-bold text-blue-600">
                  {summary.progressPercent}%
                </span>
              </div>
              <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
                <motion.div
                  initial={{ width: '0%' }}
                  animate={{ width: `${Math.max(summary.progressPercent, 8)}%` }}
                  transition={{ duration: 0.45, delay: 0.1, ease: 'easeOut' }}
                  className="h-full rounded-full bg-gradient-to-r from-blue-600 to-indigo-600"
                />
              </div>
            </div>

            {/* Onboarding Requirements Checklist */}
            <div className="mt-4 space-y-2">
              <p className="text-xs font-bold text-slate-800">
                Required to Activate Your Full Account:
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {summary.steps.map((step, index) => (
                  <motion.div
                    key={step.id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{
                      duration: 0.22,
                      delay: 0.06 + index * 0.04,
                      ease: 'easeOut',
                    }}
                    className={`rounded-2xl border p-3 flex items-start gap-2.5 text-xs ${
                      step.completed
                        ? 'bg-emerald-50/70 border-emerald-200/80 text-emerald-950'
                        : 'bg-slate-50/90 border-slate-200/80 text-slate-800'
                    }`}
                  >
                    {step.completed ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    ) : (
                      <Circle className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                    )}
                    <div className="min-w-0">
                      <p className="font-bold leading-snug">{step.label}</p>
                      <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                        {step.description}
                      </p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>

            {/* What You Unlock Section */}
            <div className="mt-5 pt-4 border-t border-slate-100">
              <p className="text-xs font-bold text-slate-800 mb-2.5">
                Unlock Full Marketplace Features:
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                {UNLOCKED_MARKETPLACE_FEATURES.map((feature, index) => {
                  const Icon = feature.icon;
                  return (
                    <motion.div
                      key={feature.title}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{
                        duration: 0.22,
                        delay: 0.18 + index * 0.04,
                        ease: 'easeOut',
                      }}
                      className="rounded-2xl bg-blue-50/60 border border-blue-100 p-3 space-y-1"
                    >
                      <div className="w-7 h-7 rounded-xl bg-white text-blue-600 border border-blue-100 flex items-center justify-center shadow-2xs">
                        <Icon className="w-3.5 h-3.5" />
                      </div>
                      <p className="text-xs font-bold text-slate-900">
                        {feature.title}
                      </p>
                      <p className="text-[11px] text-slate-600 leading-snug">
                        {feature.description}
                      </p>
                    </motion.div>
                  );
                })}
              </div>
            </div>

            {/* Privacy Reassurance Note */}
            <div className="mt-4 rounded-2xl bg-slate-50 border border-slate-200/80 p-3 flex items-center gap-2.5 text-[11px] text-slate-600">
              <Lock className="w-4 h-4 text-blue-600 shrink-0" />
              <span>
                Your Nigerian WhatsApp number is normalised to{' '}
                <code className="font-mono font-semibold text-slate-800">
                  +234
                </code>{' '}
                and kept <strong>private by default</strong> on your public
                profile.
                {!isAuthenticated &&
                  ' You can preview onboarding now or sign in with Google.'}
              </span>
            </div>

            {/* Action Buttons */}
            <div className="mt-5 pt-4 border-t border-slate-100 flex flex-col-reverse sm:flex-row sm:items-center justify-between gap-2.5">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors cursor-pointer"
              >
                Maybe Later, Explore Dashboard
              </button>

              <Link
                href={onboardingHref}
                onClick={onClose}
                className="px-5 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-semibold shadow-[0_8px_24px_rgba(37,99,235,0.25)] flex items-center justify-center gap-2 transition-all"
              >
                <span>Finish Onboarding Now</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
