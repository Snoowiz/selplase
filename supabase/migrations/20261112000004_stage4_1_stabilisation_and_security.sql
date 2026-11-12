-- ============================================================================
-- Selplase — Stage 4.1: Authentication, Onboarding & Database Stabilisation
-- Migration: 20261112000004_stage4_1_stabilisation_and_security.sql
-- ============================================================================
-- Corrective & Hardening Changes:
--   1. Removes automatic 'Lagos' default on un-onboarded `public.profiles` rows
--      so a user must explicitly select and confirm their Nigerian state and
--      city/town during onboarding.
--   2. Enforces terminal offer status transitions on `public.request_offers`:
--      once a buyer transitions an offer from `pending` to `accepted` or
--      `declined`, neither the buyer nor the seller can reverse or alter it.
--   3. Protects privileged & system-maintained columns on `public.listings`
--      (`featured`, `views_count`, `seller_id`, `slug`, `id`, `created_at`) via
--      column-level REVOKE/GRANT and a BEFORE INSERT OR UPDATE security trigger.
--   4. Protects system-maintained columns on `public.buyer_requests`
--      (`offers_count`, `buyer_id`, `id`, `created_at`).
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. ENSURE EXPLICIT SELECT / DELETE TABLE GRANTS & REMOVE UNCONFIRMED 'Lagos' DEFAULTS
-- ----------------------------------------------------------------------------
GRANT SELECT ON public.profiles TO authenticated;
GRANT SELECT ON public.listings, public.buyer_requests TO anon, authenticated;
GRANT SELECT ON public.request_offers TO authenticated;
GRANT DELETE ON public.listings, public.buyer_requests, public.request_offers TO authenticated;

ALTER TABLE public.profiles
  ALTER COLUMN state SET DEFAULT '',
  ALTER COLUMN city SET DEFAULT '';

-- Backfill any existing un-onboarded profile rows that still have placeholder
-- 'Lagos' defaults so onboarding requires explicit location confirmation.
UPDATE public.profiles
SET state = '',
    city = ''
WHERE onboarding_completed = false
  AND whatsapp_number IS NULL
  AND state = 'Lagos'
  AND city = 'Lagos';

-- Update handle_new_auth_user() so new OAuth accounts start with empty unconfirmed
-- state/city unless valid onboarding metadata was explicitly provided.
CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  raw_display_name text;
  raw_avatar text;
  raw_whatsapp text;
  raw_calling text;
  raw_state text;
  raw_city text;
  raw_role text;
  can_complete_onboarding boolean := false;
BEGIN
  raw_display_name := coalesce(
    nullif(btrim(NEW.raw_user_meta_data ->> 'display_name'), ''),
    nullif(btrim(NEW.raw_user_meta_data ->> 'full_name'), ''),
    nullif(btrim(NEW.raw_user_meta_data ->> 'name'), ''),
    split_part(coalesce(NEW.email, 'Selplase Member'), '@', 1)
  );
  IF char_length(raw_display_name) < 2 THEN
    raw_display_name := 'Selplase Member';
  END IF;

  raw_avatar := coalesce(
    nullif(btrim(NEW.raw_user_meta_data ->> 'avatar_url'), ''),
    nullif(btrim(NEW.raw_user_meta_data ->> 'picture'), '')
  );

  raw_whatsapp := nullif(btrim(NEW.raw_user_meta_data ->> 'whatsapp_number'), '');
  IF raw_whatsapp IS NOT NULL AND raw_whatsapp !~ '^\+234[789][01][0-9]{8}$' THEN
    raw_whatsapp := NULL;
  END IF;

  raw_calling := nullif(btrim(NEW.raw_user_meta_data ->> 'calling_number'), '');
  IF raw_calling IS NOT NULL AND raw_calling !~ '^\+234[789][01][0-9]{8}$' THEN
    raw_calling := NULL;
  END IF;

  raw_state := coalesce(nullif(btrim(NEW.raw_user_meta_data ->> 'state'), ''), '');
  raw_city := coalesce(nullif(btrim(NEW.raw_user_meta_data ->> 'city'), ''), '');
  raw_role := coalesce(nullif(btrim(NEW.raw_user_meta_data ->> 'account_role'), ''), 'both');
  IF raw_role NOT IN ('buyer', 'seller', 'both') THEN
    raw_role := 'both';
  END IF;

  can_complete_onboarding := (
    char_length(raw_display_name) >= 2
    AND raw_whatsapp IS NOT NULL
    AND char_length(raw_state) >= 2
    AND char_length(raw_city) >= 2
  );

  INSERT INTO public.profiles (
    id,
    display_name,
    email,
    whatsapp_number,
    calling_number,
    state,
    city,
    account_role,
    avatar_url,
    show_whatsapp_publicly,
    show_calling_publicly,
    verification_status,
    is_admin,
    onboarding_completed,
    onboarding_completed_at
  )
  VALUES (
    NEW.id,
    raw_display_name,
    coalesce(NEW.email, ''),
    raw_whatsapp,
    raw_calling,
    raw_state,
    raw_city,
    raw_role,
    raw_avatar,
    false,
    false,
    'unverified',
    false,
    can_complete_onboarding,
    CASE WHEN can_complete_onboarding THEN now() ELSE NULL END
  )
  ON CONFLICT (id) DO UPDATE
    SET email = EXCLUDED.email,
        avatar_url = coalesce(public.profiles.avatar_url, EXCLUDED.avatar_url),
        updated_at = now();

  RETURN NEW;
