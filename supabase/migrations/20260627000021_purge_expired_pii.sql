-- Faro — privacy: hard-delete stale victim PII so the data actually expires.
--
-- The privacy policy promises reports don't live forever, but nothing enforced
-- it: an anonymous SOS, hazard, or missing-person report (names, phones, exact
-- locations) lingered in the table indefinitely. This closes the gap between
-- what we tell people and what the database does.
--
-- HARD delete is safe because the audit_log stores only metadata (actor,
-- action, table, id, terse summary) — never PII payloads — so the trail keeps a
-- "row deleted" record without re-leaking what we just purged.
--
-- Do-no-harm retention rules (a live rescue must never be purged out from under
-- a responder):
--   * in_progress rows are NEVER touched — someone is acting on them.
--   * needs / hazards: drop 'open' rows past their own expires_at (the column
--     already encodes each report's freshness horizon), and 'resolved' rows
--     after a short grace so the closing responder can still review them.
--   * missing_persons has no expires_at (most sensitive, kept longest): drop
--     'resolved' after the same grace, and 'open' only after a long backstop so
--     a months-long search isn't erased, but an abandoned report still ages out.

create or replace function public.purge_expired()
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  -- ponytail: retention knobs. Tune these (or wire to a settings table) if legal
  -- guidance lands on firmer numbers; defaults are deliberately conservative.
  resolved_grace constant interval := interval '7 days';
  missing_open_horizon constant interval := interval '30 days';
begin
  delete from public.needs
    where (status = 'open' and expires_at < now())
       or (status = 'resolved' and updated_at < now() - resolved_grace);

  delete from public.hazards
    where (status = 'open' and expires_at < now())
       or (status = 'resolved' and updated_at < now() - resolved_grace);

  delete from public.missing_persons
    where (status = 'resolved' and updated_at < now() - resolved_grace)
       or (status = 'open' and created_at < now() - missing_open_horizon);
end;
$$;

comment on function public.purge_expired() is
  'Hard-deletes stale victim PII (needs/hazards/missing_persons) per the privacy '
  'policy. Never touches in_progress rows. Safe to call from any scheduler.';

-- Schedule daily if pg_cron is available; otherwise the function still exists
-- for an external scheduler (or `select purge_expired()`) to drive. Guarded so
-- the migration succeeds on a stack without pg_cron.
do $$
begin
  if exists (select 1 from pg_available_extensions where name = 'pg_cron') then
    create extension if not exists pg_cron;
    perform cron.schedule(
      'faro-purge-expired-pii',
      '17 4 * * *',  -- 04:17 daily, off-peak
      'select public.purge_expired()'
    );
  end if;
end;
$$;
