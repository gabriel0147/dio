-- Close the authorization gaps found during the July 2026 security review.
-- This migration is intentionally idempotent and does not mutate application data.

CREATE OR REPLACE FUNCTION public.is_active_user()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_profiles
    WHERE id = auth.uid()
      AND approval_status = 'active'
  );
$$;

CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS public.user_role
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT role
  FROM public.user_profiles
  WHERE id = auth.uid()
    AND approval_status = 'active';
$$;

CREATE OR REPLACE FUNCTION public.is_admin_or_director()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_profiles
    WHERE id = auth.uid()
      AND approval_status = 'active'
      AND role IN ('admin', 'director')
  );
$$;

CREATE OR REPLACE FUNCTION public.is_member_of_project(_project_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT public.is_active_user() AND (
    public.is_admin_or_director()
    OR EXISTS (
      SELECT 1
      FROM public.project_members pm
      WHERE pm.project_id = _project_id
        AND pm.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1
      FROM public.project_team_roles ptr
      JOIN public.team_members tm ON tm.team_id = ptr.team_id
      WHERE ptr.project_id = _project_id
        AND tm.user_id = auth.uid()
    )
  );
$$;

CREATE OR REPLACE FUNCTION public.can_edit_project(_project_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT public.is_active_user() AND (
    public.is_admin_or_director()
    OR EXISTS (
      SELECT 1
      FROM public.project_members pm
      WHERE pm.project_id = _project_id
        AND pm.user_id = auth.uid()
        AND pm.role IN ('owner', 'editor')
    )
    OR EXISTS (
      SELECT 1
      FROM public.project_team_roles ptr
      JOIN public.team_members tm ON tm.team_id = ptr.team_id
      WHERE ptr.project_id = _project_id
        AND tm.user_id = auth.uid()
        AND ptr.role IN ('owner', 'editor')
    )
  );
$$;

CREATE OR REPLACE FUNCTION public.is_project_owner(_project_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT public.is_active_user() AND (
    public.is_admin_or_director()
    OR EXISTS (
      SELECT 1
      FROM public.project_members pm
      WHERE pm.project_id = _project_id
        AND pm.user_id = auth.uid()
        AND pm.role = 'owner'
    )
    OR EXISTS (
      SELECT 1
      FROM public.project_team_roles ptr
      JOIN public.team_members tm ON tm.team_id = ptr.team_id
      WHERE ptr.project_id = _project_id
        AND tm.user_id = auth.uid()
        AND ptr.role = 'owner'
    )
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_active_user() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_my_role() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_admin_or_director() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_member_of_project(UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.can_edit_project(UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_project_owner(UUID) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.is_active_user() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_my_role() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.is_admin_or_director() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.is_member_of_project(UUID) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.can_edit_project(UUID) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.is_project_owner(UUID) FROM PUBLIC, anon;

-- Metadata: remove the old permissive policies that were still OR'ed with the
-- project-scoped policies.
ALTER TABLE public.production_fields ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wells ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transfer_destination_categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can view production_fields" ON public.production_fields;
DROP POLICY IF EXISTS "Authenticated users can insert production_fields" ON public.production_fields;
DROP POLICY IF EXISTS "Authenticated users can update production_fields" ON public.production_fields;
DROP POLICY IF EXISTS "Authenticated users can delete production_fields" ON public.production_fields;
DROP POLICY IF EXISTS "Users can view production fields" ON public.production_fields;
DROP POLICY IF EXISTS "Editors/Owners can manage production fields" ON public.production_fields;
DROP POLICY IF EXISTS "Project members can view production fields" ON public.production_fields;
DROP POLICY IF EXISTS "Project editors can manage production fields" ON public.production_fields;

CREATE POLICY "Project members can view production fields"
  ON public.production_fields FOR SELECT TO authenticated
  USING (
    public.is_active_user()
    AND (project_id IS NULL OR public.is_member_of_project(project_id))
  );

CREATE POLICY "Project editors can manage production fields"
  ON public.production_fields FOR ALL TO authenticated
  USING (
    (project_id IS NULL AND public.is_admin_or_director())
    OR (project_id IS NOT NULL AND public.can_edit_project(project_id))
  )
  WITH CHECK (
    (project_id IS NULL AND public.is_admin_or_director())
    OR (project_id IS NOT NULL AND public.can_edit_project(project_id))
  );

DROP POLICY IF EXISTS "Authenticated users can view wells" ON public.wells;
DROP POLICY IF EXISTS "Authenticated users can insert wells" ON public.wells;
DROP POLICY IF EXISTS "Authenticated users can update wells" ON public.wells;
DROP POLICY IF EXISTS "Authenticated users can delete wells" ON public.wells;
DROP POLICY IF EXISTS "Users can view wells of their projects" ON public.wells;
DROP POLICY IF EXISTS "Editors/Owners can manage wells" ON public.wells;
DROP POLICY IF EXISTS "Project members can view wells" ON public.wells;
DROP POLICY IF EXISTS "Project editors can manage wells" ON public.wells;

CREATE POLICY "Project members can view wells"
  ON public.wells FOR SELECT TO authenticated
  USING (
    public.is_active_user()
    AND EXISTS (
      SELECT 1
      FROM public.production_fields pf
      WHERE pf.id = wells.production_field_id
        AND (pf.project_id IS NULL OR public.is_member_of_project(pf.project_id))
    )
  );

CREATE POLICY "Project editors can manage wells"
  ON public.wells FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.production_fields pf
      WHERE pf.id = wells.production_field_id
        AND (
          (pf.project_id IS NULL AND public.is_admin_or_director())
          OR public.can_edit_project(pf.project_id)
        )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.production_fields pf
      WHERE pf.id = wells.production_field_id
        AND (
          (pf.project_id IS NULL AND public.is_admin_or_director())
          OR public.can_edit_project(pf.project_id)
        )
    )
  );

DROP POLICY IF EXISTS "Users can view transfer categories of their projects" ON public.transfer_destination_categories;
DROP POLICY IF EXISTS "Editors/Owners can manage transfer categories" ON public.transfer_destination_categories;
DROP POLICY IF EXISTS "Users can insert transfer categories to their projects" ON public.transfer_destination_categories;
DROP POLICY IF EXISTS "Users can update transfer categories of their projects" ON public.transfer_destination_categories;
DROP POLICY IF EXISTS "Users can delete transfer categories of their projects" ON public.transfer_destination_categories;
DROP POLICY IF EXISTS "Project members can view transfer categories" ON public.transfer_destination_categories;
DROP POLICY IF EXISTS "Project editors can manage transfer categories" ON public.transfer_destination_categories;

CREATE POLICY "Project members can view transfer categories"
  ON public.transfer_destination_categories FOR SELECT TO authenticated
  USING (
    public.is_active_user()
    AND (project_id IS NULL OR public.is_member_of_project(project_id))
  );

CREATE POLICY "Project editors can manage transfer categories"
  ON public.transfer_destination_categories FOR ALL TO authenticated
  USING (
    (project_id IS NULL AND public.is_admin_or_director())
    OR (project_id IS NOT NULL AND public.can_edit_project(project_id))
  )
  WITH CHECK (
    (project_id IS NULL AND public.is_admin_or_director())
    OR (project_id IS NOT NULL AND public.can_edit_project(project_id))
  );

-- Alert rules and notifications were created without RLS.
ALTER TABLE public.alert_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alert_notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Project members can view alert rules" ON public.alert_rules;
DROP POLICY IF EXISTS "Project editors can manage alert rules" ON public.alert_rules;
CREATE POLICY "Project members can view alert rules"
  ON public.alert_rules FOR SELECT TO authenticated
  USING (public.is_member_of_project(project_id));
CREATE POLICY "Project editors can manage alert rules"
  ON public.alert_rules FOR ALL TO authenticated
  USING (public.can_edit_project(project_id))
  WITH CHECK (public.can_edit_project(project_id) AND user_id = auth.uid());

DROP POLICY IF EXISTS "Project members can view alert notifications" ON public.alert_notifications;
DROP POLICY IF EXISTS "Project members can update alert notifications" ON public.alert_notifications;
DROP POLICY IF EXISTS "Project editors can insert alert notifications" ON public.alert_notifications;
CREATE POLICY "Project members can view alert notifications"
  ON public.alert_notifications FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.alert_rules ar
      WHERE ar.id = alert_notifications.alert_rule_id
        AND public.is_member_of_project(ar.project_id)
    )
  );
CREATE POLICY "Project members can update alert notifications"
  ON public.alert_notifications FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.alert_rules ar
      WHERE ar.id = alert_notifications.alert_rule_id
        AND public.is_member_of_project(ar.project_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.alert_rules ar
      WHERE ar.id = alert_notifications.alert_rule_id
        AND public.is_member_of_project(ar.project_id)
    )
  );
CREATE POLICY "Project editors can insert alert notifications"
  ON public.alert_notifications FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.alert_rules ar
      JOIN public.daily_production_reports dpr
        ON dpr.id = alert_notifications.daily_report_id
      JOIN public.tanks t ON t.id = dpr.tank_id
      WHERE ar.id = alert_notifications.alert_rule_id
        AND ar.project_id = t.project_id
        AND public.can_edit_project(ar.project_id)
    )
  );

