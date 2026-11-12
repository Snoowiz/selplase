import React from 'react';
import Link from 'next/link';

export function Footer() {
  return (
    <footer className="bg-white/80 backdrop-blur-xl border-t border-slate-200/80 mt-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 pb-8 border-b border-slate-100">
          <div className="md:col-span-1">
            <Link
              href="/"
              className="text-xl font-extrabold tracking-tight text-slate-900 font-display"
            >
              SELPLAS
            </Link>
            <p className="mt-2.5 text-xs text-slate-500 leading-relaxed">
              Find it. Sell it. Request it. Nigeria&apos;s modern marketplace
              combining classified listings, buyer requests, and direct WhatsApp
              seller connections.
            </p>
          </div>

          <div>
            <h3 className="text-xs font-semibold text-slate-900 tracking-wide">
              Marketplace
            </h3>
            <ul className="mt-3 space-y-2 text-xs text-slate-600">
              <li>
                <Link href="/explore" className="hover:text-blue-600 transition-colors">
                  Explore All Listings
                </Link>
              </li>
              <li>
                <Link
                  href="/explore?type=product"
                  className="hover:text-blue-600 transition-colors"
                >
                  Buy Products
                </Link>
              </li>
              <li>
                <Link
                  href="/explore?type=service"
                  className="hover:text-blue-600 transition-colors"
                >
                  Find Professional Services
                </Link>
              </li>
              <li>
                <Link href="/sell" className="hover:text-blue-600 transition-colors">
                  Create a Listing
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-xs font-semibold text-slate-900 tracking-wide">
              Buyer Requests
            </h3>
            <ul className="mt-3 space-y-2 text-xs text-slate-600">
              <li>
                <Link href="/requests" className="hover:text-blue-600 transition-colors">
                  Browse Buyer Requests
                </Link>
              </li>
              <li>
                <Link
                  href="/requests/new"
                  className="hover:text-blue-600 transition-colors"
                >
                  Post What You Need
                </Link>
              </li>
              <li>
                <Link href="/account" className="hover:text-blue-600 transition-colors">
                  Seller Dashboard
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-xs font-semibold text-slate-900 tracking-wide">
              Popular Nigerian Hubs
            </h3>
            <ul className="mt-3 space-y-2 text-xs text-slate-600">
              <li>
                <Link
                  href="/explore?state=Lagos"
                  className="hover:text-blue-600 transition-colors"
                >
                  Lagos — Lekki, Ikeja & Yaba
                </Link>
              </li>
              <li>
                <Link
                  href="/explore?state=Abuja%20(FCT)"
                  className="hover:text-blue-600 transition-colors"
                >
                  Abuja (FCT) — Wuse 2 & Maitama
                </Link>
              </li>
              <li>
                <Link
                  href="/explore?state=Rivers"
                  className="hover:text-blue-600 transition-colors"
                >
                  Port Harcourt — New GRA
                </Link>
              </li>
              <li>
                <Link
                  href="/explore?state=Oyo"
                  className="hover:text-blue-600 transition-colors"
                >
                  Ibadan — Bodija & Ring Road
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <p>
            © {new Date().getFullYear()} SELPLAS Nigeria. Stage 1 Foundation
            Preview — All sample listings and profiles are fictional demonstration data.
          </p>
          <div className="flex items-center gap-5">
            <Link href="/account" className="hover:text-slate-900 transition-colors">
              Account & Stage 2 Roadmap
            </Link>
            <Link href="/explore" className="hover:text-slate-900 transition-colors">
              Safety Guidelines
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
