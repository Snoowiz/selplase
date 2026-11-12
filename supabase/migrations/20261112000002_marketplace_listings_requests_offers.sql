-- ============================================================================
-- SELPLAS — Stage 3: Marketplace Listings, Buyer Requests, Offers & Storage RLS
-- Migration: 20261112000002_marketplace_listings_requests_offers.sql
-- ============================================================================
-- Creates:
--   1. public.listings (linked to public.profiles(id))
--   2. public.buyer_requests (linked to public.profiles(id))
--   3. public.request_offers (linked to public.buyer_requests(id) & public.profiles(id))
--   4. Row Level Security (RLS) policies for all 3 marketplace tables
--   5. Privacy-preserving read RPCs joining public seller/buyer fields from public.profiles
--   6. Supabase Storage bucket `listing-images` and folder-scoped RLS policies
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 0. ENSURE public.profiles EXISTS (Safe if Stage 2 migration already ran)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text NOT NULL CHECK (char_length(trim(display_name)) >= 2),
  email text NOT NULL,
  whatsapp_number text NULL CHECK (
    whatsapp_number IS NULL OR whatsapp_number ~ '^\+234[789][01][0-9]{8}$'
  ),
  calling_number text NULL CHECK (
    calling_number IS NULL OR calling_number ~ '^\+234[789][01][0-9]{8}$'
  ),
  state text NOT NULL DEFAULT 'Lagos',
  city text NOT NULL DEFAULT 'Lagos',
  account_role text NOT NULL DEFAULT 'both' CHECK (
    account_role IN ('buyer', 'seller', 'both')
  ),
  avatar_url text NULL,
  show_whatsapp_publicly boolean NOT NULL DEFAULT false,
  show_calling_publicly boolean NOT NULL DEFAULT false,
  verification_status text NOT NULL DEFAULT 'unverified' CHECK (
    verification_status IN ('unverified', 'pending', 'verified')
  ),
  is_admin boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ----------------------------------------------------------------------------