-- SRT tables: enforce project isolation through their project/session/tank links.
ALTER TABLE public.srt_mobile_tanks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.srt_tank_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.srt_well_tests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.srt_mobile_tank_calibration ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.well_bsw_manual_entries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Project members can view SRT mobile tanks" ON public.srt_mobile_tanks;
DROP POLICY IF EXISTS "Project editors can manage SRT mobile tanks" ON public.srt_mobile_tanks;
CREATE POLICY "Project members can view SRT mobile tanks"
  ON public.srt_mobile_tanks FOR SELECT TO authenticated
  USING (public.is_member_of_project(project_id) OR public.is_admin_or_director());
CREATE POLICY "Project editors can manage SRT mobile tanks"
  ON public.srt_mobile_tanks FOR ALL TO authenticated
  USING (public.can_edit_project(project_id))
  WITH CHECK (public.can_edit_project(project_id));

DROP POLICY IF EXISTS "Project members can view SRT sessions" ON public.srt_tank_sessions;
DROP POLICY IF EXISTS "Project editors can manage SRT sessions" ON public.srt_tank_sessions;
CREATE POLICY "Project members can view SRT sessions"
  ON public.srt_tank_sessions FOR SELECT TO authenticated
  USING (public.is_member_of_project(project_id) OR public.is_admin_or_director());
