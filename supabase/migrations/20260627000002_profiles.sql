-- Faro — M1: profiles. One row per authenticated responder (volunteer or
-- coordinator). Citizens never get a row — they act anonymously.

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  role public.user_role not null default 'volunteer',
  display_name text not null check (char_length(display_name) between 1 and 80),
  -- Optional contact a coordinator may reach a volunteer on. Never exposed to
  -- citizens or anon — RLS keeps profiles readable only to responders.
  phone text check (phone is null or char_length(phone) between 5 and 30),
  organization text check (organization is null or char_length(organization) <= 120),
  -- Coordinators bless other accounts; self-claimed roles are not trusted.
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.profiles is
  'Authenticated responders. Citizens stay anonymous and have no profile.';

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

alter table public.profiles enable row level security;

-- A responder can read their own profile and other responders' (needed for
-- coordination/assignment). Anon citizens get nothing here.
create policy "profiles: responders read"
  on public.profiles for select
  to authenticated
  using (public.is_responder());

-- A responder can edit their own profile, but cannot escalate their own role.
create policy "profiles: self update (no role change)"
  on public.profiles for update
  to authenticated
  using (id = auth.uid())
  with check (id = auth.uid() and role = public.app_role());

-- Coordinators manage the responder roster (activate, change roles).
create policy "profiles: coordinators manage"
  on public.profiles for update
  to authenticated
  using (public.is_coordinator())
  with check (public.is_coordinator());

-- Auto-provision a profile when a responder signs up. New accounts default to
-- 'volunteer'; a coordinator must promote anyone to 'coordinator'. Runs as
-- definer so it can write through RLS during the auth signup transaction.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    coalesce(nullif(new.raw_user_meta_data ->> 'display_name', ''), 'Voluntario')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
