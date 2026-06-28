-- Faro — live task tracking. Stream public.assignments so a coordinator sees a
-- responder accept / go en route / complete in real time, and a responder sees
-- a new assignment land, without a manual refresh. RLS still applies to the
-- stream: responders see only their own assignments, coordinators see all.

-- Idempotent: re-adding a table to the publication errors, so add only if absent.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'assignments'
  ) then
    alter publication supabase_realtime add table public.assignments;
  end if;
end $$;
