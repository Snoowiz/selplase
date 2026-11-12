import React from 'react';
import type { Metadata } from 'next';
import { INITIAL_LISTINGS } from '@/lib/data/mock-marketplace';
import { formatNaira } from '@/lib/utils/formatters';
import { ListingDetailClient } from '@/components/marketplace/ListingDetailClient';

interface PageProps {
  params: Promise<{ id: string }>;
}

/**
 * Prepares Open Graph metadata for rich WhatsApp link previews.
 */
export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { id } = await params;
  const item = INITIAL_LISTINGS.find((l) => l.id === id || l.slug === id);

  if (!item) {
    return {
      title: 'Listing Details | SELPLAS Marketplace',
      description:
        'View product and service details on SELPLAS — Find it. Sell it. Request it.',
    };
  }

  const priceFormatted =
    item.type === 'service'
      ? `From ${formatNaira(item.priceNaira)}`
      : formatNaira(item.priceNaira);

  const ogTitle = `${item.title} (${priceFormatted}) — SELPLAS`;
  const ogDescription = `${item.type.toUpperCase()} in ${item.area}, ${
    item.state
  } · ${item.condition}. ${item.description}`;

  return {
    title: ogTitle,
    description: ogDescription,
    openGraph: {
      title: ogTitle,
      description: ogDescription,
      type: 'website',
      locale: 'en_NG',
      siteName: 'SELPLAS Nigeria',
    },
    twitter: {
      card: 'summary_large_image',
      title: ogTitle,
      description: ogDescription,
    },
  };
}

export default async function ListingDetailPage({ params }: PageProps) {
  const { id } = await params;
  return <ListingDetailClient listingId={id} />;
}
