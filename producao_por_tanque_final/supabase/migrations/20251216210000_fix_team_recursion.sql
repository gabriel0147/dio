-- Fix infinite recursion in RLS policies for teams and team_members by using SECURITY DEFINER functions

-- Function to check if current user is a member of a team
CREATE OR REPLACE FUNCTION public.is_member_of_team(_team_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM team_members
    WHERE team_id = _team_id
    AND user_id = auth.uid()
  );
$$;

-- Function to check if current user is a team admin
CREATE OR REPLACE FUNCTION public.is_team_admin(_team_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM team_members
    WHERE team_id = _team_id
    AND user_id = auth.uid()
    AND role = 'team_admin'
  );
$$;

-- Function to check if current user is the owner of a team
CREATE OR REPLACE FUNCTION public.is_team_owner(_team_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM teams
    WHERE id = _team_id
    AND owner_user_id = auth.uid()
  );
$$;

-- Update teams policies
DROP POLICY IF EXISTS "Users can view teams they belong to" ON public.teams;
CREATE POLICY "Users can view teams they belong to" ON public.teams
    FOR SELECT
    USING (
        auth.uid() = owner_user_id OR
        is_member_of_team(id)
    );

-- Update team_members policies
DROP POLICY IF EXISTS "View team members" ON public.team_members;
CREATE POLICY "View team members" ON public.team_members
    FOR SELECT
    USING (
        is_team_owner(team_id) OR
        is_member_of_team(team_id)
    );

DROP POLICY IF EXISTS "Manage team members" ON public.team_members;
CREATE POLICY "Manage team members" ON public.team_members
    FOR ALL
    USING (
        is_team_owner(team_id) OR
        is_team_admin(team_id)
    );

-- Update project_team_roles policies to be consistent and safe
DROP POLICY IF EXISTS "View project team roles" ON public.project_team_roles;
CREATE POLICY "View project team roles" ON public.project_team_roles
    FOR SELECT
    USING (
        is_member_of_project(project_id) OR
        is_member_of_team(team_id) OR
        is_team_owner(team_id)
    );

DROP POLICY IF EXISTS "Project owners can manage team roles" ON public.project_team_roles;
CREATE POLICY "Project owners can manage team roles" ON public.project_team_roles
    FOR ALL
    USING (
        is_project_owner(project_id)
    );
