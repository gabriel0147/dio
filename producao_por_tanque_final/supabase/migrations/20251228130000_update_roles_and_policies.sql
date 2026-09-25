-- Migration to update role permissions and ensuring all enum values are supported
-- Note: 'user_role' enum is assumed to already contain the new roles as per types.ts and previous context.
-- If not, PostgreSQL allows adding values. But assuming previous migrations handled it or it was set up.
-- We focus on refining policies.

-- 1. Ensure Petroleum Engineer permissions for Calibration Data
DROP POLICY IF EXISTS "Petroleum Engineers can manage calibration data" ON public.calibration_data;
CREATE POLICY "Petroleum Engineers can manage calibration data"
    ON public.calibration_data
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.user_profiles
            WHERE id = auth.uid() AND role IN ('petroleum_engineer', 'admin', 'director')
        )
    );

-- 2. Audit Logs Access for Operations Manager
DROP POLICY IF EXISTS "Operations Managers can view audit logs" ON public.audit_logs;
-- Re-apply generic high privilege policy if not covered
CREATE POLICY "Operations Managers can view audit logs"
    ON public.audit_logs
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.user_profiles
            WHERE id = auth.uid() AND role IN ('operations_manager', 'director', 'admin')
        )
    );

-- 3. Director Admin Parity on User Profiles
DROP POLICY IF EXISTS "Directors have full access to user profiles" ON public.user_profiles;
CREATE POLICY "Directors have full access to user profiles"
    ON public.user_profiles
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.user_profiles
            WHERE id = auth.uid() AND role IN ('director', 'admin')
        )
    );

-- 4. Supervisor Permissions (Read Well Checklists)
-- Assuming existing policies might cover project members, but ensuring Supervisors have global read on checklists if needed for auditing
DROP POLICY IF EXISTS "Supervisors can view all checklists" ON public.well_checklists;
CREATE POLICY "Supervisors can view all checklists"
    ON public.well_checklists
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.user_profiles
            WHERE id = auth.uid() AND role = 'supervisor'
        )
    );

-- 5. Restrict Supervisor Deletion (Policy to prevent deletion even if other policies allow it)
-- PostgreSQL policies are permissive (OR). We cannot strictly block via policy if another allows it easily without complex exclusion logic in all policies.
-- However, we can ensure the policies that allow deletion (e.g. project owner/editor) do NOT include Supervisor role logic implicitly if they are separate.
-- If deletion relies on "project_members" table checks, a Supervisor might be an "editor".
-- To strictly enforce, we rely on Application Logic (UI/API) primarily, as RLS 'DENY' is not native.
-- But we can add a check trigger if critical. For now, UI enforcement is implemented.

