DROP POLICY IF EXISTS "Editors/Owners can manage production data" ON public.production_data;
DROP POLICY IF EXISTS "Admins and Directors can manage all production data" ON public.production_data;

CREATE POLICY "Editors/Owners can manage production data"
  ON public.production_data
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.tanks
      WHERE tanks.id = production_data.tank_id
        AND public.can_edit_project(tanks.project_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.tanks
      WHERE tanks.id = production_data.tank_id
        AND public.can_edit_project(tanks.project_id)
    )
  );

CREATE POLICY "Admins and Directors can manage all production data"
  ON public.production_data
  FOR ALL
  TO authenticated
  USING (public.is_admin_or_director())
  WITH CHECK (public.is_admin_or_director());
