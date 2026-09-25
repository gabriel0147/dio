-- 1. Drop user_id from projects table (CASCADE to remove dependent policies)
ALTER TABLE public.projects DROP COLUMN IF EXISTS user_id CASCADE;

-- 2. Trigger to automatically make creator owner upon project creation
CREATE OR REPLACE FUNCTION public.handle_new_project()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.project_members (project_id, user_id, role)
  VALUES (NEW.id, auth.uid(), 'owner');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_project_created ON public.projects;
CREATE TRIGGER on_project_created
  AFTER INSERT ON public.projects
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_project();

-- 3. Re-create RLS Policies

-- PROJECTS
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view projects they are members of" ON public.projects
    FOR SELECT TO authenticated
    USING (
        EXISTS (SELECT 1 FROM public.project_members WHERE project_id = projects.id AND user_id = auth.uid())
    );

CREATE POLICY "Authenticated users can create projects" ON public.projects
    FOR INSERT TO authenticated
    WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Owners can update projects" ON public.projects
    FOR UPDATE TO authenticated
    USING (
        EXISTS (SELECT 1 FROM public.project_members WHERE project_id = projects.id AND user_id = auth.uid() AND role = 'owner')
    );

CREATE POLICY "Owners can delete projects" ON public.projects
    FOR DELETE TO authenticated
    USING (
        EXISTS (SELECT 1 FROM public.project_members WHERE project_id = projects.id AND user_id = auth.uid() AND role = 'owner')
    );

-- TANKS
ALTER TABLE public.tanks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view tanks of their projects" ON public.tanks
    FOR SELECT TO authenticated
    USING (
        EXISTS (SELECT 1 FROM public.project_members WHERE project_id = tanks.project_id AND user_id = auth.uid())
    );

CREATE POLICY "Editors/Owners can manage tanks" ON public.tanks
    FOR ALL TO authenticated
    USING (
        EXISTS (SELECT 1 FROM public.project_members WHERE project_id = tanks.project_id AND user_id = auth.uid() AND role IN ('owner', 'editor'))
    );

-- TRANSFER CATEGORIES
ALTER TABLE public.transfer_destination_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view transfer categories of their projects" ON public.transfer_destination_categories
    FOR SELECT TO authenticated
    USING (
        EXISTS (SELECT 1 FROM public.project_members WHERE project_id = transfer_destination_categories.project_id AND user_id = auth.uid())
    );

CREATE POLICY "Editors/Owners can manage transfer categories" ON public.transfer_destination_categories
    FOR ALL TO authenticated
    USING (
        EXISTS (SELECT 1 FROM public.project_members WHERE project_id = transfer_destination_categories.project_id AND user_id = auth.uid() AND role IN ('owner', 'editor'))
    );

-- DATA TABLES (production_data, calibration_data, seal_data)

-- Production Data
ALTER TABLE public.production_data ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view production data of their projects" ON public.production_data
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.tanks
            JOIN public.project_members ON tanks.project_id = project_members.project_id
            WHERE tanks.id = production_data.tank_id
            AND project_members.user_id = auth.uid()
        )
    );

CREATE POLICY "Editors/Owners can manage production data" ON public.production_data
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.tanks
            JOIN public.project_members ON tanks.project_id = project_members.project_id
            WHERE tanks.id = production_data.tank_id
            AND project_members.user_id = auth.uid()
            AND project_members.role IN ('owner', 'editor')
        )
    );

-- Calibration Data
ALTER TABLE public.calibration_data ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view calibration data of their projects" ON public.calibration_data
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.tanks
            JOIN public.project_members ON tanks.project_id = project_members.project_id
            WHERE tanks.id = calibration_data.tank_id
            AND project_members.user_id = auth.uid()
        )
    );

CREATE POLICY "Editors/Owners can manage calibration data" ON public.calibration_data
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.tanks
            JOIN public.project_members ON tanks.project_id = project_members.project_id
            WHERE tanks.id = calibration_data.tank_id
            AND project_members.user_id = auth.uid()
            AND project_members.role IN ('owner', 'editor')
        )
    );

-- Seal Data
ALTER TABLE public.seal_data ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view seal data of their projects" ON public.seal_data
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.tanks
            JOIN public.project_members ON tanks.project_id = project_members.project_id
            WHERE tanks.id = seal_data.tank_id
            AND project_members.user_id = auth.uid()
        )
    );

CREATE POLICY "Editors/Owners can manage seal data" ON public.seal_data
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.tanks
            JOIN public.project_members ON tanks.project_id = project_members.project_id
            WHERE tanks.id = seal_data.tank_id
            AND project_members.user_id = auth.uid()
            AND project_members.role IN ('owner', 'editor')
        )
    );

-- FCV Calculation Logs (If table exists and was affected by drop cascade)
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'fcv_calculation_logs') THEN
        ALTER TABLE public.fcv_calculation_logs ENABLE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS "Users can view own fcv logs" ON public.fcv_calculation_logs;
        CREATE POLICY "Users can view own fcv logs" ON public.fcv_calculation_logs
          FOR ALL TO authenticated
          USING (user_id = auth.uid());
    END IF;
END
$$;
