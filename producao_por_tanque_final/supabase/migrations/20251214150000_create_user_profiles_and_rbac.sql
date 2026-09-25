-- 1. Create Enum Type
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
        CREATE TYPE public.user_role AS ENUM ('operator', 'approver', 'admin');
    END IF;
END $$;

-- 2. Create User Profiles Table
CREATE TABLE IF NOT EXISTS public.user_profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    role public.user_role NOT NULL DEFAULT 'operator',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- 3. Enable RLS
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- 4. Create Policies for user_profiles
-- Admin can do everything
DROP POLICY IF EXISTS "Admins can do everything on user_profiles" ON public.user_profiles;
CREATE POLICY "Admins can do everything on user_profiles"
    ON public.user_profiles
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.user_profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Users can view their own profile (Operator/Approver)
DROP POLICY IF EXISTS "Users can view their own profile" ON public.user_profiles;
CREATE POLICY "Users can view their own profile"
    ON public.user_profiles
    FOR SELECT
    TO authenticated
    USING (
        id = auth.uid()
    );

-- 5. Seed Initial Admin
-- We insert a profile for the known author if not exists, making them Admin.
-- FIX: Only insert if the user actually exists in auth.users to avoid FK violation
INSERT INTO public.user_profiles (id, role)
SELECT id, 'admin'::public.user_role
FROM auth.users
WHERE id = '851108bc-9e32-4687-9a91-a319d4a434be'
ON CONFLICT (id) DO NOTHING;

-- 6. Update Policies for fcv_calculation_logs (RBAC)
DROP POLICY IF EXISTS "Users can insert their own calculation logs" ON public.fcv_calculation_logs;
DROP POLICY IF EXISTS "Users can view calculation logs" ON public.fcv_calculation_logs;
DROP POLICY IF EXISTS "Operators and Admins can insert logs" ON public.fcv_calculation_logs;
DROP POLICY IF EXISTS "Approvers and Admins can view all logs" ON public.fcv_calculation_logs;
DROP POLICY IF EXISTS "Operators can view their own logs" ON public.fcv_calculation_logs;

-- Implement RBAC for fcv_calculation_logs

-- INSERT: Operator and Admin
CREATE POLICY "Operators and Admins can insert logs"
    ON public.fcv_calculation_logs
    FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.user_profiles
            WHERE id = auth.uid() AND (role = 'operator' OR role = 'admin')
        )
    );

-- SELECT: Approver and Admin
CREATE POLICY "Approvers and Admins can view all logs"
    ON public.fcv_calculation_logs
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.user_profiles
            WHERE id = auth.uid() AND (role = 'approver' OR role = 'admin')
        )
    );

-- Allow Operators to view their own logs
CREATE POLICY "Operators can view their own logs"
    ON public.fcv_calculation_logs
    FOR SELECT
    TO authenticated
    USING (
        user_id = auth.uid() AND
        EXISTS (
            SELECT 1 FROM public.user_profiles
            WHERE id = auth.uid() AND role = 'operator'
        )
    );

-- 7. Trigger to sync role
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (id, role)
  VALUES (new.id, 'operator')
  ON CONFLICT (id) DO NOTHING;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