-- 1. TABLE: public.listings
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.listings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  seller_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title text NOT NULL CHECK (char_length(btrim(title)) BETWEEN 5 AND 140),
  type text NOT NULL CHECK (type IN ('product', 'service')),
  category text NOT NULL,
  category_label text NOT NULL,
  price_naira bigint NOT NULL CHECK (price_naira >= 500),
  price_note text NOT NULL DEFAULT 'Negotiable',
  condition text NOT NULL,
  state text NOT NULL,
  city text NOT NULL CHECK (char_length(btrim(city)) BETWEEN 2 AND 80),
  area text NOT NULL DEFAULT '',
  description text NOT NULL CHECK (char_length(btrim(description)) BETWEEN 10 AND 4000),
  highlights text[] NOT NULL DEFAULT '{}'::text[],
  images text[] NOT NULL DEFAULT '{}'::text[],
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'sold', 'archived')),
  featured boolean NOT NULL DEFAULT false,
  views_count integer NOT NULL DEFAULT 0 CHECK (views_count >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_listings_seller_id ON public.listings(seller_id);
CREATE INDEX IF NOT EXISTS idx_listings_status_created_at ON public.listings(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_listings_category_state ON public.listings(category, state);

-- ----------------------------------------------------------------------------
-- 2. TABLE: public.buyer_requests
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.buyer_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  buyer_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title text NOT NULL CHECK (char_length(btrim(title)) BETWEEN 5 AND 140),
  request_type text NOT NULL CHECK (request_type IN ('product', 'service')),
  category text NOT NULL,
  category_label text NOT NULL,
  budget_min_naira bigint NOT NULL CHECK (budget_min_naira >= 500),
  budget_max_naira bigint NOT NULL CHECK (budget_max_naira >= budget_min_naira),
  preferred_condition text NOT NULL,
  state text NOT NULL,
  city text NOT NULL CHECK (char_length(btrim(city)) BETWEEN 2 AND 80),
  area text NOT NULL DEFAULT '',
  urgency text NOT NULL CHECK (urgency IN ('Urgent (Within 48h)', 'This Week', 'Flexible')),
  description text NOT NULL CHECK (char_length(btrim(description)) BETWEEN 10 AND 4000),
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'fulfilled', 'closed')),
  offers_count integer NOT NULL DEFAULT 0 CHECK (offers_count >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_buyer_requests_buyer_id ON public.buyer_requests(buyer_id);
CREATE INDEX IF NOT EXISTS idx_buyer_requests_status_created_at ON public.buyer_requests(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_buyer_requests_category_state ON public.buyer_requests(category, state);

-- ----------------------------------------------------------------------------
-- 3. TABLE: public.request_offers
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.request_offers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL REFERENCES public.buyer_requests(id) ON DELETE CASCADE,
  seller_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  offered_price_naira bigint NOT NULL CHECK (offered_price_naira >= 500),
  condition text NOT NULL,
  location text NOT NULL CHECK (char_length(btrim(location)) BETWEEN 2 AND 120),
  note text NOT NULL DEFAULT '' CHECK (char_length(note) <= 1000),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT request_offers_unique_seller_per_request UNIQUE (request_id, seller_id)
);

CREATE INDEX IF NOT EXISTS idx_request_offers_request_id ON public.request_offers(request_id);
CREATE INDEX IF NOT EXISTS idx_request_offers_seller_id ON public.request_offers(seller_id);

-- ----------------------------------------------------------------------------
-- 4. TRIGGERS: updated_at & offer counter maintenance
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.touch_marketplace_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_listings_updated_at ON public.listings;
CREATE TRIGGER trg_listings_updated_at
  BEFORE UPDATE ON public.listings
  FOR EACH ROW
  EXECUTE FUNCTION public.touch_marketplace_updated_at();

DROP TRIGGER IF EXISTS trg_buyer_requests_updated_at ON public.buyer_requests;
CREATE TRIGGER trg_buyer_requests_updated_at
  BEFORE UPDATE ON public.buyer_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.touch_marketplace_updated_at();

DROP TRIGGER IF EXISTS trg_request_offers_updated_at ON public.request_offers;
CREATE TRIGGER trg_request_offers_updated_at
  BEFORE UPDATE ON public.request_offers
  FOR EACH ROW
  EXECUTE FUNCTION public.touch_marketplace_updated_at();

CREATE OR REPLACE FUNCTION public.sync_buyer_request_offers_count()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.buyer_requests
    SET offers_count = offers_count + 1,
        updated_at = now()
    WHERE id = NEW.request_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.buyer_requests
    SET offers_count = GREATEST(0, offers_count - 1),
        updated_at = now()
    WHERE id = OLD.request_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_request_offers_count ON public.request_offers;
CREATE TRIGGER trg_sync_request_offers_count
  AFTER INSERT OR DELETE ON public.request_offers
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_buyer_request_offers_count();

-- ----------------------------------------------------------------------------
-- 5. ROW LEVEL SECURITY (RLS) POLICIES
-- ----------------------------------------------------------------------------

-- 5A. public.listings RLS
ALTER TABLE public.listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.listings FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "listings_select_public_or_own" ON public.listings;
CREATE POLICY "listings_select_public_or_own"
  ON public.listings
  FOR SELECT
  TO anon, authenticated
  USING (
    status = 'active'
    OR (SELECT auth.uid()) = seller_id
  );

DROP POLICY IF EXISTS "listings_insert_own" ON public.listings;
CREATE POLICY "listings_insert_own"
  ON public.listings
  FOR INSERT
  TO authenticated
  WITH CHECK (
    (SELECT auth.uid()) = seller_id
  );

DROP POLICY IF EXISTS "listings_update_own" ON public.listings;
CREATE POLICY "listings_update_own"
  ON public.listings
  FOR UPDATE
  TO authenticated
  USING ((SELECT auth.uid()) = seller_id)
  WITH CHECK ((SELECT auth.uid()) = seller_id);

DROP POLICY IF EXISTS "listings_delete_own" ON public.listings;
CREATE POLICY "listings_delete_own"
  ON public.listings
  FOR DELETE
  TO authenticated
  USING ((SELECT auth.uid()) = seller_id);

-- 5B. public.buyer_requests RLS
ALTER TABLE public.buyer_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.buyer_requests FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "buyer_requests_select_open_or_own" ON public.buyer_requests;
CREATE POLICY "buyer_requests_select_open_or_own"
  ON public.buyer_requests
  FOR SELECT
  TO anon, authenticated
  USING (
    status = 'open'
    OR (SELECT auth.uid()) = buyer_id
  );

DROP POLICY IF EXISTS "buyer_requests_insert_own" ON public.buyer_requests;
CREATE POLICY "buyer_requests_insert_own"
  ON public.buyer_requests
  FOR INSERT
  TO authenticated
  WITH CHECK (
    (SELECT auth.uid()) = buyer_id
  );

DROP POLICY IF EXISTS "buyer_requests_update_own" ON public.buyer_requests;
CREATE POLICY "buyer_requests_update_own"
  ON public.buyer_requests
  FOR UPDATE
  TO authenticated
  USING ((SELECT auth.uid()) = buyer_id)
  WITH CHECK ((SELECT auth.uid()) = buyer_id);

DROP POLICY IF EXISTS "buyer_requests_delete_own" ON public.buyer_requests;
CREATE POLICY "buyer_requests_delete_own"
  ON public.buyer_requests
  FOR DELETE
  TO authenticated
  USING ((SELECT auth.uid()) = buyer_id);

-- 5C. public.request_offers RLS
ALTER TABLE public.request_offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.request_offers FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "request_offers_select_participants" ON public.request_offers;
CREATE POLICY "request_offers_select_participants"
  ON public.request_offers
  FOR SELECT
  TO authenticated
  USING (
    (SELECT auth.uid()) = seller_id
    OR EXISTS (
      SELECT 1
      FROM public.buyer_requests br
      WHERE br.id = request_offers.request_id
        AND br.buyer_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "request_offers_insert_seller" ON public.request_offers;
CREATE POLICY "request_offers_insert_seller"
  ON public.request_offers
  FOR INSERT
  TO authenticated
  WITH CHECK (
    (SELECT auth.uid()) = seller_id
    AND NOT EXISTS (
      SELECT 1
      FROM public.buyer_requests br
      WHERE br.id = request_id
        AND br.buyer_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "request_offers_update_participants" ON public.request_offers;
CREATE POLICY "request_offers_update_participants"
  ON public.request_offers
  FOR UPDATE
  TO authenticated
  USING (
    (SELECT auth.uid()) = seller_id
    OR EXISTS (
      SELECT 1
      FROM public.buyer_requests br
      WHERE br.id = request_offers.request_id
        AND br.buyer_id = (SELECT auth.uid())
    )
  )
  WITH CHECK (
    (SELECT auth.uid()) = seller_id
    OR EXISTS (
      SELECT 1
      FROM public.buyer_requests br
      WHERE br.id = request_offers.request_id
        AND br.buyer_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "request_offers_delete_seller" ON public.request_offers;
CREATE POLICY "request_offers_delete_seller"
  ON public.request_offers
  FOR DELETE
  TO authenticated
  USING ((SELECT auth.uid()) = seller_id);

-- ----------------------------------------------------------------------------
-- 6. PRIVACY-PRESERVING MARKETPLACE READ FUNCTIONS
-- Joins listings / buyer_requests with public.profiles while respecting
-- `show_whatsapp_publicly` & `show_calling_publicly` and never exposing `email`.
-- ----------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.get_marketplace_listings();
CREATE OR REPLACE FUNCTION public.get_marketplace_listings()
RETURNS TABLE (
  id uuid,
  slug text,
  seller_id uuid,
  title text,
  type text,
  category text,
  category_label text,
  price_naira bigint,
  price_note text,
  condition text,
  state text,
  city text,
  area text,
  description text,
  highlights text[],
  images text[],
  status text,
  featured boolean,
  views_count integer,
  created_at timestamptz,
  seller_display_name text,
  seller_state text,
  seller_city text,
  seller_verification_status text,
  seller_joined_at timestamptz,
  seller_public_whatsapp text,
  seller_public_calling text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    l.id,
    l.slug,
    l.seller_id,
    l.title,
    l.type,
    l.category,
    l.category_label,
    l.price_naira,
    l.price_note,
    l.condition,
    l.state,
    l.city,
    l.area,
    l.description,
    l.highlights,
    l.images,
    l.status,
    l.featured,
    l.views_count,
    l.created_at,
    p.display_name AS seller_display_name,
    p.state AS seller_state,
    p.city AS seller_city,
    p.verification_status AS seller_verification_status,
    p.created_at AS seller_joined_at,
    CASE WHEN p.show_whatsapp_publicly THEN p.whatsapp_number ELSE NULL END AS seller_public_whatsapp,
    CASE WHEN p.show_calling_publicly THEN p.calling_number ELSE NULL END AS seller_public_calling
  FROM public.listings l
  JOIN public.profiles p ON p.id = l.seller_id
  WHERE l.status = 'active'
  ORDER BY l.created_at DESC;
$$;

GRANT EXECUTE ON FUNCTION public.get_marketplace_listings() TO anon, authenticated;

DROP FUNCTION IF EXISTS public.get_marketplace_buyer_requests();
CREATE OR REPLACE FUNCTION public.get_marketplace_buyer_requests()
RETURNS TABLE (
  id uuid,
  buyer_id uuid,
  title text,
  request_type text,
  category text,
  category_label text,
  budget_min_naira bigint,
  budget_max_naira bigint,
  preferred_condition text,
  state text,
  city text,
  area text,
  urgency text,
  description text,
  status text,
  offers_count integer,
  created_at timestamptz,
  buyer_display_name text,
  buyer_public_whatsapp text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    br.id,
    br.buyer_id,
    br.title,
    br.request_type,
    br.category,
    br.category_label,
    br.budget_min_naira,
    br.budget_max_naira,
    br.preferred_condition,
    br.state,
    br.city,
    br.area,
    br.urgency,
    br.description,
    br.status,
    br.offers_count,
    br.created_at,
    p.display_name AS buyer_display_name,
    CASE WHEN p.show_whatsapp_publicly THEN p.whatsapp_number ELSE NULL END AS buyer_public_whatsapp
  FROM public.buyer_requests br
  JOIN public.profiles p ON p.id = br.buyer_id
  WHERE br.status = 'open'
  ORDER BY br.created_at DESC;
$$;

GRANT EXECUTE ON FUNCTION public.get_marketplace_buyer_requests() TO anon, authenticated;

-- ----------------------------------------------------------------------------
-- 7. SUPABASE STORAGE BUCKET & RLS POLICIES (`listing-images`)
-- ----------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'listing-images',
  'listing-images',
  true,
  5242880, -- 5 MB max per image
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE
SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "listing_images_public_read" ON storage.objects;
CREATE POLICY "listing_images_public_read"
  ON storage.objects
  FOR SELECT
  TO anon, authenticated
  USING (bucket_id = 'listing-images');

DROP POLICY IF EXISTS "listing_images_auth_insert" ON storage.objects;
CREATE POLICY "listing_images_auth_insert"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'listing-images'
    AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
  );

DROP POLICY IF EXISTS "listing_images_auth_update" ON storage.objects;
CREATE POLICY "listing_images_auth_update"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'listing-images'
    AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
  )
  WITH CHECK (
    bucket_id = 'listing-images'
    AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
  );

DROP POLICY IF EXISTS "listing_images_auth_delete" ON storage.objects;
CREATE POLICY "listing_images_auth_delete"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'listing-images'
    AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
  );
