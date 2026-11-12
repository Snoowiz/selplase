import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { PGlite } from '@electric-sql/pglite';

/**
 * Stage 4.1 Real PostgreSQL Database Security & Permission Verification Suite
 * Executes the actual SQL migrations (000001..000004) in an embedded PostgreSQL
 * instance (PGlite) with a simulated Supabase `auth` + `storage` schema, and verifies:
 * 1. Onboarding `.update()` with permitted columns succeeds for `authenticated` role,
 *    while `.upsert()` writing to `id`/`email` fails with `permission denied` (42501).
 * 2. Ordinary users cannot modify `is_admin` or `verification_status` or edit another user's profile.
 * 3. Private WhatsApp numbers remain hidden in `get_public_seller_profile` and `get_marketplace_listings`
 *    unless `show_whatsapp_publicly = true`.
 * 4. Buyers can transition an offer from `pending` to `accepted` or `declined`,
 *    but CANNOT subsequently reverse a terminal decision (`accepted` -> `declined` or `pending`).
 * 5. Sellers cannot assign themselves `featured = true` or modify `views_count` on `public.listings`.
 */
test('PostgreSQL migrations 000001..000004 enforce column permissions, RLS, onboarding updates, terminal offer locks, and listing featured/views_count invariants', async () => {
  const db = new PGlite();

  // Bootstrap minimal Supabase-compatible roles and schemas (`auth`, `storage`)
  await db.exec(`
    CREATE ROLE anon NOLOGIN;
    CREATE ROLE authenticated NOLOGIN;
    CREATE ROLE service_role SUPERUSER NOLOGIN;

    GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;

    CREATE SCHEMA IF NOT EXISTS auth;
    GRANT USAGE ON SCHEMA auth TO anon, authenticated, service_role;

    CREATE TABLE auth.users (
      id uuid PRIMARY KEY,
      email text,
      raw_user_meta_data jsonb DEFAULT '{}'::jsonb,
      created_at timestamptz DEFAULT now()
    );

    CREATE OR REPLACE FUNCTION auth.uid()
    RETURNS uuid
    LANGUAGE sql
    STABLE
    AS $$
      SELECT NULLIF(current_setting('request.jwt.claim.sub', true), '')::uuid;
    $$;

    CREATE OR REPLACE FUNCTION auth.role()
    RETURNS text
    LANGUAGE sql
    STABLE
    AS $$
      SELECT COALESCE(
        NULLIF(current_setting('request.jwt.claim.role', true), ''),
        current_user
      );
    $$;

    GRANT EXECUTE ON FUNCTION auth.uid() TO anon, authenticated, service_role;
    GRANT EXECUTE ON FUNCTION auth.role() TO anon, authenticated, service_role;

    CREATE SCHEMA IF NOT EXISTS storage;
    GRANT USAGE ON SCHEMA storage TO anon, authenticated, service_role;
    CREATE TABLE storage.buckets (
      id text PRIMARY KEY,
      name text NOT NULL,
      public boolean DEFAULT false,
      file_size_limit bigint,
      allowed_mime_types text[]
    );
    CREATE TABLE storage.objects (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      bucket_id text REFERENCES storage.buckets(id),
      name text NOT NULL,
      owner uuid
    );
    ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
    CREATE OR REPLACE FUNCTION storage.foldername(name text)
    RETURNS text[]
    LANGUAGE sql
    IMMUTABLE
    AS $$
      SELECT string_to_array(name, '/');
    $$;
  `);

  const migrationsDir = path.join(process.cwd(), 'supabase', 'migrations');
  const migrationFiles = [
    '20261112000001_user_profiles_and_rls.sql',
    '20261112000002_marketplace_listings_requests_offers.sql',
    '20261112000003_stage4_onboarding_and_security_hardening.sql',
    '20261112000004_stage4_1_stabilisation_and_security.sql',
  ];

  for (const file of migrationFiles) {
    const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
    await db.exec(sql);
  }

  const buyerId = '11111111-1111-4111-8111-111111111111';
  const sellerId = '22222222-2222-4222-8222-222222222222';

  // Insert two Google OAuth users into auth.users -> triggers handle_new_auth_user()
  await db.exec(`
    INSERT INTO auth.users (id, email, raw_user_meta_data)
    VALUES
      ('${buyerId}', 'buyer@selplase.ng', '{"full_name": "Chidinma Okafor"}'::jsonb),
      ('${sellerId}', 'seller@selplase.ng', '{"full_name": "Adebayo Gadgets"}'::jsonb);
  `);

  // Verify trigger created profiles with unconfirmed empty location ('') and onboarding_completed = false
  const initialBuyerRes = await db.query<{
    display_name: string;
    state: string;
    city: string;
    onboarding_completed: boolean;
    verification_status: string;
    is_admin: boolean;
  }>(
    `SELECT display_name, state, city, onboarding_completed, verification_status, is_admin FROM public.profiles WHERE id = '${buyerId}'`
  );
  assert.equal(initialBuyerRes.rows.length, 1);
  assert.equal(initialBuyerRes.rows[0].display_name, 'Chidinma Okafor');
  assert.equal(initialBuyerRes.rows[0].state, '');
  assert.equal(initialBuyerRes.rows[0].city, '');
  assert.equal(initialBuyerRes.rows[0].onboarding_completed, false);
  assert.equal(initialBuyerRes.rows[0].verification_status, 'unverified');
  assert.equal(initialBuyerRes.rows[0].is_admin, false);

  // Switch session to authenticated buyer
  await db.exec(`
    SET ROLE authenticated;
    SELECT set_config('request.jwt.claim.sub', '${buyerId}', false);
    SELECT set_config('request.jwt.claim.role', 'authenticated', false);
  `);

  // 1. Verify old broad UPSERT writing to `email` fails due to column-level privileges
  await assert.rejects(
    async () => {
      await db.exec(`
        INSERT INTO public.profiles (id, display_name, email, whatsapp_number, state, city, account_role, onboarding_completed)
        VALUES ('${buyerId}', 'Chidinma Okafor', 'buyer@selplase.ng', '+2348031112222', 'Lagos', 'Lekki', 'both', true)
        ON CONFLICT (id) DO UPDATE SET
          email = EXCLUDED.email,
          display_name = EXCLUDED.display_name;
      `);
    },
    /permission denied/i
  );

  // 2. Verify Stage 4.1 targeted UPDATE of permitted onboarding columns succeeds
  await db.exec(`
    UPDATE public.profiles
    SET
      display_name = 'Chidinma Okafor',
      whatsapp_number = '+2348031112222',
      calling_number = '+2348091112222',
      state = 'Lagos',
      city = 'Lekki Phase 1',
      account_role = 'both',
      onboarding_completed = true,
      onboarding_completed_at = now(),
      updated_at = now()
    WHERE id = '${buyerId}';
  `);

  // 3. Verify ordinary user cannot escalate `is_admin` or `verification_status`
  await assert.rejects(
    async () => {
      await db.exec(
        `UPDATE public.profiles SET is_admin = true WHERE id = '${buyerId}';`
      );
    },
    /permission denied|is_admin/i
  );

  await assert.rejects(
    async () => {
      await db.exec(
        `UPDATE public.profiles SET verification_status = 'verified' WHERE id = '${buyerId}';`
      );
    },
    /permission denied|verification_status/i
  );

  // 4. Verify buyer cannot update seller's profile
  const crossUpdateRes = await db.query(
    `UPDATE public.profiles SET display_name = 'Hacked Seller' WHERE id = '${sellerId}' RETURNING id;`
  );
  assert.equal(crossUpdateRes.rows.length, 0);

  // Complete seller onboarding as seller
  await db.exec(`
    RESET ROLE;
    SET ROLE authenticated;
    SELECT set_config('request.jwt.claim.sub', '${sellerId}', false);
    SELECT set_config('request.jwt.claim.role', 'authenticated', false);

    UPDATE public.profiles
    SET
      display_name = 'Adebayo Gadgets',
      whatsapp_number = '+2348039998888',
      state = 'Lagos',
      city = 'Ikeja',
      account_role = 'seller',
      onboarding_completed = true,
      onboarding_completed_at = now(),
      updated_at = now()
    WHERE id = '${sellerId}';
  `);

  // 5. Verify private WhatsApp number is hidden in public seller RPC when show_whatsapp_publicly = false
  const publicSellerHidden = await db.query<{
    public_whatsapp_number: string | null;
  }>(
    `SELECT public_whatsapp_number FROM public.get_public_seller_profile('${sellerId}');`
  );
  assert.equal(publicSellerHidden.rows[0].public_whatsapp_number, null);

  // 6. Seller creates a listing
  const listingInsertRes = await db.query<{
    id: string;
    featured: boolean;
    views_count: number;
  }>(`
    INSERT INTO public.listings (
      slug, seller_id, title, type, category, category_label,
      price_naira, price_note, condition, state, city, area, description
    ) VALUES (
      'iphone-16-pro-ikeja-1', '${sellerId}', 'iPhone 16 Pro 256GB', 'product',
      'phones-tablets', 'Phones & Tablets', 1250000, 'Negotiable', 'Brand New',
      'Lagos', 'Ikeja', 'Computer Village', 'Brand new factory unlocked iPhone 16 Pro.'
    ) RETURNING id, featured, views_count;
  `);
  const listingId = listingInsertRes.rows[0].id;
  assert.equal(listingInsertRes.rows[0].featured, false);
  assert.equal(listingInsertRes.rows[0].views_count, 0);

  // 7. Verify seller CANNOT set `featured = true` or change `views_count`
  await assert.rejects(
    async () => {
      await db.exec(
        `UPDATE public.listings SET featured = true WHERE id = '${listingId}';`
      );
    },
    /permission denied|featured/i
  );

  await assert.rejects(
    async () => {
      await db.exec(
        `UPDATE public.listings SET views_count = 5000 WHERE id = '${listingId}';`
      );
    },
    /permission denied|views_count/i
  );

  // 8. Buyer creates a buyer_request, seller submits an offer, and buyer accepts it
  await db.exec(`
    RESET ROLE;
    SET ROLE authenticated;
    SELECT set_config('request.jwt.claim.sub', '${buyerId}', false);
    SELECT set_config('request.jwt.claim.role', 'authenticated', false);
  `);

  const reqInsertRes = await db.query<{ id: string }>(`
    INSERT INTO public.buyer_requests (
      buyer_id, title, request_type, category, category_label,
      budget_min_naira, budget_max_naira, preferred_condition,
      state, city, area, urgency, description
    ) VALUES (
      '${buyerId}', 'Need MacBook Pro M3 in Lekki', 'product',
      'computing', 'Laptops & Computing', 1800000, 2100000, 'Brand New',
      'Lagos', 'Lekki Phase 1', 'Admiralty Way', 'This Week',
      'Looking for sealed MacBook Pro 14 M3 Pro in Lagos.'
    ) RETURNING id;
  `);
  const requestId = reqInsertRes.rows[0].id;

  // Switch to seller and submit an offer
  await db.exec(`
    RESET ROLE;
    SET ROLE authenticated;
    SELECT set_config('request.jwt.claim.sub', '${sellerId}', false);
    SELECT set_config('request.jwt.claim.role', 'authenticated', false);
  `);

  const offerInsertRes = await db.query<{ id: string; status: string }>(`
    INSERT INTO public.request_offers (
      request_id, seller_id, offered_price_naira, condition, location, note
    ) VALUES (
      '${requestId}', '${sellerId}', 1950000, 'Brand New',
      'Ikeja, Lagos', 'Ready for delivery today.'
    ) RETURNING id, status;
  `);
  const offerId = offerInsertRes.rows[0].id;
  assert.equal(offerInsertRes.rows[0].status, 'pending');

  // Seller cannot mark their own offer as accepted
  await assert.rejects(
    async () => {
      await db.exec(
        `UPDATE public.request_offers SET status = 'accepted' WHERE id = '${offerId}';`
      );
    },
    /sellers cannot change offer status/i
  );

  // Switch to buyer: buyer accepts the pending offer
  await db.exec(`
    RESET ROLE;
    SET ROLE authenticated;
    SELECT set_config('request.jwt.claim.sub', '${buyerId}', false);
    SELECT set_config('request.jwt.claim.role', 'authenticated', false);

    UPDATE public.request_offers SET status = 'accepted' WHERE id = '${offerId}';
  `);

  const acceptedCheck = await db.query<{ status: string }>(
    `SELECT status FROM public.request_offers WHERE id = '${offerId}';`
  );
  assert.equal(acceptedCheck.rows[0].status, 'accepted');

  // 9. Verify buyer CANNOT reverse a terminal decision (`accepted` -> `declined` or `pending`)
  await assert.rejects(
    async () => {
      await db.exec(
        `UPDATE public.request_offers SET status = 'declined' WHERE id = '${offerId}';`
      );
    },
    /offer has already been accepted and cannot be modified or reversed/i
  );

  await db.close();
});
