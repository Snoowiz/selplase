'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useMarketplace } from '@/context/MarketplaceContext';
import { ShareModal } from '@/components/marketplace/ShareModal';
import { HaveThisModal } from '@/components/marketplace/HaveThisModal';
import { ContactSellerModal } from '@/components/marketplace/ContactSellerModal';

export function Navbar() {
  const pathname = usePathname();
  const { authUser, userProfile } = useMarketplace();

  const accountLabel = authUser
    ? userProfile?.display_name
      ? `Account (${userProfile.display_name.split(' ')[0]})`
      : 'Account (Signed In)'
    : 'Sign In';

  const navLinks = [
    { href: '/explore', label: 'Explore' },
    { href: '/explore?type=service', label: 'Services' },
    { href: '/requests', label: 'Requests' },
    { href: '/sell', label: 'Start Selling' },
    {
      href: authUser ? '/account?tab=dashboard' : '/account?tab=login',
      label: accountLabel,
    },
  ];

  return (
    <>
      <header className="sticky top-0 z-40 h-14 md:h-16 bg-white/80 backdrop-blur-xl border-b border-slate-200/70">
        <div className="max-w-7xl mx-auto h-full px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-8">
          {/* Zone 1: Single text element wordmark */}
          <Link
            href="/"
            className="text-xl font-extrabold tracking-tight text-slate-900 font-display whitespace-nowrap shrink-0"
          >
            SELPLAS
          </Link>

          {/* Zone 2: 5 clean single-line text navigation links */}
          <nav
            aria-label="Primary Navigation"
            className="hidden md:flex items-center gap-7 text-sm font-medium text-slate-600"
          >
            {navLinks.map((link) => {
              const baseHref = link.href.split('?')[0];
              const isActive =
                pathname === link.href ||
                (baseHref !== '/' &&
                  !link.href.includes('type=service') &&
                  pathname.startsWith(baseHref));

              return (
                <Link
                  key={link.label}
                  href={link.href}
                  className={`py-1 transition-colors whitespace-nowrap shrink-0 border-b-2 ${
                    isActive
                      ? 'text-blue-600 border-blue-600 font-semibold'
                      : 'text-slate-600 border-transparent hover:text-slate-900 hover:border-slate-300'
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>

          {/* Zone 3: 1 primary action */}
          <div className="flex items-center shrink-0">
            <Link
              href="/requests/new"
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-semibold shadow-xs transition-colors whitespace-nowrap shrink-0"
            >
              Post a Request
            </Link>
          </div>
        </div>
      </header>

      {/* Global Interactive Modals */}
      <ShareModal />
      <HaveThisModal />
      <ContactSellerModal />
    </>
  );
}
