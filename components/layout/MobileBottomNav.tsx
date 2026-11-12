'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Compass, HandHeart, Home, PlusCircle, User } from 'lucide-react';

const MOBILE_TABS = [
  { href: '/', label: 'Home', icon: Home },
  { href: '/explore', label: 'Explore', icon: Compass },
  { href: '/sell', label: 'Sell', icon: PlusCircle },
  { href: '/requests', label: 'Requests', icon: HandHeart },
  { href: '/account', label: 'Account', icon: User },
];

export function MobileBottomNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Mobile Bottom Navigation"
      className="md:hidden fixed bottom-0 inset-x-0 z-40 h-14 bg-white/90 backdrop-blur-xl border-t border-slate-200/80 px-2 flex items-center justify-around"
    >
      {MOBILE_TABS.map((tab) => {
        const Icon = tab.icon;
        const isActive =
          tab.href === '/'
            ? pathname === '/'
            : pathname.startsWith(tab.href);

        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`flex flex-col items-center justify-center min-w-[56px] h-11 rounded-xl px-2 transition-colors whitespace-nowrap shrink-0 ${
              isActive
                ? 'text-blue-600 font-semibold'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <Icon className="w-4 h-4" />
            <span className="text-[11px] mt-0.5 leading-none">{tab.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
