import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildListingStoragePath,
  mapDbBuyerRequestToBuyerRequest,
  mapDbListingToListing,
  validateOfferSubmission,
  validateOfferUpdate,
  validateStorageObjectOwnership,
} from './marketplace-mappers';

test('mapDbListingToListing maps PostgreSQL listing row to non-demo Listing with privacy-safe seller fields', () => {
  const mapped = mapDbListingToListing({
    id: '11111111-2222-3333-4444-555555555555',
    slug: 'macbook-pro-m3-lagos-1111',
    seller_id: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
    title: 'MacBook Pro 14 M3 Pro — 18GB RAM / 512GB SSD',
    type: 'product',
    category: 'computing',
    category_label: 'Laptops & Computing',
    price_naira: 2150000,
    price_note: 'Slightly Negotiable',
    condition: 'Brand New',
    state: 'Lagos',
    city: 'Ikeja',
    area: 'Computer Village',
    description: 'Factory sealed Apple MacBook Pro 14-inch M3 Pro chip.',
    highlights: ['AppleCare+ eligible', 'Physical inspection in Ikeja'],
    images: ['https://example.supabase.co/storage/v1/object/public/listing-images/uid/photo.jpg'],
    status: 'active',
    featured: true,
    views_count: 14,
    created_at: '2026-11-12T05:00:00Z',
    seller_display_name: 'Tunde Bakare',
    seller_state: 'Lagos',
    seller_city: 'Ikeja',
    seller_verification_status: 'unverified',
    seller_joined_at: '2026-11-01T00:00:00Z',
    seller_public_whatsapp: null,
    seller_public_calling: null,
  });

  assert.equal(mapped.isDemoData, false);
  assert.equal(mapped.seller.isDemoAccount, false);
  assert.equal(mapped.priceNaira, 2150000);
  assert.equal(mapped.seller.fullName, 'Tunde Bakare');
  assert.equal(mapped.seller.initials, 'TB');
  assert.equal(mapped.seller.whatsappPhone, '');
});

test('mapDbBuyerRequestToBuyerRequest maps PostgreSQL buyer_requests row to non-demo BuyerRequest', () => {
  const mapped = mapDbBuyerRequestToBuyerRequest({
    id: '99999999-8888-7777-6666-555555555555',
    buyer_id: 'bbbbbbbb-cccc-dddd-eeee-ffffffffffff',
    title: 'Looking for 5kVA Hybrid Solar Inverter in Abuja',
    request_type: 'product',
    category: 'home-appliances',
    category_label: 'Home & Solar Appliances',
    budget_min_naira: 650000,
    budget_max_naira: 850000,
    preferred_condition: 'Brand New',
    state: 'Abuja (FCT)',
    city: 'Wuse 2',
    area: 'Aminu Kano Crescent',
    urgency: 'This Week',
    description: 'Need a pure sine wave 5kVA inverter with warranty.',
    status: 'open',
    offers_count: 2,
    created_at: '2026-11-12T05:00:00Z',
    buyer_display_name: 'Amina Bello',
    buyer_public_whatsapp: '+2348031234567',
  });

  assert.equal(mapped.isDemoData, false);
  assert.equal(mapped.buyerName, 'Amina Bello');
  assert.equal(mapped.buyerInitials, 'AB');
  assert.equal(mapped.buyerWhatsapp, '+2348031234567');
  assert.equal(mapped.offersCount, 2);
});

test('buildListingStoragePath and validateStorageObjectOwnership enforce user folder isolation', () => {
  const userA = '123e4567-e89b-12d3-a456-426614174000';
  const userB = '987e6543-e21b-12d3-a456-426614174999';

  const objectPath = buildListingStoragePath(
    userA,
    'iPhone 16 Pro Max (Front).JPG',
    1700000000000
  );

  assert.equal(
    objectPath,
    '123e4567-e89b-12d3-a456-426614174000/1700000000000-iphone-16-pro-max-front-.jpg'
  );
  assert.equal(validateStorageObjectOwnership(userA, objectPath), true);
  assert.equal(validateStorageObjectOwnership(userB, objectPath), false);
  assert.equal(
    validateStorageObjectOwnership(userA, `${userA}/../${userB}/hack.jpg`),
    false
  );
});

