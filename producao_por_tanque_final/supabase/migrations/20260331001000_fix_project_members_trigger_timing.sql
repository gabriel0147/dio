-- Ensure project owner membership is created only after the project row exists.

CREATE OR REPLACE FUNCTION public.handle_new_project_ownership()
RETURNS TRIGGER AS $$
DECLARE
  v_created_by UUID;
BEGIN
  v_created_by := COALESCE(NEW.created_by, auth.uid());

  INSERT INTO public.project_members (project_id, user_id, role)
  VALUES (NEW.id, v_created_by, 'owner')
  ON CONFLICT (project_id, user_id) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_project_created ON public.projects;
CREATE TRIGGER on_project_created
  AFTER INSERT ON public.projects
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_project_ownership();
