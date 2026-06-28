-- Faro — security: make is_active a real kill switch.
--
-- Until now is_responder() and is_coordinator() checked only the ROLE, so the
-- is_active column (toggled by the coordinator roster UI, setResponderActive)
-- gated nothing. A deactivated — or compromised, or rogue — responder kept full
-- access to victim PII (names, phones, exact locations) with no way to revoke
-- them short of deleting the auth user. For a system holding vulnerable people's
-- contact data that is a serious gap.
--
-- This rewrites both helpers to require is_active, so deactivation immediately
-- strips access everywhere those helpers gate (every responder RLS policy). A
-- guard trigger stops a responder from flipping their own is_active back on —
-- only a coordinator may, mirroring the verification-guard pattern. app_role()
-- is left as-is (it answers "what role is this row", used by the self-update
-- with-check to pin role; activeness is a separate axis).

create or replace function public.is_coordinator()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select coalesce(
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'coordinator' and is_active
    ),
    false
  );
$$;

create or replace function public.is_responder()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select coalesce(
    exists (
      select 1 from public.profiles
      where id = auth.uid()
        and role in ('volunteer', 'coordinator')
        and is_active
    ),
    false
  );
$$;

-- Only a coordinator may change is_active. A responder editing their own profile
-- (display_name, phone) must not be able to reactivate themselves after a
-- coordinator pulled the switch.
create or replace function public.guard_profiles_active()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if new.is_active is distinct from old.is_active
     and not public.is_coordinator() then
    raise exception 'only coordinators can change is_active';
  end if;
  return new;
end;
$$;

create trigger profiles_guard_active
  before update on public.profiles
  for each row execute function public.guard_profiles_active();
