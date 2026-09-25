-- 1. Create Enum for Project Role
CREATE TYPE public.project_role AS ENUM ('owner', 'editor', 'viewer');

-- 2. Create Project Members Table
CREATE TABLE public.project_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    role public.project_role NOT NULL DEFAULT 'viewer',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    UNIQUE(project_id, user_id)
);

-- 3. Enable RLS
ALTER TABLE public.project_members ENABLE ROW LEVEL SECURITY;

-- 4. Create Policies for project_members

-- Members can view the list of members for projects they belong to
CREATE POLICY "Members can view project members" ON public.project_members
    FOR SELECT
    TO authenticated
    USING (
        project_id IN (
            SELECT project_id FROM public.project_members WHERE user_id = auth.uid()
        )
    );

-- Only owners can insert/update/delete members
CREATE POLICY "Owners can manage project members" ON public.project_members
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.project_members pm
            WHERE pm.project_id = project_members.project_id
            AND pm.user_id = auth.uid()
            AND pm.role = 'owner'
        )
    );


