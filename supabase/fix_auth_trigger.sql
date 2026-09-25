-- ============================================================
-- HYNA MANAGEMENT - AUTH TRIGGER & RLS FIX SCRIPT
-- Execute this script in your Supabase SQL Editor:
-- Supabase Dashboard -> SQL Editor -> New Query -> Run
-- ============================================================

-- 1. Ensure public.profiles table has correct column defaults
ALTER TABLE IF EXISTS public.profiles 
  ALTER COLUMN name SET DEFAULT 'Team Member',
  ALTER COLUMN role SET DEFAULT 'member',
  ALTER COLUMN department SET DEFAULT 'Engineering',
  ALTER COLUMN designation SET DEFAULT 'Software Engineer',
  ALTER COLUMN status SET DEFAULT 'active';

-- 2. Clean and Fix Row Level Security policies on public.profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles_select_auth" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_self" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert_exec" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert" ON public.profiles;
DROP POLICY IF EXISTS "profiles_delete_exec" ON public.profiles;

-- Anyone authenticated can view team member profiles
CREATE POLICY "profiles_select_auth" 
  ON public.profiles 
  FOR SELECT 
  TO authenticated 
  USING (true);

-- Allow inserting profiles during signup (both GoTrue trigger and client fallback)
-- Foreign Key constraint 'id REFERENCES auth.users(id)' guarantees user validity
CREATE POLICY "profiles_insert" 
  ON public.profiles 
  FOR INSERT 
  WITH CHECK (true);

-- Users can update their own profile; executives can update all profiles
CREATE POLICY "profiles_update_self" 
  ON public.profiles 
  FOR UPDATE 
  TO authenticated 
  USING (id = auth.uid() OR public.is_executive())
  WITH CHECK (id = auth.uid() OR public.is_executive());

-- Only executives can delete profiles
CREATE POLICY "profiles_delete_exec" 
  ON public.profiles 
  FOR DELETE 
  TO authenticated 
  USING (public.is_executive());

-- 3. Security functions with explicit search_path
CREATE OR REPLACE FUNCTION public.is_executive()
RETURNS BOOLEAN 
LANGUAGE sql 
STABLE 
SECURITY DEFINER 
SET search_path = public, auth, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
      AND (
        UPPER(TRIM(designation)) IN ('CEO', 'CTO', 'CPO', 'COO')
        OR (role = 'admin' AND UPPER(TRIM(designation)) IN ('CEO', 'CTO', 'CPO', 'COO'))
      )
  );
$$;

CREATE OR REPLACE FUNCTION public.is_manager()
RETURNS BOOLEAN 
LANGUAGE sql 
STABLE 
SECURITY DEFINER 
SET search_path = public, auth, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
      AND (role = 'manager' OR UPPER(TRIM(designation)) LIKE '%MANAGER%')
  );
$$;

-- 4. Fix protect_profile_role so it never blocks internal GoTrue triggers
CREATE OR REPLACE FUNCTION public.protect_profile_role()
RETURNS TRIGGER 
LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = public, auth, pg_temp
AS $$
BEGIN
  -- Only enforce role modification restrictions for active end-user sessions
  -- auth.uid() IS NULL means this is an internal database trigger
  IF auth.uid() IS NOT NULL AND NOT public.is_executive() THEN
    IF NEW.role <> OLD.role THEN
      RAISE EXCEPTION 'Access Denied: You cannot modify your own role.';
    END IF;
    IF NEW.designation <> OLD.designation AND UPPER(TRIM(NEW.designation)) IN ('CEO', 'CTO', 'CPO', 'COO') THEN
      RAISE EXCEPTION 'Access Denied: You cannot assign executive designations.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_profile_role ON public.profiles;
CREATE TRIGGER trg_protect_profile_role
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE PROCEDURE public.protect_profile_role();

-- 5. Safe, robust handle_new_user trigger
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER 
LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = public, auth, pg_temp
AS $$
DECLARE
  v_name TEXT;
  v_role public.user_role := 'member';
  v_designation TEXT;
  v_department TEXT;
  v_is_first BOOLEAN := FALSE;
BEGIN
  v_name := COALESCE(NULLIF(new.raw_user_meta_data->>'name', ''), NULLIF(split_part(new.email, '@', 1), ''), 'Team Member');
  v_designation := COALESCE(NULLIF(new.raw_user_meta_data->>'designation', ''), 'Software Engineer');
  v_department := COALESCE(NULLIF(new.raw_user_meta_data->>'department', ''), 'Engineering');

  -- First user registered in the database automatically becomes CEO (admin)
  SELECT NOT EXISTS (SELECT 1 FROM public.profiles LIMIT 1) INTO v_is_first;

  IF v_is_first THEN
    v_role := 'admin';
    v_designation := 'CEO';
    v_department := 'Executive';
  ELSIF new.raw_user_meta_data->>'role' = 'admin' AND UPPER(TRIM(v_designation)) IN ('CEO', 'CTO', 'CPO', 'COO') THEN
    v_role := 'admin';
  ELSIF new.raw_user_meta_data->>'role' = 'manager' THEN
    v_role := 'manager';
  END IF;

  INSERT INTO public.profiles (
    id,
    name,
    email,
    role,
    designation,
    department,
    status
  )
  VALUES (
    new.id,
    v_name,
    new.email,
    v_role,
    v_designation,
    v_department,
    'active'
  )
  ON CONFLICT (id) DO UPDATE
  SET
    email = EXCLUDED.email,
    name = CASE WHEN public.profiles.name = '' OR public.profiles.name IS NULL THEN EXCLUDED.name ELSE public.profiles.name END,
    updated_at = NOW();

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Safe failure: Log warning but never abort user creation in auth.users
  RAISE WARNING 'handle_new_user failed for user %: %', new.id, SQLERRM;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
