-- Create SBP Assets Table (Bens Patrimoniais)
CREATE TABLE public.sbp_assets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    asset_number TEXT NOT NULL,
    description TEXT NOT NULL,
    category TEXT NOT NULL,
    acquisition_date DATE,
    acquisition_value NUMERIC(15, 2),
    estimated_useful_life INTEGER, -- in years
    location TEXT,
    responsible TEXT,
    situation TEXT NOT NULL CHECK (situation IN ('active', 'in_use', 'idle', 'retired')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create SMT Equipment Table
CREATE TABLE public.smt_equipment (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    sbp_asset_id UUID REFERENCES public.sbp_assets(id) ON DELETE SET NULL,
    code TEXT NOT NULL,
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    manufacturer TEXT,
    model TEXT,
    serial_number TEXT,
    acquisition_date DATE,
    location TEXT,
    cost_center TEXT,
    status TEXT NOT NULL CHECK (status IN ('active', 'in_maintenance', 'inactive', 'scrapped')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create SMT Preventive Plans Table
CREATE TABLE public.smt_preventive_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    equipment_id UUID NOT NULL REFERENCES public.smt_equipment(id) ON DELETE CASCADE,
    periodicity_type TEXT NOT NULL CHECK (periodicity_type IN ('days', 'hours')),
    interval INTEGER NOT NULL,
    checklist JSONB, -- Stores the checklist structure/items
    next_scheduled_date DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create SMT Maintenance Logs Table
CREATE TABLE public.smt_maintenance_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    equipment_id UUID NOT NULL REFERENCES public.smt_equipment(id) ON DELETE CASCADE,
    preventive_plan_id UUID REFERENCES public.smt_preventive_plans(id) ON DELETE SET NULL,
    type TEXT NOT NULL CHECK (type IN ('preventive', 'corrective')),
    status TEXT NOT NULL CHECK (status IN ('open', 'in_progress', 'finished')),
    failure_description TEXT,
    cause TEXT,
    action_taken TEXT,
    start_at TIMESTAMP WITH TIME ZONE,
    end_at TIMESTAMP WITH TIME ZONE,
    responsible_user_id UUID REFERENCES public.user_profiles(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.sbp_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.smt_equipment ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.smt_preventive_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.smt_maintenance_logs ENABLE ROW LEVEL SECURITY;

-- Create Policies (Using existing helper functions/logic)
-- Assuming is_member_of_project function exists or we use simple project_id checks for now based on auth.uid()
-- For simplicity in this migration, we will use a generic policy that checks project membership if possible, 
-- or just allow authenticated users to read/write if they are part of the project.
-- Since the user story doesn't specify complex RLS, we'll assume basic authenticated access for now or use the `is_member_of_project` if available.

CREATE POLICY "Users can view SBP assets for their projects" ON public.sbp_assets
    FOR SELECT USING (public.is_member_of_project(project_id));

CREATE POLICY "Users can insert SBP assets for their projects" ON public.sbp_assets
    FOR INSERT WITH CHECK (public.is_member_of_project(project_id));

CREATE POLICY "Users can update SBP assets for their projects" ON public.sbp_assets
    FOR UPDATE USING (public.is_member_of_project(project_id));

CREATE POLICY "Users can delete SBP assets for their projects" ON public.sbp_assets
    FOR DELETE USING (public.is_member_of_project(project_id));

-- SMT Equipment Policies
CREATE POLICY "Users can view SMT equipment for their projects" ON public.smt_equipment
    FOR SELECT USING (public.is_member_of_project(project_id));

CREATE POLICY "Users can insert SMT equipment for their projects" ON public.smt_equipment
    FOR INSERT WITH CHECK (public.is_member_of_project(project_id));

CREATE POLICY "Users can update SMT equipment for their projects" ON public.smt_equipment
    FOR UPDATE USING (public.is_member_of_project(project_id));

CREATE POLICY "Users can delete SMT equipment for their projects" ON public.smt_equipment
    FOR DELETE USING (public.is_member_of_project(project_id));

-- SMT Preventive Plans Policies
CREATE POLICY "Users can view SMT preventive plans for their projects" ON public.smt_preventive_plans
    FOR SELECT USING (public.is_member_of_project(project_id));

CREATE POLICY "Users can insert SMT preventive plans for their projects" ON public.smt_preventive_plans
    FOR INSERT WITH CHECK (public.is_member_of_project(project_id));

CREATE POLICY "Users can update SMT preventive plans for their projects" ON public.smt_preventive_plans
    FOR UPDATE USING (public.is_member_of_project(project_id));

CREATE POLICY "Users can delete SMT preventive plans for their projects" ON public.smt_preventive_plans
    FOR DELETE USING (public.is_member_of_project(project_id));

-- SMT Maintenance Logs Policies
CREATE POLICY "Users can view SMT logs for their projects" ON public.smt_maintenance_logs
    FOR SELECT USING (public.is_member_of_project(project_id));

CREATE POLICY "Users can insert SMT logs for their projects" ON public.smt_maintenance_logs
    FOR INSERT WITH CHECK (public.is_member_of_project(project_id));

CREATE POLICY "Users can update SMT logs for their projects" ON public.smt_maintenance_logs
    FOR UPDATE USING (public.is_member_of_project(project_id));

CREATE POLICY "Users can delete SMT logs for their projects" ON public.smt_maintenance_logs
    FOR DELETE USING (public.is_member_of_project(project_id));
