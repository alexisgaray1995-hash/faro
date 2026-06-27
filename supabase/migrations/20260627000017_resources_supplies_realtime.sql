-- Faro — subsystem #1: stream resource + supply changes to subscribed responders
-- (the /recursos editor). Same idempotent guard as needs_realtime: re-adding a
-- table to a publication errors, so add each only if not already a member. RLS
-- still applies to the stream, so anon never receives these rows.

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'resources'
  ) then
    alter publication supabase_realtime add table public.resources;
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'resource_supplies'
  ) then
    alter publication supabase_realtime add table public.resource_supplies;
  end if;
end $$;
