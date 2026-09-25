-- Make project creation resilient to RLS during project inserts and reads.

ALTER TABLE public.projects
ALTER COLUMN created_by SET DEFAULT auth.uid();

CREATE OR REPLACE FUNCTION public.handle_new_project_ownership()
RETURNS TRIGGER AS $$
DECLARE
  v_created_by UUID;
BEGIN
  v_created_by := COALESCE(NEW.created_by, auth.uid());
  NEW.created_by := v_created_by;

  INSERT INTO public.project_members (project_id, user_id, role)
  VALUES (NEW.id, v_created_by, 'owner')
  ON CONFLICT (project_id, user_id) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_project_created ON public.projects;
CREATE TRIGGER on_project_created
  BEFORE INSERT ON public.projects
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_project_ownership();

DROP POLICY IF EXISTS "Authenticated users can create projects" ON public.projects;
CREATE POLICY "Authenticated users can create projects"
  ON public.projects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_admin_or_director()
    OR created_by = auth.uid()
  );

DROP POLICY IF EXISTS "Users can view projects they are members of" ON public.projects;
CREATE POLICY "Users can view projects they are members of"
  ON public.projects
  FOR SELECT
  TO authenticated
  USING (
    created_by = auth.uid()
    OR public.is_member_of_project(id)
  );

DROP POLICY IF EXISTS "Admins and Directors can manage all projects" ON public.projects;
CREATE POLICY "Admins and Directors can manage all projects"
  ON public.projects
  FOR ALL
  TO authenticated
  USING (
    public.is_admin_or_director()
  )
  WITH CHECK (
    public.is_admin_or_director()
  );
