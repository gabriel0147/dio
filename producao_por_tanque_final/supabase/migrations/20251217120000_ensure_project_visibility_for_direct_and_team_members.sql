-- Enable RLS on projects table if not already enabled
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

-- Drop existing policy if it exists to ensure we replace it with the robust version
DROP POLICY IF EXISTS "Users can view projects they are members of" ON public.projects;

-- Create comprehensive visibility policy for projects
-- This ensures a user can see a project if:
-- 1. They are a direct member (in project_members)
-- 2. They are a member of a team (in team_members) that has a role in the project (in project_team_roles)
CREATE POLICY "Users can view projects they are members of" ON public.projects
FOR SELECT TO authenticated
USING (
  -- Direct membership check
  EXISTS (
    SELECT 1 FROM public.project_members pm
    WHERE pm.project_id = projects.id
    AND pm.user_id = auth.uid()
  )
  OR
  -- Team membership check
  EXISTS (
    SELECT 1 FROM public.project_team_roles ptr
    JOIN public.team_members tm ON ptr.team_id = tm.team_id
    WHERE ptr.project_id = projects.id
    AND tm.user_id = auth.uid()
  )
);

-- Ensure RLS on project_team_roles
ALTER TABLE public.project_team_roles ENABLE ROW LEVEL SECURITY;

-- Drop existing policy to ensure clean slate
DROP POLICY IF EXISTS "Users can view team roles for their teams" ON public.project_team_roles;

-- Allow users to see project assignments for teams they are members of
CREATE POLICY "Users can view team roles for their teams" ON public.project_team_roles
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.team_members tm
    WHERE tm.team_id = project_team_roles.team_id
    AND tm.user_id = auth.uid()
  )
);
