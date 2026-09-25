alter table public.projects
add column if not exists project_scope text;

update public.projects
set project_scope = case
  when project_scope in ('production', 'maintenance') then project_scope
  when module_type in ('smt', 'sbp') then 'maintenance'
  when lower(coalesce(name, '')) like '%manut%' then 'maintenance'
  when lower(coalesce(description, '')) like '%manut%' then 'maintenance'
  else 'production'
end
where project_scope is null;

update public.projects
set project_scope = 'production'
where project_scope not in ('production', 'maintenance')
   or project_scope is null;

alter table public.projects
alter column project_scope set default 'production';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'projects_project_scope_check'
  ) then
    alter table public.projects
    add constraint projects_project_scope_check
    check (project_scope in ('production', 'maintenance'));
  end if;
end $$;

alter table public.projects
alter column project_scope set not null;

create index if not exists idx_projects_project_scope
on public.projects (project_scope);
