-- Fix infinite recursion in RLS policies and ensure Director role parity

-- 1. Ensure 'director' and other missing roles exist in the user_role enum
ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'director';
ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'supervisor';
ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'petroleum_engineer';
ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'operations_manager';

-- 2. Create Security Definer function to get current user role safely
-- This bypasses RLS on user_profiles to prevent recursion loops
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS public.user_role
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT role FROM public.user_profiles WHERE id = auth.uid();
$$;

-- 3. Create helper for Admin/Director check (SECURITY DEFINER)
-- Checks if the current user has admin or director privileges without triggering RLS recursion
CREATE OR REPLACE FUNCTION public.is_admin_or_director()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE id = auth.uid()
    AND role IN ('admin', 'director')
  );
$$;

-- 4. Fix user_profiles Policies to resolve recursion error
DROP POLICY IF EXISTS "Admins can do everything on user_profiles" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Directors have full access to user profiles" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Admins and Directors can manage all profiles" ON public.user_profiles;

-- Allow users to view their own profile (using ID check directly) 
-- OR if they are admin/director (using secure function)
CREATE POLICY "Users can view own profile or Admin/Director view all"
    ON public.user_profiles
    FOR SELECT
    TO authenticated
    USING (
        id = auth.uid() OR public.is_admin_or_director()
    );

-- Allow Admins/Directors to insert/update/delete any profile
CREATE POLICY "Admins and Directors can manage all profiles"
    ON public.user_profiles
    FOR ALL
    TO authenticated
    USING (
        public.is_admin_or_director()
    );

-- 5. Fix Projects Policies
-- Ensure Admin/Director can always see/manage projects regardless of membership
DROP POLICY IF EXISTS "Admins and Directors can manage all projects" ON public.projects;
DROP POLICY IF EXISTS "Users can view projects they are members of" ON public.projects;

-- High privilege policy
CREATE POLICY "Admins and Directors can manage all projects"
    ON public.projects
    FOR ALL
    TO authenticated
    USING (
        public.is_admin_or_director()
    );

-- Standard membership policy
CREATE POLICY "Users can view projects they are members of"
    ON public.projects
    FOR SELECT
    TO authenticated
    USING (
        public.is_member_of_project(id)
    );

-- 6. Update other RLS policies to use is_admin_or_director() for consistency

-- Tanks
DROP POLICY IF EXISTS "Admins and Directors can manage all tanks" ON public.tanks;
CREATE POLICY "Admins and Directors can manage all tanks"
    ON public.tanks
    FOR ALL
    TO authenticated
    USING (
        public.is_admin_or_director()
    );

-- Daily Production Reports
DROP POLICY IF EXISTS "Admins and Directors can manage all reports" ON public.daily_production_reports;
CREATE POLICY "Admins and Directors can manage all reports"
    ON public.daily_production_reports
    FOR ALL
    TO authenticated
    USING (
        public.is_admin_or_director()
    );

-- Calibration Data
DROP POLICY IF EXISTS "Admins and Directors can manage calibration data" ON public.calibration_data;
CREATE POLICY "Admins and Directors can manage calibration data"
    ON public.calibration_data
    FOR ALL
    TO authenticated
    USING (
        public.is_admin_or_director()
    );

-- Tank Operations
DROP POLICY IF EXISTS "Admins and Directors can manage all operations" ON public.tank_operations;
CREATE POLICY "Admins and Directors can manage all operations"
    ON public.tank_operations
    FOR ALL
    TO authenticated
    USING (
        public.is_admin_or_director()
    );
