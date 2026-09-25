-- Provide a stable, authenticated way to list users without relying on an Edge Function.

ALTER TABLE public.user_profiles
ADD COLUMN IF NOT EXISTS full_name TEXT;

CREATE OR REPLACE FUNCTION public.list_users_with_profiles()
RETURNS TABLE (
  id UUID,
  email TEXT,
  role public.user_role,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, auth
STABLE
AS $$
  SELECT
    u.id,
    u.email::text,
    COALESCE(p.role, 'operator'::public.user_role) AS role,
    p.full_name,
    p.avatar_url,
    u.created_at,
    u.updated_at
  FROM auth.users u
  LEFT JOIN public.user_profiles p ON p.id = u.id
  ORDER BY u.email;
$$;

REVOKE ALL ON FUNCTION public.list_users_with_profiles() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.list_users_with_profiles() TO authenticated;
