import test from 'node:test';
import assert from 'node:assert/strict';
import {
  formatNaira,
  formatCompactNaira,
  formatBudgetRange,
  buildWhatsAppShareUrl,
  buildTelCallUrl,
  filterListings,
  filterBuyerRequests,
  validateCreateListing,
  validateCreateRequest,
} from './formatters';
import { INITIAL_LISTINGS, INITIAL_BUYER_REQUESTS } from '../data/mock-marketplace';

test('formatNaira formats Nigerian Naira amounts accurately', () => {
  assert.equal(formatNaira(1350000), '₦1,350,000');
  assert.equal(formatNaira(50000), '₦50,000');
  assert.equal(formatNaira(0), '₦0');
  assert.equal(formatNaira(-500), '₦0');
});

test('formatCompactNaira and formatBudgetRange produce readable Naira summaries', () => {
  assert.equal(formatCompactNaira(80000), '₦80k');
  assert.equal(formatCompactNaira(1250000), '₦1.25M');
  assert.equal(formatBudgetRange(80000, 120000), '₦80k – ₦120k');
});

test('buildWhatsAppShareUrl encodes listing title, Naira price, location, and URL', () => {
  const shareUrl = buildWhatsAppShareUrl({
    title: 'iPhone 16 Pro Max 256GB',
    priceText: '₦1,350,000',
    location: 'Lekki Phase 1, Lagos',
    url: 'https://selplase.ng/listings/lst-iphone-16-pro-max',
    type: 'product',
  });
  assert.ok(shareUrl.startsWith('https://wa.me/?text='));
  const decoded = decodeURIComponent(shareUrl.replace('https://wa.me/?text=', ''));
  assert.ok(decoded.includes('iPhone 16 Pro Max 256GB'));
  assert.ok(decoded.includes('₦1,350,000'));
  assert.ok(decoded.includes('https://selplase.ng/listings/lst-iphone-16-pro-max'));
  assert.ok(decoded.includes('Selplase'));
});

test('filterListings filters by keyword, type, Nigerian state, and price range', () => {
  const lagosOnly = filterListings(INITIAL_LISTINGS, { state: 'Lagos' });
  assert.ok(lagosOnly.length > 0);
  assert.ok(lagosOnly.every((item) => item.state === 'Lagos'));

  const servicesOnly = filterListings(INITIAL_LISTINGS, { type: 'service' });
  assert.ok(servicesOnly.length > 0);
  assert.ok(servicesOnly.every((item) => item.type === 'service'));

  const searchMacbook = filterListings(INITIAL_LISTINGS, { query: 'MacBook' });
  assert.equal(searchMacbook.length, 1);
  assert.ok(searchMacbook[0].title.includes('MacBook'));
});

test('filterBuyerRequests filters requests by keyword and state', () => {
  const phRequests = filterBuyerRequests(INITIAL_BUYER_REQUESTS, {
    state: 'Rivers',
  });
  assert.ok(phRequests.length >= 1);
  assert.ok(phRequests.every((r) => r.state === 'Rivers'));
});

test('validateCreateListing rejects invalid inputs and accepts complete listings', () => {
  const invalid = validateCreateListing({
    title: 'abc',
    priceNaira: 100,
    state: '',
    city: '',
    description: 'short',
  });
  assert.equal(invalid.valid, false);
  assert.ok(invalid.errors.title);
  assert.ok(invalid.errors.priceNaira);

  const valid = validateCreateListing({
    title: 'Samsung Galaxy S24 Ultra 512GB Titanium',
    type: 'product',
    category: 'phones-tablets',
    priceNaira: 1150000,
    priceNote: 'Slightly Negotiable',
    condition: 'Foreign Used (Tokunbo)',
    state: 'Lagos',
    city: 'Ikeja',
    area: 'Computer Village',
    description: 'Clean UK used Samsung S24 Ultra with original S-Pen and box.',
    highlights: ['512GB Storage', 'Factory Unlocked'],
    images: [],
  });
  assert.equal(valid.valid, true);
});

test('validateCreateRequest validates budget bounds and required fields', () => {
  const invalidBudget = validateCreateRequest({
    title: 'Looking for Clean PS5 Slim Console',
    category: 'electronics',
    budgetMinNaira: 600000,
    budgetMaxNaira: 400000,
    state: 'Abuja (FCT)',
    city: 'Wuse 2',
    description: 'Must come with two DualSense controllers and cables.',
    buyerName: 'Chinedu',
  });
  assert.equal(invalidBudget.valid, false);
  assert.ok(invalidBudget.errors.budgetMinNaira);
});

test('buildTelCallUrl formats Nigerian phone numbers into tel:+234 links', () => {
  assert.equal(buildTelCallUrl('08030001122'), 'tel:+2348030001122');
  assert.equal(buildTelCallUrl('2348090002233'), 'tel:+2348090002233');
});
