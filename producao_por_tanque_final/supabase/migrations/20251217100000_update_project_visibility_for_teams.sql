-- Migration to update project visibility to include team-based membership

-- 1. Update is_member_of_project to include team checks
-- This function is SECURITY DEFINER, so it bypasses RLS on the tables it queries, preventing recursion.
CREATE OR REPLACE FUNCTION public.is_member_of_project(_project_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    -- Direct membership
    SELECT 1 FROM project_members pm
    WHERE pm.project_id = _project_id
    AND pm.user_id = auth.uid()
  ) OR EXISTS (
    -- Team membership (User is in a team that has a role in the project)
    SELECT 1
    FROM project_team_roles ptr
    JOIN team_members tm ON ptr.team_id = tm.team_id
    WHERE ptr.project_id = _project_id
    AND tm.user_id = auth.uid()
  );
$$;

-- 2. Update is_project_owner to include team checks
CREATE OR REPLACE FUNCTION public.is_project_owner(_project_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    -- Direct ownership
    SELECT 1 FROM project_members pm
    WHERE pm.project_id = _project_id
    AND pm.user_id = auth.uid()
    AND pm.role = 'owner'
  ) OR EXISTS (
    -- Team ownership
    SELECT 1
    FROM project_team_roles ptr
    JOIN team_members tm ON ptr.team_id = tm.team_id
    WHERE ptr.project_id = _project_id
    AND tm.user_id = auth.uid()
    AND ptr.role = 'owner'
  );
$$;

-- 3. Create helper for edit permissions (Owner or Editor)
-- Checks if user has owner or editor role either directly or via team
CREATE OR REPLACE FUNCTION public.can_edit_project(_project_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM project_members pm
    WHERE pm.project_id = _project_id 
    AND pm.user_id = auth.uid() 
    AND pm.role IN ('owner', 'editor')
  ) OR EXISTS (
    SELECT 1
    FROM project_team_roles ptr
    JOIN team_members tm ON ptr.team_id = tm.team_id
    WHERE ptr.project_id = _project_id
    AND tm.user_id = auth.uid()
    AND ptr.role IN ('owner', 'editor')
  );
$$;

-- 4. Update Policies for Child Tables to use the unified functions

-- TANKS
DROP POLICY IF EXISTS "Users can view tanks of their projects" ON public.tanks;
CREATE POLICY "Users can view tanks of their projects" ON public.tanks
    FOR SELECT TO authenticated
    USING (is_member_of_project(project_id));

DROP POLICY IF EXISTS "Editors/Owners can manage tanks" ON public.tanks;
CREATE POLICY "Editors/Owners can manage tanks" ON public.tanks
    FOR ALL TO authenticated
    USING (can_edit_project(project_id));

-- TRANSFER CATEGORIES
DROP POLICY IF EXISTS "Users can view transfer categories of their projects" ON public.transfer_destination_categories;
CREATE POLICY "Users can view transfer categories of their projects" ON public.transfer_destination_categories
    FOR SELECT TO authenticated
    USING (is_member_of_project(project_id));

DROP POLICY IF EXISTS "Editors/Owners can manage transfer categories" ON public.transfer_destination_categories;
CREATE POLICY "Editors/Owners can manage transfer categories" ON public.transfer_destination_categories
    FOR ALL TO authenticated
    USING (can_edit_project(project_id));

-- PRODUCTION DATA
DROP POLICY IF EXISTS "Users can view production data of their projects" ON public.production_data;
CREATE POLICY "Users can view production data of their projects" ON public.production_data
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.tanks 
            WHERE tanks.id = production_data.tank_id 
            AND is_member_of_project(tanks.project_id)
        )
    );

DROP POLICY IF EXISTS "Editors/Owners can manage production data" ON public.production_data;
CREATE POLICY "Editors/Owners can manage production data" ON public.production_data
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.tanks 
            WHERE tanks.id = production_data.tank_id 
            AND can_edit_project(tanks.project_id)
        )
    );

