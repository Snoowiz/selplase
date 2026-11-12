-- ============================================================================
-- Selplase — Stage 4: Google Auth Onboarding & Database Security Hardening
-- Migration: 20261112000003_stage4_onboarding_and_security_hardening.sql
-- ============================================================================
-- Fixes & Enhancements:
--   1. Adds `onboarding_completed` and `onboarding_completed_at` to `public.profiles`
--      with a strict CHECK constraint requiring compulsory fields when completed.
--   2. Hardens `public.profiles` privilege escalation protection:
--      - Revokes column-level INSERT/UPDATE on privileged columns (`is_admin`,
--        `verification_status`, `email`, `id`, `created_at`) from `anon` and `authenticated`.
--      - Replaces `enforce_profile_security_invariants()` using `SECURITY INVOKER` and
--        JWT role checks (removing the unsafe `SECURITY DEFINER` + `current_user` pattern).
--   3. Updates `handle_new_auth_user()` for Google OAuth sign-ins (`full_name`, `name`,
--      `avatar_url`, `picture`), ensuring `onboarding_completed` starts as `false` and
--      contact visibility defaults to private (`false`).
--   4. Hardens `public.request_offers` update rules so sellers and buyers cannot
--      manipulate protected ownership, offer price, or status fields arbitrarily.
--   5. Enforces `onboarding_completed = true` in RLS INSERT policies for
--      `public.listings`, `public.buyer_requests`, and `public.request_offers`.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. ADD ONBOARDING COLUMNS & COMPLETENESS CHECK TO public.profiles
-- ----------------------------------------------------------------------------
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS onboarding_completed boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS onboarding_completed_at timestamptz NULL;

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_onboarding_completeness_check;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_onboarding_completeness_check CHECK (
    onboarding_completed = false
    OR (
      char_length(btrim(display_name)) >= 2
      AND whatsapp_number IS NOT NULL
      AND whatsapp_number ~ '^\+234[789][01][0-9]{8}$'
      AND char_length(btrim(state)) >= 2
      AND char_length(btrim(city)) >= 2
      AND account_role IN ('buyer', 'seller', 'both')
    )
  );

-- ----------------------------------------------------------------------------
-- 2. COLUMN-LEVEL PRIVILEGE HARDENING ON public.profiles
-- Prevents authenticated users from updating `is_admin`, `verification_status`,
-- `email`, `id`, or `created_at` even via direct PostgREST / Supabase client calls.
-- ----------------------------------------------------------------------------
REVOKE INSERT, UPDATE ON public.profiles FROM anon;
REVOKE INSERT, UPDATE ON public.profiles FROM authenticated;

GRANT INSERT (
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
  onboarding_completed,
  onboarding_completed_at
) ON public.profiles TO authenticated;

GRANT UPDATE (
  display_name,
  whatsapp_number,
  calling_number,
  state,
  city,
  account_role,
  avatar_url,
  show_whatsapp_publicly,
  show_calling_publicly,
  onboarding_completed,
  onboarding_completed_at,
  updated_at
) ON public.profiles TO authenticated;

-- ----------------------------------------------------------------------------
-- 3. REPLACE enforce_profile_security_invariants() WITHOUT SECURITY DEFINER FLAW
-- Uses SECURITY INVOKER so `current_user` is never elevated to `postgres`, and
-- validates JWT role + compulsory onboarding fields server-side in PostgreSQL.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.enforce_profile_security_invariants()
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
  is_privileged_caller boolean := (
    jwt_role = 'service_role'
    OR session_user IN ('postgres', 'supabase_admin', 'supabase_auth_admin')
  );
  has_compulsory_onboarding_fields boolean;
BEGIN
  has_compulsory_onboarding_fields := (
    char_length(btrim(coalesce(NEW.display_name, ''))) >= 2
    AND NEW.whatsapp_number IS NOT NULL
    AND NEW.whatsapp_number ~ '^\+234[789][01][0-9]{8}$'
    AND char_length(btrim(coalesce(NEW.state, ''))) >= 2
    AND char_length(btrim(coalesce(NEW.city, ''))) >= 2
    AND NEW.account_role IN ('buyer', 'seller', 'both')
  );

  IF TG_OP = 'INSERT' THEN
    NEW.created_at := now();
    NEW.updated_at := now();

    IF NOT is_privileged_caller THEN
      NEW.verification_status := 'unverified';
      NEW.is_admin := false;
      NEW.show_whatsapp_publicly := coalesce(NEW.show_whatsapp_publicly, false);
      NEW.show_calling_publicly := coalesce(NEW.show_calling_publicly, false);
    END IF;

    IF NEW.onboarding_completed = true AND NOT has_compulsory_onboarding_fields THEN
      RAISE EXCEPTION 'Onboarding cannot be marked complete without display_name, valid Nigerian WhatsApp number (+234), state, city, and account_role.';
    END IF;

    IF NEW.onboarding_completed = true AND NEW.onboarding_completed_at IS NULL THEN
      NEW.onboarding_completed_at := now();
    ELSIF NEW.onboarding_completed = false THEN
      NEW.onboarding_completed_at := NULL;
    END IF;

    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    NEW.updated_at := now();
    NEW.created_at := OLD.created_at;
    NEW.id := OLD.id;

    IF NOT is_privileged_caller THEN
      IF NEW.is_admin IS DISTINCT FROM OLD.is_admin THEN
        RAISE EXCEPTION 'Permission denied: users cannot modify administrator privileges.';
      END IF;
      IF NEW.verification_status IS DISTINCT FROM OLD.verification_status THEN
        RAISE EXCEPTION 'Permission denied: verification status cannot be modified by the user.';
      END IF;
      IF NEW.email IS DISTINCT FROM OLD.email THEN
        RAISE EXCEPTION 'Permission denied: email is managed exclusively by Supabase Auth.';
      END IF;
    END IF;

    IF NEW.onboarding_completed = true AND NOT has_compulsory_onboarding_fields THEN
      RAISE EXCEPTION 'Onboarding cannot be marked complete without display_name, valid Nigerian WhatsApp number (+234), state, city, and account_role.';
    END IF;

    IF NEW.onboarding_completed = true AND OLD.onboarding_completed = false THEN
      NEW.onboarding_completed_at := coalesce(NEW.onboarding_completed_at, now());
    ELSIF NEW.onboarding_completed = false THEN
      NEW.onboarding_completed_at := NULL;
    END IF;

    RETURN NEW;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_profile_security_invariants ON public.profiles;