CREATE POLICY "Project editors can manage SRT sessions"
  ON public.srt_tank_sessions FOR ALL TO authenticated
  USING (public.can_edit_project(project_id))
  WITH CHECK (public.can_edit_project(project_id));

DROP POLICY IF EXISTS "Project members can view SRT tests" ON public.srt_well_tests;
DROP POLICY IF EXISTS "Project editors can manage SRT tests" ON public.srt_well_tests;
CREATE POLICY "Project members can view SRT tests"
  ON public.srt_well_tests FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.srt_tank_sessions sts
      WHERE sts.id = srt_well_tests.session_id
        AND public.is_member_of_project(sts.project_id)
    )
    OR public.is_admin_or_director()
  );
CREATE POLICY "Project editors can manage SRT tests"
  ON public.srt_well_tests FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.srt_tank_sessions sts
      WHERE sts.id = srt_well_tests.session_id
        AND public.can_edit_project(sts.project_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.srt_tank_sessions sts
      WHERE sts.id = srt_well_tests.session_id
        AND public.can_edit_project(sts.project_id)
    )
  );

DROP POLICY IF EXISTS "Project members can view SRT calibration" ON public.srt_mobile_tank_calibration;
DROP POLICY IF EXISTS "Project editors can manage SRT calibration" ON public.srt_mobile_tank_calibration;
CREATE POLICY "Project members can view SRT calibration"
  ON public.srt_mobile_tank_calibration FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.srt_mobile_tanks smt
      WHERE smt.id = srt_mobile_tank_calibration.tank_id
        AND public.is_member_of_project(smt.project_id)
    )
    OR public.is_admin_or_director()
  );
