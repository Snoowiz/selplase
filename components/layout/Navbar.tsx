'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ShareModal } from '@/components/marketplace/ShareModal';
import { HaveThisModal } from '@/components/marketplace/HaveThisModal';
import { ContactSellerModal } from '@/components/marketplace/ContactSellerModal';

const NAV_LINKS = [
  { href: '/explore', label: 'Explore' },
  { href: '/explore?type=service', label: 'Services' },
  { href: '/requests', label: 'Requests' },
  { href: '/sell', label: 'Start Selling' },
  { href: '/account', label: 'Account' },
];

export function Navbar() {
  const pathname = usePathname();

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
            {NAV_LINKS.map((link) => {
              const isActive =
                pathname === link.href ||
                (link.href !== '/' &&
                  !link.href.includes('?') &&
                  pathname.startsWith(link.href));

              return (
                <Link
                  key={link.href}
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