END;
$$;

-- ----------------------------------------------------------------------------
-- 2. TERMINAL OFFER DECISION ENFORCEMENT (public.request_offers)
-- ----------------------------------------------------------------------------
REVOKE INSERT, UPDATE ON public.request_offers FROM anon;
REVOKE INSERT, UPDATE ON public.request_offers FROM authenticated;

GRANT INSERT (
  request_id,
  seller_id,
  offered_price_naira,
  condition,
  location,
  note,
  status
) ON public.request_offers TO authenticated;

GRANT UPDATE (
  offered_price_naira,
  condition,
  location,
  note,
  status,
  updated_at
) ON public.request_offers TO authenticated;

CREATE OR REPLACE FUNCTION public.enforce_request_offer_update_rules()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  caller_uid uuid := (SELECT auth.uid());
  request_owner_uid uuid;
BEGIN
  IF NEW.id IS DISTINCT FROM OLD.id
     OR NEW.request_id IS DISTINCT FROM OLD.request_id
     OR NEW.seller_id IS DISTINCT FROM OLD.seller_id
     OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
    RAISE EXCEPTION 'Permission denied: offer ownership and identity fields are immutable.';
  END IF;

  -- Terminal status lock: once an offer is accepted or declined, neither the
  -- buyer nor the seller may reverse or alter the decision.
  IF OLD.status <> 'pending' THEN
    RAISE EXCEPTION 'Permission denied: offer has already been % and cannot be modified or reversed.', OLD.status;
  END IF;

  SELECT br.buyer_id INTO request_owner_uid
  FROM public.buyer_requests br
  WHERE br.id = OLD.request_id;

  IF caller_uid = OLD.seller_id AND caller_uid IS DISTINCT FROM request_owner_uid THEN
    IF NEW.status IS DISTINCT FROM OLD.status THEN
      RAISE EXCEPTION 'Permission denied: sellers cannot change offer status.';
    END IF;
    RETURN NEW;
  ELSIF caller_uid = request_owner_uid THEN
    IF NEW.offered_price_naira IS DISTINCT FROM OLD.offered_price_naira
       OR NEW.condition IS DISTINCT FROM OLD.condition
       OR NEW.location IS DISTINCT FROM OLD.location
       OR NEW.note IS DISTINCT FROM OLD.note THEN
      RAISE EXCEPTION 'Permission denied: buyers can only update offer status (accepted or declined), not seller offer terms.';
    END IF;
    IF NEW.status NOT IN ('accepted', 'declined') THEN
      RAISE EXCEPTION 'Invalid offer status transition: buyers may only transition a pending offer to accepted or declined.';
    END IF;
    RETURN NEW;
  ELSE
    RAISE EXCEPTION 'Permission denied: you are not a participant in this offer.';
  END IF;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_request_offer_update_rules ON public.request_offers;
CREATE TRIGGER trg_enforce_request_offer_update_rules
  BEFORE UPDATE ON public.request_offers
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_request_offer_update_rules();

-- ----------------------------------------------------------------------------
-- 3. PROTECT PRIVILEGED & SYSTEM-MAINTAINED LISTING FIELDS (public.listings)
-- Prevents sellers from self-assigning `featured = true`, manipulating
-- `views_count`, or changing `seller_id` / `slug` / `id` / `created_at`.
-- ----------------------------------------------------------------------------
REVOKE INSERT, UPDATE ON public.listings FROM anon;
REVOKE INSERT, UPDATE ON public.listings FROM authenticated;

GRANT INSERT (
  slug,
  seller_id,
  title,
  type,
  category,
  category_label,
  price_naira,
  price_note,
  condition,
  state,
  city,
  area,
  description,
  highlights,
  images,
  status
) ON public.listings TO authenticated;

GRANT UPDATE (
  title,
  type,
  category,
  category_label,
  price_naira,
  price_note,
  condition,
  state,
  city,
  area,
  description,
  highlights,
  images,
  status,
  updated_at
) ON public.listings TO authenticated;

