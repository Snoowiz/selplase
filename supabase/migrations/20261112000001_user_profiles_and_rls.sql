-- ============================================================================
-- SELPLAS — Stage 2 Migration: User Profiles & Row Level Security (RLS)
-- Migration: 20261112000001_user_profiles_and_rls.sql
-- ============================================================================

-- 1. Create the user profiles table linked 1:1 with Supabase Auth (auth.users)
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

CREATE INDEX IF NOT EXISTS idx_profiles_state_city ON public.profiles (state, city);
CREATE INDEX IF NOT EXISTS idx_profiles_account_role ON public.profiles (account_role);

-- 2. Security Trigger: Prevent privilege escalation & protect immutable fields
-- Ensures regular authenticated users can NEVER self-assign admin privileges,
-- forge verification_status, or alter their user ID / Auth-managed email.
CREATE OR REPLACE FUNCTION public.enforce_profile_security_invariants()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  jwt_role text := coalesce(
    current_setting('request.jwt.claim.role', true),
    (current_setting('request.jwt.claims', true)::jsonb ->> 'role'),
    ''
  );
BEGIN
  IF TG_OP = 'INSERT' THEN
    NEW.created_at := now();
    NEW.updated_at := now();
    IF jwt_role <> 'service_role' AND current_user NOT IN ('postgres', 'supabase_admin') THEN
      NEW.verification_status := 'unverified';
      NEW.is_admin := false;
    END IF;
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    NEW.updated_at := now();
    NEW.created_at := OLD.created_at;
    NEW.id := OLD.id;

    IF jwt_role <> 'service_role' AND current_user NOT IN ('postgres', 'supabase_admin') THEN
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

-- 3. Automatic Profile Provisioning on Supabase Auth Sign-Up
CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  raw_display_name text;
  raw_whatsapp text;
  raw_calling text;
  raw_state text;
  raw_city text;
  raw_role text;
BEGIN
  raw_display_name := coalesce(
    nullif(trim(NEW.raw_user_meta_data ->> 'display_name'), ''),
    split_part(coalesce(NEW.email, 'User'), '@', 1)
  );
  IF char_length(raw_display_name) < 2 THEN
    raw_display_name := 'SELPLAS Member';
  END IF;

  raw_whatsapp := nullif(trim(NEW.raw_user_meta_data ->> 'whatsapp_number'), '');
  IF raw_whatsapp IS NOT NULL AND raw_whatsapp !~ '^\+234[789][01][0-9]{8}$' THEN
    raw_whatsapp := NULL;
  END IF;

  raw_calling := nullif(trim(NEW.raw_user_meta_data ->> 'calling_number'), '');
  IF raw_calling IS NOT NULL AND raw_calling !~ '^\+234[789][01][0-9]{8}$' THEN
    raw_calling := NULL;
  END IF;

  raw_state := coalesce(nullif(trim(NEW.raw_user_meta_data ->> 'state'), ''), 'Lagos');
  raw_city := coalesce(nullif(trim(NEW.raw_user_meta_data ->> 'city'), ''), 'Lagos');
  raw_role := coalesce(nullif(trim(NEW.raw_user_meta_data ->> 'account_role'), ''), 'both');
  IF raw_role NOT IN ('buyer', 'seller', 'both') THEN
    raw_role := 'both';
  END IF;

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
    is_admin
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
    nullif(trim(NEW.raw_user_meta_data ->> 'avatar_url'), ''),
    false,
    false,
    'unverified',
    false
  )
  ON CONFLICT (id) DO UPDATE
    SET email = EXCLUDED.email,
        updated_at = now();

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_auth_user();

-- 4. Enable & Force Row Level Security (RLS) on public.profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles FORCE ROW LEVEL SECURITY;

-- Policy 4a: Authenticated users can SELECT only their own full private profile row
DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;
CREATE POLICY "profiles_select_own"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

-- Policy 4b: Authenticated users can INSERT only their own unverified, non-admin profile
DROP POLICY IF EXISTS "profiles_insert_own" ON public.profiles;
CREATE POLICY "profiles_insert_own"
  ON public.profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = id
    AND verification_status = 'unverified'
    AND is_admin = false
  );

-- Policy 4c: Authenticated users can UPDATE only their own profile
DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
CREATE POLICY "profiles_update_own"
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- 5. Approved Public Seller Profile Access (Privacy-Preserving Function)
-- Exposes ONLY approved public seller attributes and masks contact numbers
-- unless the owner explicitly opted in via show_whatsapp_publicly / show_calling_publicly.
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
