-- Policies using the new enum values added in the previous migration

-- 2. Update RLS for Director (Admin Parity) on user_profiles
DROP POLICY IF EXISTS "Admins can do everything on user_profiles" ON public.user_profiles;
DROP POLICY IF EXISTS "Admins and Directors can do everything on user_profiles" ON public.user_profiles;

CREATE POLICY "Admins and Directors can do everything on user_profiles"
    ON public.user_profiles
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.user_profiles
            WHERE id = auth.uid() AND role IN ('admin', 'director')
        )
    );

-- 3. Update RLS for Audit Logs to include Operations Manager and Director
DROP POLICY IF EXISTS "Admins and Approvers can view all logs" ON public.audit_logs;
DROP POLICY IF EXISTS "High privilege roles can view all audit logs" ON public.audit_logs;

CREATE POLICY "High privilege roles can view all audit logs"
    ON public.audit_logs
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.user_profiles
            WHERE id = auth.uid() AND role IN ('admin', 'director', 'operations_manager', 'approver')
        )
    );

-- 4. Update fcv_calculation_logs policies
DROP POLICY IF EXISTS "Operators and Admins can insert logs" ON public.fcv_calculation_logs;
DROP POLICY IF EXISTS "Technical staff can insert logs" ON public.fcv_calculation_logs;

CREATE POLICY "Technical staff can insert logs"
    ON public.fcv_calculation_logs
    FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.user_profiles
            WHERE id = auth.uid() AND role IN ('operator', 'admin', 'director', 'petroleum_engineer', 'supervisor')
        )
    );

DROP POLICY IF EXISTS "Approvers and Admins can view all logs" ON public.fcv_calculation_logs;
DROP POLICY IF EXISTS "Management can view all logs" ON public.fcv_calculation_logs;

CREATE POLICY "Management can view all logs"
    ON public.fcv_calculation_logs
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.user_profiles
            WHERE id = auth.uid() AND role IN ('approver', 'admin', 'director', 'operations_manager', 'petroleum_engineer', 'supervisor')
        )
    );

-- 7. App Settings Access
DROP POLICY IF EXISTS "Admins and Directors can manage app settings" ON public.app_settings;
CREATE POLICY "Admins and Directors can manage app settings"
    ON public.app_settings
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.user_profiles
            WHERE id = auth.uid() AND role IN ('admin', 'director')
        )
    );