CREATE POLICY "Project editors can manage SRT calibration"
  ON public.srt_mobile_tank_calibration FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.srt_mobile_tanks smt
      WHERE smt.id = srt_mobile_tank_calibration.tank_id
        AND public.can_edit_project(smt.project_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.srt_mobile_tanks smt
      WHERE smt.id = srt_mobile_tank_calibration.tank_id
        AND public.can_edit_project(smt.project_id)
    )
  );

DROP POLICY IF EXISTS "Authenticated users can view manual bsw entries" ON public.well_bsw_manual_entries;
DROP POLICY IF EXISTS "Authenticated users can insert manual bsw entries" ON public.well_bsw_manual_entries;
DROP POLICY IF EXISTS "Authenticated users can update manual bsw entries" ON public.well_bsw_manual_entries;
DROP POLICY IF EXISTS "Authenticated users can delete manual bsw entries" ON public.well_bsw_manual_entries;
DROP POLICY IF EXISTS "Project members can view manual BSW" ON public.well_bsw_manual_entries;
DROP POLICY IF EXISTS "Project editors can manage manual BSW" ON public.well_bsw_manual_entries;
CREATE POLICY "Project members can view manual BSW"
  ON public.well_bsw_manual_entries FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.wells w
      JOIN public.production_fields pf ON pf.id = w.production_field_id
      WHERE w.id = well_bsw_manual_entries.well_id
        AND public.is_member_of_project(pf.project_id)
    )
    OR public.is_admin_or_director()
  );
CREATE POLICY "Project editors can manage manual BSW"
  ON public.well_bsw_manual_entries FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.wells w
      JOIN public.production_fields pf ON pf.id = w.production_field_id
      WHERE w.id = well_bsw_manual_entries.well_id
        AND public.can_edit_project(pf.project_id)
    )
  )
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1
      FROM public.wells w
      JOIN public.production_fields pf ON pf.id = w.production_field_id
      WHERE w.id = well_bsw_manual_entries.well_id
        AND public.can_edit_project(pf.project_id)
    )
  );

ALTER VIEW IF EXISTS public.unified_well_bsw SET (security_invoker = true);

-- SGPA tables: assets/events inherit project scope from the linked well.
ALTER TABLE public.sgpa_causes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sgpa_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sgpa_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Active users can view SGPA causes" ON public.sgpa_causes;
DROP POLICY IF EXISTS "Active users can manage SGPA causes" ON public.sgpa_causes;
CREATE POLICY "Active users can view SGPA causes"
  ON public.sgpa_causes FOR SELECT TO authenticated
  USING (public.is_active_user());
CREATE POLICY "Active users can manage SGPA causes"
  ON public.sgpa_causes FOR ALL TO authenticated
  USING (public.is_active_user())
  WITH CHECK (public.is_active_user());

DROP POLICY IF EXISTS "Project members can view SGPA assets" ON public.sgpa_assets;
DROP POLICY IF EXISTS "Project editors can manage SGPA assets" ON public.sgpa_assets;
CREATE POLICY "Project members can view SGPA assets"
  ON public.sgpa_assets FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.wells w
      JOIN public.production_fields pf ON pf.id = w.production_field_id
      WHERE w.id = sgpa_assets.well_id
        AND public.is_member_of_project(pf.project_id)
    )
    OR public.is_admin_or_director()
  );
CREATE POLICY "Project editors can manage SGPA assets"
  ON public.sgpa_assets FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.wells w
      JOIN public.production_fields pf ON pf.id = w.production_field_id
      WHERE w.id = sgpa_assets.well_id
        AND public.can_edit_project(pf.project_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.wells w
      JOIN public.production_fields pf ON pf.id = w.production_field_id
      WHERE w.id = sgpa_assets.well_id
        AND public.can_edit_project(pf.project_id)
    )
  );

DROP POLICY IF EXISTS "Project members can view SGPA events" ON public.sgpa_events;
DROP POLICY IF EXISTS "Project editors can manage SGPA events" ON public.sgpa_events;
CREATE POLICY "Project members can view SGPA events"
  ON public.sgpa_events FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.wells w
      JOIN public.production_fields pf ON pf.id = w.production_field_id
      WHERE w.id = sgpa_events.well_id
        AND public.is_member_of_project(pf.project_id)
    )
    OR public.is_admin_or_director()
  );
