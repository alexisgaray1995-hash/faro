-- Faro — subsystem #1: structured supply lines. One row per (resource, category)
-- so a pin's worst-status is unambiguous and upsert is natural. Mirrors the
-- resources RLS already proven by the pgTAP suite: responders write, citizens
-- read only through the PII-free public_resources view (never this base table).

create table public.resource_supplies (
  id uuid primary key default gen_random_uuid(),
  resource_id uuid not null references public.resources (id) on delete cascade,
  category public.supply_category not null,
  status public.supply_status not null default 'ok',
  quantity numeric check (quantity is null or quantity >= 0),
  unit text check (unit is null or char_length(unit) <= 20),
  label text check (label is null or char_length(label) <= 80),
  updated_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- One clean line per category. ponytail: this also caps 'other' to a single
  -- free-form slot; drop the constraint on 'other' later if responders need more.
  unique (resource_id, category)
);

comment on table public.resource_supplies is
  'Per-category supply picture for a help point. Responder-written; exposed to '
  'citizens only via the aggregated, PII-free public_resources.supplies column.';

create index resource_supplies_resource_idx
  on public.resource_supplies (resource_id);

create trigger resource_supplies_set_updated_at
  before update on public.resource_supplies
  for each row execute function public.set_updated_at();

alter table public.resource_supplies enable row level security;

-- Responders author supply lines; updated_by is pinned to the author on insert.
create policy "resource_supplies: responders insert"
  on public.resource_supplies for insert
  to authenticated
  with check (public.is_responder() and updated_by = auth.uid());

create policy "resource_supplies: responders read all"
  on public.resource_supplies for select
  to authenticated
  using (public.is_responder());

create policy "resource_supplies: responders update"
  on public.resource_supplies for update
  to authenticated
  using (public.is_responder())
  with check (public.is_responder());

-- A responder may remove a line they added — lower-stakes than retiring a whole
-- point, which stays coordinator-only via resources.
create policy "resource_supplies: responders delete"
  on public.resource_supplies for delete
  to authenticated
  using (public.is_responder());

-- Table-level grants (always-revoked default). RLS narrows rows; this allows the
-- operations at all. No anon grant — citizens read supplies only via the view.
grant select, insert, update, delete on public.resource_supplies to authenticated;
