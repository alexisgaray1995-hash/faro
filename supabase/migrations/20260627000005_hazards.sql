-- Faro — M1: hazards. Dangers (collapses, gas leaks, blocked roads) reported to
-- keep people away. Citizens may report a hazard anonymously (safety info flows
-- both ways), but cannot self-verify. Public view exposes blurred location so a
-- report near someone's home doesn't pinpoint them, while still warning the area.

create table public.hazards (
  id uuid primary key default gen_random_uuid(),
  type public.hazard_type not null,
  description text check (description is null or char_length(description) <= 2000),
  severity public.urgency not null default 'medium',
  status public.need_status not null default 'open',

  lat double precision not null check (lat between -90 and 90),
  lng double precision not null check (lng between -180 and 180),

  client_token uuid not null default gen_random_uuid(),

  verification public.verification_status not null default 'unverified',
  verified_by uuid references public.profiles (id) on delete set null,
  verified_at timestamptz,
  expires_at timestamptz not null default (now() + interval '48 hours'),

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.hazards is
  'Danger reports. Anonymously reportable; public sees blurred location. Only '
  'coordinators verify.';

create unique index hazards_client_token_key on public.hazards (client_token);
create index hazards_type_idx on public.hazards (type);
create index hazards_status_idx on public.hazards (status);

create trigger hazards_set_updated_at
  before update on public.hazards
  for each row execute function public.set_updated_at();

alter table public.hazards enable row level security;

-- Anyone can warn about a danger; constrained to safe defaults.
create policy "hazards: anyone can report"
  on public.hazards for insert
  to anon, authenticated
  with check (
    status = 'open'
    and verification = 'unverified'
    and verified_by is null
    and verified_at is null
  );

create policy "hazards: responders read all"
  on public.hazards for select
  to authenticated
  using (public.is_responder());

create policy "hazards: responders update"
  on public.hazards for update
  to authenticated
  using (public.is_responder())
  with check (public.is_responder());

create or replace function public.guard_hazards_verification()
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

create trigger hazards_guard_verification
  before update on public.hazards
  for each row execute function public.guard_hazards_verification();