CREATE TRIGGER trg_enforce_profile_security_invariants
  BEFORE INSERT OR UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_profile_security_invariants();

-- ----------------------------------------------------------------------------
-- 4. UPDATE handle_new_auth_user() FOR GOOGLE OAUTH & INCOMPLETE ONBOARDING
-- Pre-fills display_name & avatar_url from Google OAuth metadata where available,
-- keeps contact numbers private, and sets onboarding_completed = false until the
-- user explicitly submits the onboarding form.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  raw_display_name text;
  raw_avatar text;
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
    NULL,
    NULL,
    'Lagos',
    'Lagos',
    'both',
    raw_avatar,
    false,
    false,
    'unverified',
    false,
    false,
    NULL
  )
  ON CONFLICT (id) DO UPDATE
    SET email = EXCLUDED.email,
        avatar_url = coalesce(public.profiles.avatar_url, EXCLUDED.avatar_url),
        updated_at = now();

  RETURN NEW;
END;
$$;

-- Update get_public_seller_profile to remain privacy-preserving
DROP FUNCTION IF EXISTS public.get_public_seller_profile(uuid);
CREATE OR REPLACE FUNCTION public.get_public_seller_profile(target_profile_id uuid)
RETURNS TABLE (
  id uuid,
  display_name text,
  state text,
  city text,
  account_role text,
  avatar_url text,
  verification_status text,
  public_whatsapp_number text,
  public_calling_number text,
  created_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    p.id,
    p.display_name,
    p.state,
    p.city,
    p.account_role,
    p.avatar_url,
    p.verification_status,
    CASE WHEN p.show_whatsapp_publicly THEN p.whatsapp_number ELSE NULL END AS public_whatsapp_number,
    CASE WHEN p.show_calling_publicly THEN p.calling_number ELSE NULL END AS public_calling_number,
    p.created_at
  FROM public.profiles p
  WHERE p.id = target_profile_id;
$$;

REVOKE ALL ON FUNCTION public.get_public_seller_profile(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_seller_profile(uuid) TO anon, authenticated;

-- ----------------------------------------------------------------------------
-- 5. HARDEN OFFER UPDATE PERMISSIONS (public.request_offers)
-- Restricts updates so:
--   - Ownership (`id`, `request_id`, `seller_id`, `created_at`) is immutable.
--   - Sellers can only edit offer terms (`offered_price_naira`, `condition`,
--     `location`, `note`) while `status = 'pending'`, and cannot change `status`.
--   - Buyers (request owners) can only transition `status` (`accepted` / `declined`)
--     and cannot alter the seller's price, condition, location, or note.
-- ----------------------------------------------------------------------------
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

  SELECT br.buyer_id INTO request_owner_uid
  FROM public.buyer_requests br
  WHERE br.id = OLD.request_id;

  IF caller_uid = OLD.seller_id THEN
    IF OLD.status <> 'pending' THEN
      RAISE EXCEPTION 'Permission denied: sellers cannot modify an offer after the buyer has responded.';
    END IF;
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
    IF NEW.status NOT IN ('pending', 'accepted', 'declined') THEN
      RAISE EXCEPTION 'Invalid offer status transition.';
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
-- 6. REQUIRE COMPLETED ONBOARDING IN MARKETPLACE RLS INSERT POLICIES
-- Prevents incomplete profiles from inserting real listings, requests, or offers.
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "listings_insert_own" ON public.listings;
CREATE POLICY "listings_insert_own"
  ON public.listings
  FOR INSERT
  TO authenticated
  WITH CHECK (
    (SELECT auth.uid()) = seller_id
    AND EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = (SELECT auth.uid())
        AND p.onboarding_completed = true
        AND p.whatsapp_number IS NOT NULL
    )
  );

DROP POLICY IF EXISTS "buyer_requests_insert_own" ON public.buyer_requests;
CREATE POLICY "buyer_requests_insert_own"
  ON public.buyer_requests
  FOR INSERT
  TO authenticated
  WITH CHECK (
    (SELECT auth.uid()) = buyer_id
    AND EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = (SELECT auth.uid())
        AND p.onboarding_completed = true
        AND p.whatsapp_number IS NOT NULL
    )
  );

DROP POLICY IF EXISTS "request_offers_insert_seller" ON public.request_offers;
CREATE POLICY "request_offers_insert_seller"
  ON public.request_offers
  FOR INSERT
  TO authenticated
  WITH CHECK (
    (SELECT auth.uid()) = seller_id
    AND EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = (SELECT auth.uid())
        AND p.onboarding_completed = true
        AND p.whatsapp_number IS NOT NULL
    )
    AND NOT EXISTS (
      SELECT 1
      FROM public.buyer_requests br
      WHERE br.id = request_id
        AND br.buyer_id = (SELECT auth.uid())
    )
  );
