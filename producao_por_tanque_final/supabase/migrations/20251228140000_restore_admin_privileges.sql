-- Restore admin role for the system owner (Author ID)
UPDATE public.user_profiles
SET role = 'admin', updated_at = NOW()
WHERE id = '851108bc-9e32-4687-9a91-a319d4a434be';

-- Ensure "Admins and Directors" have global access policies (Additive RLS)
-- This guarantees that high-level roles have full CRUD access to critical tables
-- regardless of project membership or other restrictive policies.

-- Projects
DROP POLICY IF EXISTS "Admins and Directors can manage all projects" ON public.projects;
CREATE POLICY "Admins and Directors can manage all projects"
    ON public.projects
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.user_profiles
            WHERE id = auth.uid() AND role IN ('admin', 'director')
        )
    );

-- Tanks
DROP POLICY IF EXISTS "Admins and Directors can manage all tanks" ON public.tanks;
CREATE POLICY "Admins and Directors can manage all tanks"
    ON public.tanks
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.user_profiles
            WHERE id = auth.uid() AND role IN ('admin', 'director')
        )
    );

-- Daily Production Reports
DROP POLICY IF EXISTS "Admins and Directors can manage all reports" ON public.daily_production_reports;
CREATE POLICY "Admins and Directors can manage all reports"
    ON public.daily_production_reports
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.user_profiles
            WHERE id = auth.uid() AND role IN ('admin', 'director')
        )
    );

-- Calibration Data
DROP POLICY IF EXISTS "Admins and Directors can manage calibration data" ON public.calibration_data;
CREATE POLICY "Admins and Directors can manage calibration data"
    ON public.calibration_data
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.user_profiles
            WHERE id = auth.uid() AND role IN ('admin', 'director')
        )
    );

-- Tank Operations
DROP POLICY IF EXISTS "Admins and Directors can manage all operations" ON public.tank_operations;
CREATE POLICY "Admins and Directors can manage all operations"
    ON public.tank_operations
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.user_profiles
            WHERE id = auth.uid() AND role IN ('admin', 'director')
        )
    );
