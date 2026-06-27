-- Faro — M1: assignments. A coordinator matches a responder to a need. This is
-- a consequential action, so it is coordinator-driven; the assigned responder
-- can update their own progress (accepted / en_route / completed).

create table public.assignments (
  id uuid primary key default gen_random_uuid(),
  need_id uuid not null references public.needs (id) on delete cascade,
  responder_id uuid not null references public.profiles (id) on delete cascade,
  assigned_by uuid not null references public.profiles (id) on delete set null,
  status public.assignment_status not null default 'assigned',
  note text check (note is null or char_length(note) <= 1000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- One active assignment per (need, responder); re-assigning updates the row.
  unique (need_id, responder_id)
);

comment on table public.assignments is
  'Coordinator-created matches of a responder to a need. The responder updates '
  'their own progress; coordinators manage all.';

create index assignments_need_idx on public.assignments (need_id);
create index assignments_responder_idx on public.assignments (responder_id);

create trigger assignments_set_updated_at
  before update on public.assignments
  for each row execute function public.set_updated_at();

alter table public.assignments enable row level security;

-- Only coordinators create assignments, and assigned_by must be themselves.
create policy "assignments: coordinators create"
  on public.assignments for insert
  to authenticated
  with check (public.is_coordinator() and assigned_by = auth.uid());

-- A responder sees their own assignments; coordinators see all.
create policy "assignments: read own or coordinator"
  on public.assignments for select
  to authenticated
  using (public.is_coordinator() or responder_id = auth.uid());

-- The assigned responder updates their own progress; coordinators update any.
-- A volunteer cannot reassign to someone else (responder_id stays themselves).
create policy "assignments: responder progresses own"
  on public.assignments for update
  to authenticated
  using (responder_id = auth.uid())
  with check (responder_id = auth.uid());

create policy "assignments: coordinators manage"
  on public.assignments for update
  to authenticated
  using (public.is_coordinator())
  with check (public.is_coordinator());

create policy "assignments: coordinators delete"
  on public.assignments for delete
  to authenticated
  using (public.is_coordinator());
