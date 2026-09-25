alter table public.projects
add column if not exists module_type text;

alter table public.projects
drop constraint if exists projects_module_type_check;

alter table public.projects
drop constraint if exists projects_module_type_valid;

alter table public.projects
add constraint projects_module_type_check
check (module_type is null or module_type in ('srp', 'sgp', 'smt', 'sbp', 'srt', 'sgpa'));

update public.projects
set module_type = case
  when module_type is not null then module_type
  when lower(coalesce(name, '') || ' ' || coalesce(description, '')) like '%sgpa%' then 'sgpa'
  when lower(coalesce(name, '') || ' ' || coalesce(description, '')) like '%gestão de paradas%' then 'sgpa'
  when lower(coalesce(name, '') || ' ' || coalesce(description, '')) like '%gestao de paradas%' then 'sgpa'
  when lower(coalesce(name, '') || ' ' || coalesce(description, '')) like '%srt%' then 'srt'
  when lower(coalesce(name, '') || ' ' || coalesce(description, '')) like '%registro de teste%' then 'srt'
  when lower(coalesce(name, '') || ' ' || coalesce(description, '')) like '%smt%' then 'smt'
  when lower(coalesce(name, '') || ' ' || coalesce(description, '')) like '%manutenção%' then 'smt'
  when lower(coalesce(name, '') || ' ' || coalesce(description, '')) like '%manutencao%' then 'smt'
  when lower(coalesce(name, '') || ' ' || coalesce(description, '')) like '%sbp%' then 'sbp'
  when lower(coalesce(name, '') || ' ' || coalesce(description, '')) like '%bens patrimoniais%' then 'sbp'
  when lower(coalesce(name, '') || ' ' || coalesce(description, '')) like '%patrimônio%' then 'sbp'
  when lower(coalesce(name, '') || ' ' || coalesce(description, '')) like '%patrimonio%' then 'sbp'
  when lower(coalesce(name, '') || ' ' || coalesce(description, '')) like '%sgp%' then 'sgp'
  when lower(coalesce(name, '') || ' ' || coalesce(description, '')) like '%gestão da produção%' then 'sgp'
  when lower(coalesce(name, '') || ' ' || coalesce(description, '')) like '%gestao da producao%' then 'sgp'
  when lower(coalesce(name, '') || ' ' || coalesce(description, '')) like '%srp%' then 'srp'
  when lower(coalesce(name, '') || ' ' || coalesce(description, '')) like '%registro da produção%' then 'srp'
  when lower(coalesce(name, '') || ' ' || coalesce(description, '')) like '%registro da producao%' then 'srp'
  else null
end;
