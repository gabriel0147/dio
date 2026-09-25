do $$
declare
  v_production_project_id constant uuid := '11111111-1111-1111-1111-111111111111';
  v_maintenance_project_id constant uuid := '22222222-2222-2222-2222-222222222222';
begin
  insert into public.project_members (project_id, user_id, role)
  select fixed_projects.project_id, up.id, 'viewer'::public.project_role
  from public.user_profiles up
  cross join (
    values
      (v_production_project_id),
      (v_maintenance_project_id)
  ) as fixed_projects(project_id)
  where up.approval_status = 'active'
  on conflict (project_id, user_id) do nothing;
end $$;
