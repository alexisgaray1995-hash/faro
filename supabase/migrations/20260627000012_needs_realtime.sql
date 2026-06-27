-- Faro — live dashboards. Responder and coordinator panels subscribe to changes
-- on public.needs so a new or updated request lands on screen without a manual
-- refresh. Supabase Realtime only streams tables added to its publication.
-- RLS still applies to the stream, so subscribers only see rows they're allowed
-- to read.

-- Idempotent: supabase_realtime exists by default, and re-adding a table errors,
-- so add only if it isn't already a member.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'needs'
  ) then
    alter publication supabase_realtime add table public.needs;
  end if;
end $$;
