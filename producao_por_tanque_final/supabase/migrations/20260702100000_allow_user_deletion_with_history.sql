-- Keep historical records when a user is deleted from Supabase Auth.
-- Without these rules, auth.admin.deleteUser can fail with
-- "Database error deleting user" because public tables still reference the user.

ALTER TABLE public.audit_logs
  ALTER COLUMN user_id DROP NOT NULL,
  DROP CONSTRAINT IF EXISTS audit_logs_user_id_fkey,
  ADD CONSTRAINT audit_logs_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.fcv_calculation_logs
  ALTER COLUMN user_id DROP NOT NULL,
  DROP CONSTRAINT IF EXISTS fcv_calculation_logs_user_id_fkey,
  ADD CONSTRAINT fcv_calculation_logs_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.fcv_calculation_logs
  DROP CONSTRAINT IF EXISTS fcv_calculation_logs_requested_by_user_id_fkey,
  ADD CONSTRAINT fcv_calculation_logs_requested_by_user_id_fkey
    FOREIGN KEY (requested_by_user_id) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.projects
  DROP CONSTRAINT IF EXISTS projects_created_by_fkey,
  ADD CONSTRAINT projects_created_by_fkey
    FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.app_settings
  DROP CONSTRAINT IF EXISTS app_settings_updated_by_fkey,
  ADD CONSTRAINT app_settings_updated_by_fkey
    FOREIGN KEY (updated_by) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.daily_production_reports
  DROP CONSTRAINT IF EXISTS daily_production_reports_closed_by_fkey,
  ADD CONSTRAINT daily_production_reports_closed_by_fkey
    FOREIGN KEY (closed_by) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.well_checklists
  ALTER COLUMN user_id DROP NOT NULL,
  DROP CONSTRAINT IF EXISTS well_checklists_user_id_fkey,
  ADD CONSTRAINT well_checklists_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.operational_supervision
  DROP CONSTRAINT IF EXISTS operational_supervision_audited_by_fkey,
  ADD CONSTRAINT operational_supervision_audited_by_fkey
    FOREIGN KEY (audited_by) REFERENCES public.user_profiles(id) ON DELETE SET NULL;

ALTER TABLE public.srt_tank_sessions
  DROP CONSTRAINT IF EXISTS srt_tank_sessions_responsible_user_id_fkey,
  ADD CONSTRAINT srt_tank_sessions_responsible_user_id_fkey
    FOREIGN KEY (responsible_user_id) REFERENCES public.user_profiles(id) ON DELETE SET NULL;

ALTER TABLE public.srt_well_tests
  DROP CONSTRAINT IF EXISTS srt_well_tests_responsible_user_id_fkey,
  ADD CONSTRAINT srt_well_tests_responsible_user_id_fkey
    FOREIGN KEY (responsible_user_id) REFERENCES public.user_profiles(id) ON DELETE SET NULL;

ALTER TABLE public.smt_maintenance_logs
  DROP CONSTRAINT IF EXISTS smt_maintenance_logs_responsible_user_id_fkey,
  ADD CONSTRAINT smt_maintenance_logs_responsible_user_id_fkey
    FOREIGN KEY (responsible_user_id) REFERENCES public.user_profiles(id) ON DELETE SET NULL;

ALTER TABLE public.sgpa_events
  DROP CONSTRAINT IF EXISTS sgpa_events_responsible_user_id_fkey,
  ADD CONSTRAINT sgpa_events_responsible_user_id_fkey
    FOREIGN KEY (responsible_user_id) REFERENCES public.user_profiles(id) ON DELETE SET NULL;

ALTER TABLE public.well_bsw_manual_entries
  DROP CONSTRAINT IF EXISTS well_bsw_manual_entries_user_id_fkey,
  ADD CONSTRAINT well_bsw_manual_entries_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES public.user_profiles(id) ON DELETE SET NULL;
