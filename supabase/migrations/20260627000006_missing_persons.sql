-- Faro — M1: missing_persons. The most sensitive table. A family member may
-- file a report anonymously (no login), but NO public view exists and anon can
-- never read here — only responders. We assume the DB can leak, so we store the
-- minimum needed to reunite people and gate every read behind a responder role.

create table public.missing_persons (
  id uuid primary key default gen_random_uuid(),
  full_name text not null check (char_length(full_name) between 1 and 160),
  age int check (age is null or age between 0 and 130),
  description text check (description is null or char_length(description) <= 2000),

  -- Where last seen (PII). Never exposed publicly in any form.
  last_seen_lat double precision check (last_seen_lat is null or last_seen_lat between -90 and 90),
  last_seen_lng double precision check (last_seen_lng is null or last_seen_lng between -180 and 180),
  last_seen_note text check (last_seen_note is null or char_length(last_seen_note) <= 500),
  last_seen_at timestamptz,

  -- Reporter contact so responders can follow up. Pure PII.
  reporter_name text check (reporter_name is null or char_length(reporter_name) <= 120),
  reporter_phone text check (reporter_phone is null or char_length(reporter_phone) <= 30),

  client_token uuid not null default gen_random_uuid(),

  status public.need_status not null default 'open',  -- resolved == found
  verification public.verification_status not null default 'unverified',
  verified_by uuid references public.profiles (id) on delete set null,
  verified_at timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.missing_persons is
  'Highly sensitive. Anonymously reportable; readable ONLY by responders. No '
  'public view — assume the DB can leak and minimize blast radius.';

create unique index missing_persons_client_token_key on public.missing_persons (client_token);
create index missing_persons_status_idx on public.missing_persons (status);

create trigger missing_persons_set_updated_at
  before update on public.missing_persons
  for each row execute function public.set_updated_at();

alter table public.missing_persons enable row level security;

-- A worried family member can file without an account; safe defaults enforced.
create policy "missing_persons: anyone can report"
  on public.missing_persons for insert
  to anon, authenticated
  with check (
    status = 'open'
    and verification = 'unverified'
    and verified_by is null
    and verified_at is null
  );

-- Reads are responder-only. There is deliberately no anon SELECT and no view.
create policy "missing_persons: responders read"
  on public.missing_persons for select
  to authenticated
  using (public.is_responder());

create policy "missing_persons: responders update"
  on public.missing_persons for update
  to authenticated
  using (public.is_responder())
  with check (public.is_responder());

create or replace function public.guard_missing_verification()
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

create trigger missing_persons_guard_verification
  before update on public.missing_persons
  for each row execute function public.guard_missing_verification();
