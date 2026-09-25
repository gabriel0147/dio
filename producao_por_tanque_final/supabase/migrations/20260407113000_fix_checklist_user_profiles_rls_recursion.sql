-- Reassert non-recursive role helpers and profile policies.
-- This protects checklist creation/listing paths that indirectly evaluate
-- role-based policies while reading/writing related records.

CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS public.user_role
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT role
  FROM public.user_profiles
  WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.is_admin_or_director()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT COALESCE(public.get_my_role() IN ('admin', 'director'), false);
$$;

CREATE OR REPLACE FUNCTION public.is_supervisor()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT COALESCE(public.get_my_role() = 'supervisor', false);
$$;

GRANT EXECUTE ON FUNCTION public.get_my_role() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_admin_or_director() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_supervisor() TO authenticated, service_role;

ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can do everything on user_profiles" ON public.user_profiles;
DROP POLICY IF EXISTS "Admins and Directors can do everything on user_profiles" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can view own profile or Admin/Director view all" ON public.user_profiles;
DROP POLICY IF EXISTS "Directors have full access to user profiles" ON public.user_profiles;
DROP POLICY IF EXISTS "Admins and Directors can manage all profiles" ON public.user_profiles;
DROP POLICY IF EXISTS "Admins and Directors can insert user profiles" ON public.user_profiles;
DROP POLICY IF EXISTS "Admins and Directors can update user profiles" ON public.user_profiles;
DROP POLICY IF EXISTS "Admins and Directors can delete user profiles" ON public.user_profiles;

CREATE POLICY "Users can view own profile or Admin/Director view all"
  ON public.user_profiles
  FOR SELECT
  TO authenticated
  USING (
    id = auth.uid()
    OR public.is_admin_or_director()
  );

CREATE POLICY "Admins and Directors can insert user profiles"
  ON public.user_profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin_or_director());

CREATE POLICY "Admins and Directors can update user profiles"
  ON public.user_profiles
  FOR UPDATE
  TO authenticated
  USING (public.is_admin_or_director())
  WITH CHECK (public.is_admin_or_director());

CREATE POLICY "Admins and Directors can delete user profiles"
  ON public.user_profiles
  FOR DELETE
  TO authenticated
  USING (public.is_admin_or_director());

DROP POLICY IF EXISTS "Supervisors can view all checklists" ON public.well_checklists;
CREATE POLICY "Supervisors can view all checklists"
  ON public.well_checklists
  FOR SELECT
  TO authenticated
  USING (public.is_supervisor());
