-- Fix infinite recursion in RLS policies by using SECURITY DEFINER functions

-- Function to check if current user is a member of a project
-- Bypasses RLS to avoid recursion when querying project_members
CREATE OR REPLACE FUNCTION public.is_member_of_project(_project_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM project_members
    WHERE project_id = _project_id
    AND user_id = auth.uid()
  );
$$;

-- Function to check if current user is an owner of a project
CREATE OR REPLACE FUNCTION public.is_project_owner(_project_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM project_members
    WHERE project_id = _project_id
    AND user_id = auth.uid()
    AND role = 'owner'
  );
$$;

-- Update project_members policies
DROP POLICY IF EXISTS "Members can view project members" ON public.project_members;
CREATE POLICY "Members can view project members" ON public.project_members
    FOR SELECT
    TO authenticated
    USING (
        is_member_of_project(project_id)
    );

DROP POLICY IF EXISTS "Owners can manage project members" ON public.project_members;
CREATE POLICY "Owners can manage project members" ON public.project_members
    FOR ALL
    TO authenticated
    USING (
        is_project_owner(project_id)
    );

-- Update projects policies
DROP POLICY IF EXISTS "Users can view projects they are members of" ON public.projects;
CREATE POLICY "Users can view projects they are members of" ON public.projects
    FOR SELECT TO authenticated
    USING (
        is_member_of_project(id)
    );

DROP POLICY IF EXISTS "Owners can update projects" ON public.projects;
CREATE POLICY "Owners can update projects" ON public.projects
    FOR UPDATE TO authenticated
    USING (
        is_project_owner(id)
    );

DROP POLICY IF EXISTS "Owners can delete projects" ON public.projects;
CREATE POLICY "Owners can delete projects" ON public.projects
    FOR DELETE TO authenticated
    USING (
        is_project_owner(id)
    );
