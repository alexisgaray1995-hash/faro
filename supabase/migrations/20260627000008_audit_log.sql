-- Faro — M1: audit_log. Append-only trail of consequential actions
-- (verification, status changes, assignments, missing-person edits). Supports
-- Golden Rule accountability: humans confirm consequential things, and we keep
-- a record of who did what. Readable only by coordinators; writable only by the
-- audit trigger (SECURITY DEFINER), never directly by clients.

create table public.audit_log (
  id bigint generated always as identity primary key,
  actor_id uuid references public.profiles (id) on delete set null,
  actor_role public.user_role,
  action text not null,                 -- e.g. 'update', 'insert', 'delete'
  entity_table text not null,
  entity_id uuid,
  summary text,                         -- short human-readable change note
  created_at timestamptz not null default now()
);

comment on table public.audit_log is
  'Append-only accountability trail. Written by triggers only; read by '
  'coordinators only.';

create index audit_log_entity_idx on public.audit_log (entity_table, entity_id);
create index audit_log_created_at_idx on public.audit_log (created_at desc);

alter table public.audit_log enable row level security;

-- No insert/update/delete policies: clients can never write directly. Only the
-- SECURITY DEFINER trigger below writes, and it bypasses RLS.
create policy "audit_log: coordinators read"
  on public.audit_log for select
  to authenticated
  using (public.is_coordinator());

-- Generic audit trigger. Records the acting profile, the operation, and a terse
-- summary of what changed for the fields we care about.
create or replace function public.write_audit()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_entity_id uuid;
  v_summary text;
begin
  v_entity_id := coalesce((to_jsonb(new) ->> 'id'), (to_jsonb(old) ->> 'id'))::uuid;

  if tg_op = 'UPDATE' then
    -- Only log meaningful transitions to keep the trail signal-rich.
    if to_jsonb(new) ->> 'status' is distinct from to_jsonb(old) ->> 'status' then
      v_summary := format('status %s -> %s',
        to_jsonb(old) ->> 'status', to_jsonb(new) ->> 'status');
    end if;
    if to_jsonb(new) ->> 'verification' is distinct from to_jsonb(old) ->> 'verification' then
      v_summary := concat_ws('; ', v_summary, format('verification %s -> %s',
        to_jsonb(old) ->> 'verification', to_jsonb(new) ->> 'verification'));
    end if;
    if v_summary is null then
      return new;  -- nothing noteworthy changed
    end if;
  elsif tg_op = 'INSERT' then
    v_summary := 'created';
  elsif tg_op = 'DELETE' then
    v_summary := 'deleted';
  end if;

  insert into public.audit_log (actor_id, actor_role, action, entity_table, entity_id, summary)
  values (auth.uid(), public.app_role(), lower(tg_op), tg_table_name, v_entity_id, v_summary);

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

create trigger needs_audit
  after insert or update or delete on public.needs
  for each row execute function public.write_audit();

create trigger resources_audit
  after insert or update or delete on public.resources
  for each row execute function public.write_audit();

create trigger hazards_audit
  after insert or update or delete on public.hazards
  for each row execute function public.write_audit();

create trigger missing_persons_audit
  after insert or update or delete on public.missing_persons
  for each row execute function public.write_audit();

create trigger assignments_audit
  after insert or update or delete on public.assignments
  for each row execute function public.write_audit();
