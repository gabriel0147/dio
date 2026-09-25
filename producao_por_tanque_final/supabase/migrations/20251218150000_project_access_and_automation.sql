-- Enable RLS on relevant tables to ensure security
ALTER TABLE public.project_team_roles ENABLE ROW LEVEL SECURITY;

-- 1. Add created_by column to projects table to track ownership/creator
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id);

-- 2. Create function to automatically assign the creator as the project owner
CREATE OR REPLACE FUNCTION public.handle_new_project_ownership()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert the creator as the owner in project_members
  INSERT INTO public.project_members (project_id, user_id, role)
  VALUES (NEW.id, NEW.created_by, 'owner');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Create Trigger to fire after a project is inserted
DROP TRIGGER IF EXISTS on_project_created ON public.projects;
CREATE TRIGGER on_project_created
  AFTER INSERT ON public.projects
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_project_ownership();

-- 4. Update RLS Policy for Projects Visibility
-- This ensures users can see projects if they are:
-- a) The creator
-- b) A direct member (project_members)
-- c) A member of a team assigned to the project (project_team_roles)

DROP POLICY IF EXISTS "Users can view projects they are members of" ON public.projects;

CREATE POLICY "Users can view projects they are members of" ON public.projects
  FOR SELECT
  TO authenticated
  USING (
    -- Creator check (safe fallback)
    auth.uid() = created_by 
    OR
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

-- 5. RLS Policies for Project Team Roles (linking table)
-- Users need to see these roles to know they have access via a team

DROP POLICY IF EXISTS "Users can view team roles for their teams" ON public.project_team_roles;

CREATE POLICY "Users can view team roles for their teams" ON public.project_team_roles
  FOR SELECT
  TO authenticated
  USING (
    -- User is a member of the team associated with this role assignment
    EXISTS (
      SELECT 1 FROM public.team_members tm
      WHERE tm.team_id = project_team_roles.team_id
      AND tm.user_id = auth.uid()
    )
    OR
    -- Or user is a member of the project (e.g. owner/admin viewing who has access)
    EXISTS (
      SELECT 1 FROM public.project_members pm
      WHERE pm.project_id = project_team_roles.project_id
      AND pm.user_id = auth.uid()
    )
  );

-- Allow Project Owners to manage team roles
DROP POLICY IF EXISTS "Project owners can manage team roles" ON public.project_team_roles;

CREATE POLICY "Project owners can manage team roles" ON public.project_team_roles
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.project_members pm
      WHERE pm.project_id = project_team_roles.project_id
      AND pm.user_id = auth.uid()
      AND pm.role = 'owner'
    )
  );