CREATE OR REPLACE FUNCTION public.enforce_listing_security_invariants()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  jwt_role text := coalesce(
    current_setting('request.jwt.claim.role', true),
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role'),
    ''
  );
  caller_uid uuid := (SELECT auth.uid());
  is_admin_user boolean := false;
  is_privileged_caller boolean := false;
BEGIN
  IF caller_uid IS NOT NULL THEN
    SELECT coalesce(p.is_admin, false) INTO is_admin_user
    FROM public.profiles p
    WHERE p.id = caller_uid;
  END IF;

  is_privileged_caller := (
    jwt_role = 'service_role'
    OR session_user IN ('postgres', 'supabase_admin')
    OR is_admin_user = true
  );

  IF TG_OP = 'INSERT' THEN
    NEW.created_at := now();
    NEW.updated_at := now();
    IF NOT is_privileged_caller THEN
      NEW.featured := false;
      NEW.views_count := 0;
    END IF;
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    NEW.updated_at := now();
    NEW.created_at := OLD.created_at;
    NEW.id := OLD.id;

    IF NOT is_privileged_caller THEN
      IF NEW.seller_id IS DISTINCT FROM OLD.seller_id THEN
        RAISE EXCEPTION 'Permission denied: listing ownership (seller_id) cannot be transferred.';
      END IF;
      IF NEW.slug IS DISTINCT FROM OLD.slug THEN
        RAISE EXCEPTION 'Permission denied: listing slug is immutable.';
      END IF;
      IF NEW.featured IS DISTINCT FROM OLD.featured THEN
        RAISE EXCEPTION 'Permission denied: sellers cannot assign featured status to listings.';
      END IF;
      IF NEW.views_count IS DISTINCT FROM OLD.views_count THEN
        RAISE EXCEPTION 'Permission denied: sellers cannot modify system-maintained view counters.';
      END IF;
    END IF;

    RETURN NEW;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_listing_security_invariants ON public.listings;
CREATE TRIGGER trg_enforce_listing_security_invariants
  BEFORE INSERT OR UPDATE ON public.listings
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_listing_security_invariants();

-- ----------------------------------------------------------------------------
-- 4. PROTECT SYSTEM-MAINTAINED BUYER REQUEST FIELDS (public.buyer_requests)
-- Prevents buyers from directly tampering with `offers_count` or `buyer_id`,
-- while allowing the SECURITY DEFINER trigger `sync_buyer_request_offers_count`
-- to maintain `offers_count`.
-- ----------------------------------------------------------------------------
REVOKE INSERT, UPDATE ON public.buyer_requests FROM anon;
REVOKE INSERT, UPDATE ON public.buyer_requests FROM authenticated;

GRANT INSERT (
  buyer_id,
  title,
  request_type,
  category,
  category_label,
  budget_min_naira,
  budget_max_naira,
  preferred_condition,
  state,
  city,
  area,
  urgency,
  description,
  status
) ON public.buyer_requests TO authenticated;

GRANT UPDATE (
  title,
  request_type,
  category,
  category_label,
  budget_min_naira,
  budget_max_naira,
  preferred_condition,
  state,
  city,
  area,
  urgency,
  description,
  status,
  updated_at
) ON public.buyer_requests TO authenticated;

CREATE OR REPLACE FUNCTION public.enforce_buyer_request_security_invariants()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  jwt_role text := coalesce(
    current_setting('request.jwt.claim.role', true),
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role'),
    ''
  );
  -- Note: when `sync_buyer_request_offers_count()` (SECURITY DEFINER) runs an UPDATE
  -- on `public.buyer_requests`, `current_user` is the function owner (`postgres` / `supabase_admin`).
  is_system_or_privileged boolean := (
    jwt_role = 'service_role'
    OR current_user IN ('postgres', 'supabase_admin')
  );
BEGIN
  IF TG_OP = 'INSERT' THEN
    NEW.created_at := now();
    NEW.updated_at := now();
    IF NOT is_system_or_privileged THEN
      NEW.offers_count := 0;
    END IF;
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    NEW.updated_at := now();
    NEW.created_at := OLD.created_at;
    NEW.id := OLD.id;

    IF NOT is_system_or_privileged THEN
      IF NEW.buyer_id IS DISTINCT FROM OLD.buyer_id THEN
        RAISE EXCEPTION 'Permission denied: buyer request ownership cannot be transferred.';
      END IF;
      IF NEW.offers_count IS DISTINCT FROM OLD.offers_count THEN
        RAISE EXCEPTION 'Permission denied: offers_count is maintained automatically by the database.';
      END IF;
    END IF;

    RETURN NEW;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_buyer_request_security_invariants ON public.buyer_requests;
CREATE TRIGGER trg_enforce_buyer_request_security_invariants
  BEFORE INSERT OR UPDATE ON public.buyer_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_buyer_request_security_invariants();
