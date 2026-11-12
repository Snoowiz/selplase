import type { Metadata } from 'next';
import './globals.css';
import { MarketplaceProvider } from '@/context/MarketplaceContext';
import { Navbar } from '@/components/layout/Navbar';
import { MobileBottomNav } from '@/components/layout/MobileBottomNav';
import { Footer } from '@/components/layout/Footer';

export const metadata: Metadata = {
  title: 'SELPLAS — Find it. Sell it. Request it. | Nigeria Marketplace',
  description:
    "SELPLAS is Nigeria's modern marketplace where people can buy products, sell products, offer services, request products they cannot find, and connect directly with sellers.",
  openGraph: {
    title: 'SELPLAS — Find it. Sell it. Request it.',
    description:
      "Nigeria's modern marketplace to buy products, offer services, post buyer requests, and connect directly with sellers via WhatsApp.",
    type: 'website',
    locale: 'en_NG',
    siteName: 'SELPLAS Marketplace',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'SELPLAS — Find it. Sell it. Request it.',
    description:
      "Nigeria's modern marketplace to buy products, offer services, post buyer requests, and connect directly with sellers.",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link
          href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@500;600&family=Outfit:wght@600;700;800&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body
        suppressHydrationWarning
        className="min-h-screen flex flex-col bg-[#F8FAFF] text-[#0F172A] font-sans antialiased selection:bg-blue-600 selection:text-white"
      >
        <MarketplaceProvider>
          <Navbar />
          <main className="flex-1 pb-20 md:pb-0">{children}</main>
          <Footer />
          <MobileBottomNav />
        </MarketplaceProvider>
      </body>
    </html>
  );
}
