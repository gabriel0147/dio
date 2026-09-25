alter table public.user_profiles
add column if not exists approval_status text not null default 'active',
add column if not exists approved_at timestamptz,
add column if not exists approved_by uuid references public.user_profiles(id) on delete set null;

update public.user_profiles
set approval_status = 'active'
where approval_status is null
   or approval_status not in ('pending', 'active', 'rejected');

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'user_profiles_approval_status_check'
  ) then
    alter table public.user_profiles
      add constraint user_profiles_approval_status_check
      check (approval_status in ('pending', 'active', 'rejected'));
  end if;
end $$;

create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.user_profiles (
    id,
    role,
    full_name,
    approval_status
  )
  values (
    new.id,
    'operator',
    coalesce(new.raw_user_meta_data ->> 'full_name', null),
    'pending'
  )
  on conflict (id) do update
    set full_name = coalesce(public.user_profiles.full_name, excluded.full_name);

  return new;
end;
$$ language plpgsql security definer;

drop function if exists public.list_users_with_profiles();

create function public.list_users_with_profiles()
returns table (
  id uuid,
  email text,
  role public.user_role,
  full_name text,
  avatar_url text,
  approval_status text,
  approved_at timestamptz,
  approved_by uuid,
  created_at timestamptz,
  updated_at timestamptz
)
language sql
security definer
set search_path = public, auth
stable
as $$
  select
    u.id,
    u.email::text,
    coalesce(p.role, 'operator'::public.user_role) as role,
    coalesce(p.full_name, u.raw_user_meta_data ->> 'full_name') as full_name,
    p.avatar_url,
    coalesce(p.approval_status, 'pending') as approval_status,
    p.approved_at,
    p.approved_by,
    u.created_at,
    u.updated_at
  from auth.users u
  left join public.user_profiles p on p.id = u.id
  order by u.email;
$$;

revoke all on function public.list_users_with_profiles() from public;
grant execute on function public.list_users_with_profiles() to authenticated;