test('validateOfferSubmission blocks incomplete profiles, self-offers, and invalid Naira prices', () => {
  const incompleteProfileOffer = validateOfferSubmission({
    authenticatedSellerId: 'user-456',
    buyerRequestOwnerId: 'user-123',
    offeredPriceNaira: 450000,
    location: 'Lekki Phase 1, Lagos',
    sellerOnboardingCompleted: false,
  });
  assert.equal(incompleteProfileOffer.valid, false);
  assert.equal(incompleteProfileOffer.status, 403);

  const selfOffer = validateOfferSubmission({
    authenticatedSellerId: 'user-123',
    buyerRequestOwnerId: 'user-123',
    offeredPriceNaira: 450000,
    location: 'Lekki Phase 1, Lagos',
    sellerOnboardingCompleted: true,
  });
  assert.equal(selfOffer.valid, false);
  assert.equal(selfOffer.status, 403);

  const lowPriceOffer = validateOfferSubmission({
    authenticatedSellerId: 'user-456',
    buyerRequestOwnerId: 'user-123',
    offeredPriceNaira: 100,
    location: 'Lekki Phase 1, Lagos',
    sellerOnboardingCompleted: true,
  });
  assert.equal(lowPriceOffer.valid, false);
  assert.equal(lowPriceOffer.status, 400);

  const validOffer = validateOfferSubmission({
    authenticatedSellerId: 'user-456',
    buyerRequestOwnerId: 'user-123',
    offeredPriceNaira: 450000,
    location: 'Lekki Phase 1, Lagos',
    note: 'Available for immediate inspection.',
    sellerOnboardingCompleted: true,
  });
  assert.equal(validOffer.valid, true);
  assert.equal(validOffer.status, 200);
});

test('validateOfferUpdate prevents participants from manipulating protected offer fields', () => {
  const existingOffer = {
    id: 'offer-1',
    request_id: 'req-1',
    seller_id: 'seller-999',
    status: 'pending' as const,
  };
  const buyerId = 'buyer-111';

  // Seller cannot mark their own offer accepted
  const sellerStatusTamper = validateOfferUpdate({
    authenticatedUserId: 'seller-999',
    existingOffer,
    buyerRequestOwnerId: buyerId,
    updates: { status: 'accepted' },
  });
  assert.equal(sellerStatusTamper.valid, false);
  assert.equal(sellerStatusTamper.status, 403);

  // Buyer cannot alter seller's offered_price_naira
  const buyerPriceTamper = validateOfferUpdate({
    authenticatedUserId: buyerId,
    existingOffer,
    buyerRequestOwnerId: buyerId,
    updates: { offered_price_naira: 5000, status: 'accepted' },
  });
  assert.equal(buyerPriceTamper.valid, false);
  assert.equal(buyerPriceTamper.status, 403);

  // Neither participant can change seller_id
  const ownershipTamper = validateOfferUpdate({
    authenticatedUserId: 'seller-999',
    existingOffer,
    buyerRequestOwnerId: buyerId,
    updates: { seller_id: 'someone-else' },
  });
  assert.equal(ownershipTamper.valid, false);
  assert.equal(ownershipTamper.status, 403);

  // Buyer can accept the offer
  const validBuyerAccept = validateOfferUpdate({
    authenticatedUserId: buyerId,
    existingOffer,
    buyerRequestOwnerId: buyerId,
    updates: { status: 'accepted' },
  });
  assert.equal(validBuyerAccept.valid, true);
  assert.equal(validBuyerAccept.sanitizedUpdates?.status, 'accepted');
});
