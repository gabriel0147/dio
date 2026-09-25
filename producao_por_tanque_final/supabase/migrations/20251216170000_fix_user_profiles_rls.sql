-- Fix infinite recursion in user_profiles RLS policies

-- 1. Create a secure function to check admin role using SECURITY DEFINER
-- This bypasses RLS on user_profiles when checking for the admin role, breaking the recursion loop.
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.user_profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
END;
$$;

-- 2. Drop the problematic recursive policy on user_profiles
DROP POLICY IF EXISTS "Admins can do everything on user_profiles" ON public.user_profiles;

-- 3. Recreate the Admin policy using the non-recursive function
CREATE POLICY "Admins can do everything on user_profiles"
    ON public.user_profiles
    FOR ALL
    TO authenticated
    USING (
        public.is_admin()
    );

-- 4. Ensure we grant execute permission on the function (public is usually default but explicit is good)
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin() TO service_role;
