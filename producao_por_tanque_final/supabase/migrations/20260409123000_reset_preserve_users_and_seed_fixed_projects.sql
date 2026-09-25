-- Limpa os dados da aplicacao preservando apenas auth.users e public.user_profiles.
-- Ao final, recria os dois projetos fixos usados pelo sistema: Producao e Manutencao.

truncate table
  public.alert_notifications,
  public.alert_rules,
  public.operational_supervision,
  public.well_checklists,
  public.project_team_roles,
  public.team_members,
  public.project_members,
  public.audit_logs,
  public.well_bsw_manual_entries,
  public.srt_well_tests,
  public.srt_tank_sessions,
  public.srt_mobile_tank_calibration,
  public.srt_mobile_tanks,
  public.sgpa_events,
  public.sgpa_assets,
  public.sgpa_causes,
  public.smt_maintenance_logs,
  public.smt_preventive_plans,
  public.smt_equipment,
  public.sbp_assets,
  public.tank_operations,
  public.daily_production_reports,
  public.production_data,
  public.calibration_data,
  public.seal_data,
  public.fcv_data,
  public.fcv_calculation_logs,
  public.transfer_destination_categories,
  public.tanks,
  public.wells,
  public.production_fields,
  public.teams,
  public.projects,
  public.app_settings
restart identity cascade;

do $$
declare
  v_default_owner uuid;
  v_production_project_id constant uuid := '11111111-1111-1111-1111-111111111111';
  v_maintenance_project_id constant uuid := '22222222-2222-2222-2222-222222222222';
begin
  select id
  into v_default_owner
  from public.user_profiles
  order by created_at asc, id asc
  limit 1;

  if v_default_owner is null then
    return;
  end if;

  insert into public.projects (
    id,
    name,
    description,
    created_by,
    module_type,
    project_scope
  )
  values
    (
      v_production_project_id,
      'Producao',
      'Projeto fixo da area de producao',
      v_default_owner,
      null,
      'production'
    ),
    (
      v_maintenance_project_id,
      'Manutencao',
      'Projeto fixo da area de manutencao',
      v_default_owner,
      null,
      'maintenance'
    )
  on conflict (id) do update
  set
    name = excluded.name,
    description = excluded.description,
    created_by = excluded.created_by,
    module_type = excluded.module_type,
    project_scope = excluded.project_scope;

  insert into public.project_members (project_id, user_id, role)
  select project_id, id, 'owner'::public.project_role
  from public.user_profiles
  cross join (
    values
      (v_production_project_id),
      (v_maintenance_project_id)
  ) as fixed_projects(project_id)
  on conflict (project_id, user_id) do update
  set role = excluded.role;
end $$;