CREATE POLICY "Project editors can manage SGPA events"
  ON public.sgpa_events FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.wells w
      JOIN public.production_fields pf ON pf.id = w.production_field_id
      WHERE w.id = sgpa_events.well_id
        AND public.can_edit_project(pf.project_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.wells w
      JOIN public.production_fields pf ON pf.id = w.production_field_id
      WHERE w.id = sgpa_events.well_id
        AND public.can_edit_project(pf.project_id)
    )
  );

-- Viewers were previously allowed to mutate SMT/SBP because write policies used
-- is_member_of_project instead of can_edit_project.
DROP POLICY IF EXISTS "Users can insert SBP assets for their projects" ON public.sbp_assets;
DROP POLICY IF EXISTS "Users can update SBP assets for their projects" ON public.sbp_assets;
DROP POLICY IF EXISTS "Users can delete SBP assets for their projects" ON public.sbp_assets;
DROP POLICY IF EXISTS "Project editors can insert SBP assets" ON public.sbp_assets;
DROP POLICY IF EXISTS "Project editors can update SBP assets" ON public.sbp_assets;
DROP POLICY IF EXISTS "Project editors can delete SBP assets" ON public.sbp_assets;
CREATE POLICY "Project editors can insert SBP assets"
  ON public.sbp_assets FOR INSERT TO authenticated
  WITH CHECK (public.can_edit_project(project_id));
CREATE POLICY "Project editors can update SBP assets"
  ON public.sbp_assets FOR UPDATE TO authenticated
  USING (public.can_edit_project(project_id))
  WITH CHECK (public.can_edit_project(project_id));
CREATE POLICY "Project editors can delete SBP assets"
  ON public.sbp_assets FOR DELETE TO authenticated
  USING (public.can_edit_project(project_id));

DROP POLICY IF EXISTS "Users can insert SMT equipment for their projects" ON public.smt_equipment;
DROP POLICY IF EXISTS "Users can update SMT equipment for their projects" ON public.smt_equipment;
DROP POLICY IF EXISTS "Users can delete SMT equipment for their projects" ON public.smt_equipment;
DROP POLICY IF EXISTS "Project editors can insert SMT equipment" ON public.smt_equipment;
DROP POLICY IF EXISTS "Project editors can update SMT equipment" ON public.smt_equipment;
DROP POLICY IF EXISTS "Project editors can delete SMT equipment" ON public.smt_equipment;
CREATE POLICY "Project editors can insert SMT equipment"
  ON public.smt_equipment FOR INSERT TO authenticated
  WITH CHECK (public.can_edit_project(project_id));
CREATE POLICY "Project editors can update SMT equipment"
  ON public.smt_equipment FOR UPDATE TO authenticated
  USING (public.can_edit_project(project_id))
  WITH CHECK (public.can_edit_project(project_id));
CREATE POLICY "Project editors can delete SMT equipment"
  ON public.smt_equipment FOR DELETE TO authenticated
  USING (public.can_edit_project(project_id));

DROP POLICY IF EXISTS "Users can insert SMT preventive plans for their projects" ON public.smt_preventive_plans;
DROP POLICY IF EXISTS "Users can update SMT preventive plans for their projects" ON public.smt_preventive_plans;
DROP POLICY IF EXISTS "Users can delete SMT preventive plans for their projects" ON public.smt_preventive_plans;
DROP POLICY IF EXISTS "Project editors can insert SMT preventive plans" ON public.smt_preventive_plans;
DROP POLICY IF EXISTS "Project editors can update SMT preventive plans" ON public.smt_preventive_plans;
DROP POLICY IF EXISTS "Project editors can delete SMT preventive plans" ON public.smt_preventive_plans;
CREATE POLICY "Project editors can insert SMT preventive plans"
  ON public.smt_preventive_plans FOR INSERT TO authenticated
  WITH CHECK (public.can_edit_project(project_id));
CREATE POLICY "Project editors can update SMT preventive plans"
  ON public.smt_preventive_plans FOR UPDATE TO authenticated
  USING (public.can_edit_project(project_id))
  WITH CHECK (public.can_edit_project(project_id));