-- CALIBRATION DATA
DROP POLICY IF EXISTS "Users can view calibration data of their projects" ON public.calibration_data;
CREATE POLICY "Users can view calibration data of their projects" ON public.calibration_data
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.tanks 
            WHERE tanks.id = calibration_data.tank_id 
            AND is_member_of_project(tanks.project_id)
        )
    );

DROP POLICY IF EXISTS "Editors/Owners can manage calibration data" ON public.calibration_data;
CREATE POLICY "Editors/Owners can manage calibration data" ON public.calibration_data
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.tanks 
            WHERE tanks.id = calibration_data.tank_id 
            AND can_edit_project(tanks.project_id)
        )
    );

-- SEAL DATA
DROP POLICY IF EXISTS "Users can view seal data of their projects" ON public.seal_data;
CREATE POLICY "Users can view seal data of their projects" ON public.seal_data
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.tanks 
            WHERE tanks.id = seal_data.tank_id 
            AND is_member_of_project(tanks.project_id)
        )
    );

DROP POLICY IF EXISTS "Editors/Owners can manage seal data" ON public.seal_data;
CREATE POLICY "Editors/Owners can manage seal data" ON public.seal_data
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.tanks 
            WHERE tanks.id = seal_data.tank_id 
            AND can_edit_project(tanks.project_id)
        )
    );

-- DAILY PRODUCTION REPORTS (Ensure table has RLS and policies)
ALTER TABLE public.daily_production_reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view reports of their projects" ON public.daily_production_reports;
CREATE POLICY "Users can view reports of their projects" ON public.daily_production_reports
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.tanks 
            WHERE tanks.id = daily_production_reports.tank_id 
            AND is_member_of_project(tanks.project_id)
        )
    );

DROP POLICY IF EXISTS "Editors/Owners can manage reports" ON public.daily_production_reports;
CREATE POLICY "Editors/Owners can manage reports" ON public.daily_production_reports
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.tanks 
            WHERE tanks.id = daily_production_reports.tank_id 
            AND can_edit_project(tanks.project_id)
        )
    );

-- TANK OPERATIONS (Ensure table has RLS and policies)
ALTER TABLE public.tank_operations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view operations of their projects" ON public.tank_operations;
CREATE POLICY "Users can view operations of their projects" ON public.tank_operations
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.tanks 
            WHERE tanks.id = tank_operations.tank_id 
            AND is_member_of_project(tanks.project_id)
        )
    );

DROP POLICY IF EXISTS "Editors/Owners can manage operations" ON public.tank_operations;
CREATE POLICY "Editors/Owners can manage operations" ON public.tank_operations
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.tanks 
            WHERE tanks.id = tank_operations.tank_id 
            AND can_edit_project(tanks.project_id)
        )
    );

-- PRODUCTION FIELDS (Optional: if they are project-specific)
ALTER TABLE public.production_fields ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view production fields" ON public.production_fields;
CREATE POLICY "Users can view production fields" ON public.production_fields
    FOR SELECT TO authenticated
    USING (
        project_id IS NULL OR is_member_of_project(project_id)
    );

DROP POLICY IF EXISTS "Editors/Owners can manage production fields" ON public.production_fields;
CREATE POLICY "Editors/Owners can manage production fields" ON public.production_fields
    FOR ALL TO authenticated
    USING (
        project_id IS NOT NULL AND can_edit_project(project_id)
    );

-- WELLS (Linked to production fields)
ALTER TABLE public.wells ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view wells of their projects" ON public.wells;
CREATE POLICY "Users can view wells of their projects" ON public.wells
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.production_fields pf
            WHERE pf.id = wells.production_field_id
            AND (pf.project_id IS NULL OR is_member_of_project(pf.project_id))
        )
    );

DROP POLICY IF EXISTS "Editors/Owners can manage wells" ON public.wells;
CREATE POLICY "Editors/Owners can manage wells" ON public.wells
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.production_fields pf
            WHERE pf.id = wells.production_field_id
            AND pf.project_id IS NOT NULL 
            AND can_edit_project(pf.project_id)
        )
    );
