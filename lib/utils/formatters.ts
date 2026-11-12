import type {
  BuyerRequest,
  CreateListingInput,
  CreateRequestInput,
  Listing,
  ListingFilterParams,
  RequestFilterParams,
} from '../types/marketplace';

/**
 * Formats a number in Nigerian Naira (₦) with comma separators.
 * Example: 1350000 -> "₦1,350,000"
 */
export function formatNaira(amount: number): string {
  if (!Number.isFinite(amount) || amount < 0) {
    return '₦0';
  }
  return `₦${Math.round(amount).toLocaleString('en-NG')}`;
}

/**
 * Formats a compact Naira amount for tight badges or budget summaries.
 * Example: 80000 -> "₦80k", 1350000 -> "₦1.35M"
 */
export function formatCompactNaira(amount: number): string {
  if (!Number.isFinite(amount) || amount <= 0) return '₦0';
  if (amount >= 1_000_000) {
    const millions = amount / 1_000_000;
    const formatted = Number.isInteger(millions)
      ? millions.toString()
      : millions.toFixed(2).replace(/\.?0+$/, '');
    return `₦${formatted}M`;
  }
  if (amount >= 1_000) {
    const thousands = Math.round(amount / 1_000);
    return `₦${thousands}k`;
  }
  return `₦${amount}`;
}

/**
 * Formats a buyer request budget range in Nigerian Naira.
 */
export function formatBudgetRange(minNaira: number, maxNaira: number): string {
  if (minNaira > 0 && maxNaira > 0 && minNaira !== maxNaira) {
    return `${formatCompactNaira(minNaira)} – ${formatCompactNaira(maxNaira)}`;
  }
  return formatNaira(maxNaira || minNaira || 0);
}

/**
 * Generates a WhatsApp share URL (`https://wa.me/?text=...`) containing the
 * listing or request title, price/budget, location, and canonical share URL.
 */
export function buildWhatsAppShareUrl(params: {
  title: string;
  priceText: string;
  location: string;
  url: string;
  type: 'product' | 'service' | 'request';
}): string {
  const { title, priceText, location, url, type } = params;
  const label =
    type === 'request'
      ? `Buyer Request on SELPLAS`
      : type === 'service'
        ? `Service on SELPLAS`
        : `For Sale on SELPLAS`;

  const message = `${label}: *${title}*\n${
    type === 'request' ? 'Budget' : 'Price'
  }: ${priceText}\nLocation: ${location}\n\nView details on SELPLAS: ${url}`;

  return `https://wa.me/?text=${encodeURIComponent(message)}`;
}

/**
 * Generates a direct WhatsApp message link to contact a seller or buyer.
 */
export function buildWhatsAppContactUrl(params: {
  phone?: string;
  recipientName: string;
  itemTitle: string;
  priceText: string;
  url: string;
  mode: 'inquire-listing' | 'offer-request';
}): string {
  const { phone, recipientName, itemTitle, priceText, url, mode } = params;
  const digitsOnly = (phone || '').replace(/\D/g, '');
  const normalizedPhone = digitsOnly.startsWith('0')
    ? `234${digitsOnly.slice(1)}`
    : digitsOnly;

  const text =
    mode === 'offer-request'
      ? `Hello ${recipientName}, I saw your buyer request on SELPLAS for "${itemTitle}" (${priceText}). I have this available! View request: ${url}`
      : `Hello ${recipientName}, I am interested in your listing on SELPLAS: "${itemTitle}" (${priceText}). Is it still available? Link: ${url}`;

  const base = normalizedPhone
    ? `https://wa.me/${normalizedPhone}`
    : `https://wa.me/`;

  return `${base}?text=${encodeURIComponent(text)}`;
}

/**
 * Generates a standard tel: URI for calling a Nigerian seller number.
 */
export function buildTelCallUrl(phone?: string): string {
  const digitsOnly = (phone || '').replace(/\D/g, '');
  if (!digitsOnly) return 'tel:+2348030001122';
  const normalized = digitsOnly.startsWith('0')
    ? `+234${digitsOnly.slice(1)}`
    : digitsOnly.startsWith('234')
      ? `+${digitsOnly}`
      : digitsOnly;
  return `tel:${normalized}`;
}

/**
 * Filters and sorts marketplace listings (products & services).
 */
