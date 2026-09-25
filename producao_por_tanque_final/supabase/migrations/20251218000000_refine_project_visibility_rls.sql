ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

-- Drop existing policy if exists to avoid conflicts or outdated logic
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
