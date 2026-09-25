-- Create projects table
CREATE TABLE public.projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    user_id UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create tanks table
CREATE TABLE public.tanks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
    tag TEXT NOT NULL,
    specific_oil TEXT NOT NULL,
    geolocation TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE(project_id, tag)
);

-- Create production_data table
CREATE TABLE public.production_data (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tank_id UUID REFERENCES public.tanks(id) ON DELETE CASCADE NOT NULL,
    date DATE,
    gross_production NUMERIC,
    total_water_production NUMERIC,
    uncorrected_oil_production NUMERIC,
    corrected_oil_production NUMERIC,
    raw_data JSONB NOT NULL, -- Stores the full frontend row object
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Create calibration_data table
CREATE TABLE public.calibration_data (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tank_id UUID REFERENCES public.tanks(id) ON DELETE CASCADE NOT NULL,
    height_mm NUMERIC NOT NULL,
    volume_m3 NUMERIC NOT NULL,
    fcv NUMERIC,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Create seal_data table
CREATE TABLE public.seal_data (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tank_id UUID REFERENCES public.tanks(id) ON DELETE CASCADE NOT NULL,
    date DATE,
    raw_data JSONB NOT NULL, -- Stores the full frontend row object
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Create fcv_data table
CREATE TABLE public.fcv_data (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tank_id UUID REFERENCES public.tanks(id) ON DELETE CASCADE NOT NULL,
    raw_data JSONB NOT NULL, -- Stores the FCVData object (matrix)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Enable Row Level Security
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tanks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.production_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calibration_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seal_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fcv_data ENABLE ROW LEVEL SECURITY;

-- Create Policies
-- Projects: Users can see their own projects
CREATE POLICY "Users can view own projects" ON public.projects
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own projects" ON public.projects
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own projects" ON public.projects
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own projects" ON public.projects
    FOR DELETE USING (auth.uid() = user_id);

-- Tanks: Users can access tanks of their projects
CREATE POLICY "Users can view tanks of own projects" ON public.tanks
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM public.projects WHERE id = tanks.project_id AND user_id = auth.uid())
    );

CREATE POLICY "Users can insert tanks to own projects" ON public.tanks
    FOR INSERT WITH CHECK (
        EXISTS (SELECT 1 FROM public.projects WHERE id = tanks.project_id AND user_id = auth.uid())
    );

CREATE POLICY "Users can update tanks of own projects" ON public.tanks
    FOR UPDATE USING (
        EXISTS (SELECT 1 FROM public.projects WHERE id = tanks.project_id AND user_id = auth.uid())
    );

CREATE POLICY "Users can delete tanks of own projects" ON public.tanks
    FOR DELETE USING (
        EXISTS (SELECT 1 FROM public.projects WHERE id = tanks.project_id AND user_id = auth.uid())
    );

-- Production Data: Access via Tank -> Project -> User
CREATE POLICY "Users can access production_data" ON public.production_data
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.tanks t
            JOIN public.projects p ON t.project_id = p.id
            WHERE t.id = production_data.tank_id AND p.user_id = auth.uid()
        )
    );

-- Calibration Data: Access via Tank -> Project -> User
CREATE POLICY "Users can access calibration_data" ON public.calibration_data
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.tanks t
            JOIN public.projects p ON t.project_id = p.id
            WHERE t.id = calibration_data.tank_id AND p.user_id = auth.uid()
        )
    );

-- Seal Data: Access via Tank -> Project -> User
CREATE POLICY "Users can access seal_data" ON public.seal_data
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.tanks t
            JOIN public.projects p ON t.project_id = p.id
            WHERE t.id = seal_data.tank_id AND p.user_id = auth.uid()
        )
    );

-- FCV Data: Access via Tank -> Project -> User
CREATE POLICY "Users can access fcv_data" ON public.fcv_data
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.tanks t
            JOIN public.projects p ON t.project_id = p.id
            WHERE t.id = fcv_data.tank_id AND p.user_id = auth.uid()
        )
    );
