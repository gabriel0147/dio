-- Enable RLS on projects table (idempotent)
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

-- Allow users to view projects if they are a member (direct or via team)
-- This uses the SECURITY DEFINER function is_member_of_project defined in previous migration
-- which handles both direct membership (project_members) and team membership (project_team_roles + team_members)
DROP POLICY IF EXISTS "Users can view projects they are members of" ON public.projects;

CREATE POLICY "Users can view projects they are members of" ON public.projects
FOR SELECT TO authenticated
USING (
  is_member_of_project(id)
);

-- Enable RLS on project_team_roles
ALTER TABLE public.project_team_roles ENABLE ROW LEVEL SECURITY;

-- Allow users to view roles for teams they belong to
-- This is necessary for the frontend/service to fetch project roles associated with the user's teams
DROP POLICY IF EXISTS "Users can view team roles for their teams" ON public.project_team_roles;

CREATE POLICY "Users can view team roles for their teams" ON public.project_team_roles
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.team_members tm
    WHERE tm.team_id = project_team_roles.team_id
    AND tm.user_id = auth.uid()
  )
);

-- Ensure team_members visibility (Users should see their own memberships)
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own team memberships" ON public.team_members;

CREATE POLICY "Users can view their own team memberships" ON public.team_members
FOR SELECT TO authenticated
USING (
  user_id = auth.uid()
);
