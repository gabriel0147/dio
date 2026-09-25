DROP POLICY IF EXISTS "Users can view transfer categories of their projects" ON public.transfer_destination_categories;
DROP POLICY IF EXISTS "Editors/Owners can manage transfer categories" ON public.transfer_destination_categories;
DROP POLICY IF EXISTS "Admins and Directors can manage all transfer categories" ON public.transfer_destination_categories;

CREATE POLICY "Users can view transfer categories of their projects"
  ON public.transfer_destination_categories
  FOR SELECT
  TO authenticated
  USING (
    project_id IS NULL
    OR public.is_member_of_project(project_id)
    OR public.is_admin_or_director()
  );

CREATE POLICY "Editors/Owners can manage transfer categories"
  ON public.transfer_destination_categories
  FOR ALL
  TO authenticated
  USING (
    project_id IS NOT NULL
    AND public.can_edit_project(project_id)
  )
  WITH CHECK (
    project_id IS NOT NULL
    AND public.can_edit_project(project_id)
  );

CREATE POLICY "Admins and Directors can manage all transfer categories"
  ON public.transfer_destination_categories
  FOR ALL
  TO authenticated
  USING (public.is_admin_or_director())
  WITH CHECK (public.is_admin_or_director());