CREATE POLICY "Project editors can delete SMT preventive plans"
  ON public.smt_preventive_plans FOR DELETE TO authenticated
  USING (public.can_edit_project(project_id));

DROP POLICY IF EXISTS "Users can insert SMT logs for their projects" ON public.smt_maintenance_logs;
DROP POLICY IF EXISTS "Users can update SMT logs for their projects" ON public.smt_maintenance_logs;
DROP POLICY IF EXISTS "Users can delete SMT logs for their projects" ON public.smt_maintenance_logs;
DROP POLICY IF EXISTS "Project editors can insert SMT logs" ON public.smt_maintenance_logs;
DROP POLICY IF EXISTS "Project editors can update SMT logs" ON public.smt_maintenance_logs;
DROP POLICY IF EXISTS "Project editors can delete SMT logs" ON public.smt_maintenance_logs;
CREATE POLICY "Project editors can insert SMT logs"
  ON public.smt_maintenance_logs FOR INSERT TO authenticated
  WITH CHECK (public.can_edit_project(project_id));
CREATE POLICY "Project editors can update SMT logs"
  ON public.smt_maintenance_logs FOR UPDATE TO authenticated
  USING (public.can_edit_project(project_id))
  WITH CHECK (public.can_edit_project(project_id));
CREATE POLICY "Project editors can delete SMT logs"
  ON public.smt_maintenance_logs FOR DELETE TO authenticated
  USING (public.can_edit_project(project_id));

-- Restrict checklist visibility and writes to the tank's project.
DROP POLICY IF EXISTS "Authenticated users can view well checklists" ON public.well_checklists;
DROP POLICY IF EXISTS "Authenticated users can insert well checklists" ON public.well_checklists;
DROP POLICY IF EXISTS "Users can update their own checklists" ON public.well_checklists;
DROP POLICY IF EXISTS "Users can delete their own checklists" ON public.well_checklists;
DROP POLICY IF EXISTS "Supervisors can view all checklists" ON public.well_checklists;
DROP POLICY IF EXISTS "Project members can view well checklists" ON public.well_checklists;
DROP POLICY IF EXISTS "Project editors can insert well checklists" ON public.well_checklists;
DROP POLICY IF EXISTS "Authors can update well checklists" ON public.well_checklists;
DROP POLICY IF EXISTS "Authors can delete well checklists" ON public.well_checklists;
CREATE POLICY "Project members can view well checklists"
  ON public.well_checklists FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.tanks t
      WHERE t.id = well_checklists.tank_id
        AND public.is_member_of_project(t.project_id)
    )
    OR public.get_my_role() IN ('admin', 'director', 'supervisor', 'operations_manager')
  );
CREATE POLICY "Project editors can insert well checklists"
  ON public.well_checklists FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.tanks t
      WHERE t.id = well_checklists.tank_id
        AND public.can_edit_project(t.project_id)
    )
  );
CREATE POLICY "Authors can update well checklists"
  ON public.well_checklists FOR UPDATE TO authenticated
  USING (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.tanks t
      WHERE t.id = well_checklists.tank_id
        AND public.can_edit_project(t.project_id)
    )
  )
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "Authors can delete well checklists"
  ON public.well_checklists FOR DELETE TO authenticated
  USING (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.tanks t
      WHERE t.id = well_checklists.tank_id
        AND public.can_edit_project(t.project_id)
    )
  );

-- Supervision reports are project-scoped. Global supervision roles retain
-- cross-project visibility, but inactive accounts do not.
DROP POLICY IF EXISTS "Authenticated users can view operational supervision" ON public.operational_supervision;
DROP POLICY IF EXISTS "Approvers and admins can insert operational supervision" ON public.operational_supervision;
DROP POLICY IF EXISTS "Approvers and admins can update operational supervision" ON public.operational_supervision;
DROP POLICY IF EXISTS "Approvers and admins can delete operational supervision" ON public.operational_supervision;
DROP POLICY IF EXISTS "Project members can view operational supervision" ON public.operational_supervision;
DROP POLICY IF EXISTS "Approvers can insert operational supervision" ON public.operational_supervision;
DROP POLICY IF EXISTS "Approvers can update operational supervision" ON public.operational_supervision;
DROP POLICY IF EXISTS "Approvers can delete operational supervision" ON public.operational_supervision;
CREATE POLICY "Project members can view operational supervision"
  ON public.operational_supervision FOR SELECT TO authenticated
  USING (
    public.is_member_of_project(project_id)
    OR public.get_my_role() IN ('admin', 'director', 'approver', 'supervisor', 'operations_manager')
  );
