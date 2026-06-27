-- Faro — M1: needs (SOS). The single most important table: an anonymous
-- citizen on a cheap phone with bad signal must be able to insert here with no
-- login. Exact location + contact are PII and are NEVER exposed to the public;
-- citizens see a blurred, de-identified view (see public views migration).

create table public.needs (
  id uuid primary key default gen_random_uuid(),
  category public.need_category not null,
  urgency public.urgency not null default 'high',
  status public.need_status not null default 'open',
  -- Free-text description (Spanish-first). Bounded to keep payloads tiny for
  -- low-bandwidth submits.
  description text check (description is null or char_length(description) <= 2000),
  people_count int not null default 1 check (people_count between 1 and 10000),

  -- Exact location (PII-adjacent). Public reads only ever see blur_coord() of
  -- these via the public view.
  lat double precision not null check (lat between -90 and 90),
  lng double precision not null check (lng between -180 and 180),
  address_note text check (address_note is null or char_length(address_note) <= 500),

  -- Optional contact so a responder can reach the person. Pure PII — gated to
  -- responders only.
  contact_name text check (contact_name is null or char_length(contact_name) <= 120),
  contact_phone text check (contact_phone is null or char_length(contact_phone) <= 30),

  -- Idempotency key from the offline outbox so retried submits don't duplicate.
  client_token uuid not null default gen_random_uuid(),

  -- Trust + freshness (Golden Rule: do no harm with stale data).
  verification public.verification_status not null default 'unverified',
  verified_by uuid references public.profiles (id) on delete set null,
  verified_at timestamptz,
  -- Auto-stale horizon; the UI warns past this and a job can expire it.
  expires_at timestamptz not null default (now() + interval '24 hours'),

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.needs is
  'Anonymous SOS/help requests. Insertable with no auth. Exact location and '
  'contact are PII, exposed only to responders; public sees a blurred view.';

create unique index needs_client_token_key on public.needs (client_token);
create index needs_status_idx on public.needs (status);
create index needs_urgency_idx on public.needs (urgency);
create index needs_created_at_idx on public.needs (created_at desc);

create trigger needs_set_updated_at
  before update on public.needs
  for each row execute function public.set_updated_at();

alter table public.needs enable row level security;

-- THE core Golden Rule: "I need help" is never behind a login. Anyone, including
-- the anon role, may insert a need. We constrain them to safe defaults so an
-- anonymous writer can't forge verification/status.
create policy "needs: anyone can submit SOS"
  on public.needs for insert
  to anon, authenticated
  with check (
    status = 'open'
    and verification = 'unverified'
    and verified_by is null
    and verified_at is null
  );

-- Responders (volunteers + coordinators) read full needs incl. PII to act.
create policy "needs: responders read all"
  on public.needs for select
  to authenticated
  using (public.is_responder());

-- Responders update operational state (status, urgency). Verification fields
-- are additionally guarded by a trigger so only coordinators can verify.
create policy "needs: responders update"
  on public.needs for update
  to authenticated
  using (public.is_responder())
  with check (public.is_responder());

-- Guard: only coordinators may change verification, and verified_by must be
-- themselves. Volunteers can move status but not bless trust.
create or replace function public.guard_needs_verification()
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

create trigger needs_guard_verification
  before update on public.needs
  for each row execute function public.guard_needs_verification();
