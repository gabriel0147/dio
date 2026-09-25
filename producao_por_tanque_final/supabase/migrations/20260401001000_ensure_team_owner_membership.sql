CREATE OR REPLACE FUNCTION public.ensure_team_owner_membership()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.team_members (team_id, user_id, role)
  VALUES (NEW.id, NEW.owner_user_id, 'team_admin')
  ON CONFLICT (team_id, user_id) DO UPDATE
  SET role = 'team_admin',
      updated_at = now();

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS ensure_team_owner_membership_trigger ON public.teams;
CREATE TRIGGER ensure_team_owner_membership_trigger
AFTER INSERT ON public.teams
FOR EACH ROW
EXECUTE FUNCTION public.ensure_team_owner_membership();

INSERT INTO public.team_members (team_id, user_id, role)
SELECT t.id, t.owner_user_id, 'team_admin'
FROM public.teams t
ON CONFLICT (team_id, user_id) DO UPDATE
SET role = 'team_admin',
    updated_at = now();