CREATE POLICY "Approvers can insert operational supervision"
  ON public.operational_supervision FOR INSERT TO authenticated
  WITH CHECK (
    public.get_my_role() IN ('admin', 'director', 'approver')
  );
CREATE POLICY "Approvers can update operational supervision"
  ON public.operational_supervision FOR UPDATE TO authenticated
  USING (public.get_my_role() IN ('admin', 'director', 'approver'))
  WITH CHECK (public.get_my_role() IN ('admin', 'director', 'approver'));
CREATE POLICY "Approvers can delete operational supervision"
  ON public.operational_supervision FOR DELETE TO authenticated
  USING (public.get_my_role() IN ('admin', 'director', 'approver'));

-- The calibration RPC stays callable by the authenticated frontend, but now
-- performs an explicit project authorization check before its destructive step.
CREATE OR REPLACE FUNCTION public.import_calibration_data(
  p_tank_id UUID,
  p_data JSONB
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  IF auth.role() <> 'service_role' AND NOT EXISTS (
    SELECT 1
    FROM public.tanks t
    WHERE t.id = p_tank_id
      AND public.can_edit_project(t.project_id)
  ) THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;

  DELETE FROM public.calibration_data WHERE tank_id = p_tank_id;

  INSERT INTO public.calibration_data (tank_id, height_mm, volume_m3, fcv)
  SELECT
    p_tank_id,
    (item->>'height_mm')::NUMERIC,
    (item->>'volume_m3')::NUMERIC,
    COALESCE((item->>'fcv')::NUMERIC, 1.0)
  FROM jsonb_array_elements(p_data) AS item;
END;
$$;

CREATE OR REPLACE FUNCTION public.import_srt_calibration_data(
  p_tank_id UUID,
  p_data JSONB
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  IF auth.role() <> 'service_role' AND NOT EXISTS (
    SELECT 1
    FROM public.srt_mobile_tanks smt
    WHERE smt.id = p_tank_id
      AND public.can_edit_project(smt.project_id)
  ) THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;

  INSERT INTO public.srt_mobile_tank_calibration (
    tank_id,
    height_mm,
    volume_m3,
    fcv
  )
  SELECT
    p_tank_id,
    COALESCE((item->>'height_mm')::NUMERIC, 0),
    COALESCE((item->>'volume_m3')::NUMERIC, 0),
    COALESCE((item->>'fcv')::NUMERIC, 1.0)
  FROM jsonb_array_elements(p_data) AS item;
END;
$$;

REVOKE ALL ON FUNCTION public.import_calibration_data(UUID, JSONB) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.import_srt_calibration_data(UUID, JSONB) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.import_calibration_data(UUID, JSONB) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.import_srt_calibration_data(UUID, JSONB) TO authenticated, service_role;

-- The user directory remains available to legitimate project/team managers,
-- but no longer to every authenticated account.
CREATE OR REPLACE FUNCTION public.list_users_with_profiles()
RETURNS TABLE (
  id UUID,
  email TEXT,
  role public.user_role,
  full_name TEXT,
  avatar_url TEXT,
  approval_status TEXT,
  approved_at TIMESTAMPTZ,
  approved_by UUID,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
STABLE
AS $$
BEGIN
  IF NOT public.is_active_user() OR NOT (
    public.is_admin_or_director()
    OR EXISTS (
      SELECT 1 FROM public.project_members pm
      WHERE pm.user_id = auth.uid() AND pm.role = 'owner'
    )
    OR EXISTS (
      SELECT 1 FROM public.team_members tm
      WHERE tm.user_id = auth.uid() AND tm.role = 'team_admin'
    )
  ) THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  SELECT
    u.id,
    u.email::TEXT,
    COALESCE(p.role, 'operator'::public.user_role),
    COALESCE(p.full_name, u.raw_user_meta_data ->> 'full_name'),
    p.avatar_url,
    COALESCE(p.approval_status, 'pending'),
    p.approved_at,
    p.approved_by,
    u.created_at,
    u.updated_at
  FROM auth.users u
  LEFT JOIN public.user_profiles p ON p.id = u.id
  ORDER BY u.email;
END;
$$;

REVOKE ALL ON FUNCTION public.list_users_with_profiles() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.list_users_with_profiles() TO authenticated;

-- Anonymous users do not need direct access to any operational table. Explicit
-- revocation protects the hosted database even if a policy or RLS flag drifts.
REVOKE ALL PRIVILEGES ON TABLE
  public.projects,
  public.project_members,
  public.project_team_roles,
  public.teams,
  public.team_members,
  public.production_fields,
  public.transfer_destination_categories,
  public.wells,
  public.tanks,
  public.production_data,
  public.calibration_data,
  public.seal_data,
  public.tank_operations,
  public.daily_production_reports,
  public.alert_rules,
  public.alert_notifications,
  public.fcv_calculation_logs,
  public.well_checklists,
  public.operational_supervision,
  public.srt_mobile_tanks,
  public.srt_tank_sessions,
  public.srt_well_tests,
  public.srt_mobile_tank_calibration,
  public.well_bsw_manual_entries,
  public.sgpa_causes,
  public.sgpa_assets,
  public.sgpa_events,
  public.sbp_assets,
  public.smt_equipment,
  public.smt_preventive_plans,
  public.smt_maintenance_logs
FROM anon, PUBLIC;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE
  public.production_fields,
  public.wells,
  public.transfer_destination_categories,
  public.alert_rules,
  public.alert_notifications,
  public.srt_mobile_tanks,
  public.srt_tank_sessions,
  public.srt_well_tests,
  public.srt_mobile_tank_calibration,
  public.well_bsw_manual_entries,
  public.sgpa_causes,
  public.sgpa_assets,
  public.sgpa_events,
  public.sbp_assets,
  public.smt_equipment,
  public.smt_preventive_plans,
  public.smt_maintenance_logs,
  public.well_checklists
TO authenticated;

-- Project logos remain public to display before/around authenticated screens,
-- while mutations are scoped to a project folder: <project_id>/<file>.
DROP POLICY IF EXISTS "Auth Upload" ON storage.objects;
DROP POLICY IF EXISTS "Auth Update" ON storage.objects;
DROP POLICY IF EXISTS "Auth Delete" ON storage.objects;
DROP POLICY IF EXISTS "Project editors upload project logos" ON storage.objects;
DROP POLICY IF EXISTS "Project editors update project logos" ON storage.objects;
DROP POLICY IF EXISTS "Project editors delete project logos" ON storage.objects;

CREATE POLICY "Project editors upload project logos"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'project-logos'
  AND (
    public.is_admin_or_director()
    OR CASE
      WHEN COALESCE((storage.foldername(name))[1], '') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
      THEN public.can_edit_project(((storage.foldername(name))[1])::UUID)
      ELSE FALSE
    END
  )
);

CREATE POLICY "Project editors update project logos"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'project-logos'
  AND (
    public.is_admin_or_director()
    OR CASE
      WHEN COALESCE((storage.foldername(name))[1], '') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
      THEN public.can_edit_project(((storage.foldername(name))[1])::UUID)
      ELSE FALSE
    END
  )
)
WITH CHECK (
  bucket_id = 'project-logos'
  AND (
    public.is_admin_or_director()
    OR CASE
      WHEN COALESCE((storage.foldername(name))[1], '') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
      THEN public.can_edit_project(((storage.foldername(name))[1])::UUID)
      ELSE FALSE
    END
  )
);

CREATE POLICY "Project editors delete project logos"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'project-logos'
  AND (
    public.is_admin_or_director()
    OR CASE
      WHEN COALESCE((storage.foldername(name))[1], '') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
      THEN public.can_edit_project(((storage.foldername(name))[1])::UUID)
      ELSE FALSE
    END
  )
);

NOTIFY pgrst, 'reload schema';