export function filterListings(
  listings: Listing[],
  filters: ListingFilterParams
): Listing[] {
  const query = (filters.query || '').trim().toLowerCase();
  const type = filters.type || 'all';
  const category = filters.category || 'all';
  const state = filters.state || 'all';
  const condition = filters.condition || 'all';
  const minPrice = filters.minPrice;
  const maxPrice = filters.maxPrice;
  const sortBy = filters.sortBy || 'featured';

  const filtered = listings.filter((item) => {
    if (type !== 'all' && item.type !== type) return false;
    if (category !== 'all' && item.category !== category) return false;
    if (state !== 'all' && item.state.toLowerCase() !== state.toLowerCase()) {
      return false;
    }
    if (condition !== 'all' && item.condition !== condition) return false;
    if (typeof minPrice === 'number' && minPrice > 0 && item.priceNaira < minPrice) {
      return false;
    }
    if (typeof maxPrice === 'number' && maxPrice > 0 && item.priceNaira > maxPrice) {
      return false;
    }
    if (query) {
      const haystack = [
        item.title,
        item.description,
        item.categoryLabel,
        item.state,
        item.city,
        item.area,
        item.seller.fullName,
        ...item.highlights,
      ]
        .join(' ')
        .toLowerCase();
      if (!haystack.includes(query)) return false;
    }
    return true;
  });

  return [...filtered].sort((a, b) => {
    if (sortBy === 'price-asc') return a.priceNaira - b.priceNaira;
    if (sortBy === 'price-desc') return b.priceNaira - a.priceNaira;
    if (sortBy === 'newest') {
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    }
    // Default: featured first, then newest
    const aScore = (a.featured ? 2 : 0) + (a.topRated ? 1 : 0);
    const bScore = (b.featured ? 2 : 0) + (b.topRated ? 1 : 0);
    if (bScore !== aScore) return bScore - aScore;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });
}

/**
 * Filters buyer requests by keyword, type, category, Nigerian state, and urgency.
 */
export function filterBuyerRequests(
  requests: BuyerRequest[],
  filters: RequestFilterParams
): BuyerRequest[] {
  const query = (filters.query || '').trim().toLowerCase();
  const requestType = filters.requestType || 'all';
  const category = filters.category || 'all';
  const state = filters.state || 'all';
  const urgency = filters.urgency || 'all';

  return requests.filter((req) => {
    if (requestType !== 'all' && req.requestType !== requestType) return false;
    if (category !== 'all' && req.category !== category) return false;
    if (state !== 'all' && req.state.toLowerCase() !== state.toLowerCase()) {
      return false;
    }
    if (urgency !== 'all' && req.urgency !== urgency) return false;
    if (query) {
      const haystack = [
        req.title,
        req.description,
        req.categoryLabel,
        req.state,
        req.city,
        req.area,
        req.buyerName,
      ]
        .join(' ')
        .toLowerCase();
      if (!haystack.includes(query)) return false;
    }
    return true;
  });
}

/**
 * Validates Create Listing input across steps.
 */
export function validateCreateListing(input: Partial<CreateListingInput>): {
  valid: boolean;
  errors: Record<string, string>;
} {
  const errors: Record<string, string> = {};

  if (!input.title || input.title.trim().length < 5) {
    errors.title = 'Please enter a descriptive listing title (at least 5 characters).';
  }
  if (!input.category) {
    errors.category = 'Please choose a marketplace category.';
  }
  if (
    typeof input.priceNaira !== 'number' ||
    Number.isNaN(input.priceNaira) ||
    input.priceNaira < 500
  ) {
    errors.priceNaira = 'Please enter a valid price in Naira (minimum ₦500).';
  }
  if (!input.state || !input.state.trim()) {
    errors.state = 'Please select a Nigerian state.';
  }
  if (!input.city || !input.city.trim()) {
    errors.city = 'Please enter the city or area (e.g., Lekki Phase 1, Wuse 2).';
  }
  if (!input.description || input.description.trim().length < 15) {
    errors.description =
      'Please provide at least 15 characters describing the item or service.';
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}

/**
 * Validates Create Buyer Request input.
 */
export function validateCreateRequest(input: Partial<CreateRequestInput>): {
  valid: boolean;
  errors: Record<string, string>;
} {
  const errors: Record<string, string> = {};

  if (!input.title || input.title.trim().length < 5) {
    errors.title = 'Please describe what you are looking for (at least 5 characters).';
  }
  if (!input.category) {
    errors.category = 'Please select a category for your request.';
  }
  if (
    typeof input.budgetMaxNaira !== 'number' ||
    Number.isNaN(input.budgetMaxNaira) ||
    input.budgetMaxNaira < 1000
  ) {
    errors.budgetMaxNaira = 'Please enter your maximum budget in Naira (at least ₦1,000).';
  }
  if (
    typeof input.budgetMinNaira === 'number' &&
    typeof input.budgetMaxNaira === 'number' &&
    input.budgetMinNaira > input.budgetMaxNaira
  ) {
    errors.budgetMinNaira = 'Minimum budget cannot exceed maximum budget.';
  }
  if (!input.state || !input.state.trim()) {
    errors.state = 'Please select your preferred Nigerian state.';
  }
  if (!input.city || !input.city.trim()) {
    errors.city = 'Please enter your preferred city or area.';
  }
  if (!input.description || input.description.trim().length < 12) {
    errors.description =
      'Please include a brief description or specifications (at least 12 characters).';
  }
  if (!input.buyerName || input.buyerName.trim().length < 2) {
    errors.buyerName = 'Please enter your name so sellers know who to contact.';
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}
