-- Faro — M1: resources. Help-points (water, food, shelter, clinics) that
-- responders publish for citizens to find. These are meant to be public, so the
-- public view exposes them with full precision (a water point should be easy to
-- reach). PII (operator contact) stays responder-only.

create table public.resources (
  id uuid primary key default gen_random_uuid(),
  type public.resource_type not null,
  name text not null check (char_length(name) between 1 and 160),
  description text check (description is null or char_length(description) <= 2000),

  lat double precision not null check (lat between -90 and 90),
  lng double precision not null check (lng between -180 and 180),
  address_note text check (address_note is null or char_length(address_note) <= 500),

  -- Operational status citizens care about.
  is_open boolean not null default true,
  capacity_note text check (capacity_note is null or char_length(capacity_note) <= 200),

  -- Operator contact — responder-only PII.
  contact_name text check (contact_name is null or char_length(contact_name) <= 120),
  contact_phone text check (contact_phone is null or char_length(contact_phone) <= 30),

  -- Trust + freshness.
  verification public.verification_status not null default 'unverified',
  verified_by uuid references public.profiles (id) on delete set null,
  verified_at timestamptz,
  expires_at timestamptz not null default (now() + interval '7 days'),

  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.resources is
  'Responder-published help points. Publicly visible (precise location is the '
  'point) but operator contact is responder-only.';

create index resources_type_idx on public.resources (type);
create index resources_is_open_idx on public.resources (is_open);

create trigger resources_set_updated_at
  before update on public.resources
  for each row execute function public.set_updated_at();

alter table public.resources enable row level security;

-- Only responders write resources (citizens consume them via the public view).
create policy "resources: responders insert"
  on public.resources for insert
  to authenticated
  with check (public.is_responder() and created_by = auth.uid());

create policy "resources: responders read all"
  on public.resources for select
  to authenticated
  using (public.is_responder());

create policy "resources: responders update"
  on public.resources for update
  to authenticated
  using (public.is_responder())
  with check (public.is_responder());

-- Coordinators can retire a stale/false resource entirely.
create policy "resources: coordinators delete"
  on public.resources for delete
  to authenticated
  using (public.is_coordinator());

-- Same verification guard as needs: only coordinators bless trust.
create or replace function public.guard_resources_verification()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if new.verification is distinct from old.verification then
    if not public.is_coordinator() then
      raise exception 'only coordinators can change verification';
    end if;
    if new.verification = 'verified' then
      new.verified_by := auth.uid();
      new.verified_at := now();
    else
      new.verified_by := null;
      new.verified_at := null;
    end if;
  end if;
  return new;
end;
$$;

create trigger resources_guard_verification
  before update on public.resources
  for each row execute function public.guard_resources_verification();
