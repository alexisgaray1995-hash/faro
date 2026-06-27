-- Faro — M1: Data API grants. Under the modern "always-revoked" default, new
-- tables are NOT reachable by the anon/authenticated roles without explicit
-- GRANTs. RLS still gates which ROWS each role sees; these grants gate which
-- TABLE-LEVEL operations are even possible. Both layers must agree.
--
-- Principle of least privilege: anon gets only INSERT on the three anonymously
-- reportable tables (SOS, hazards, missing persons) plus SELECT on the curated
-- public views (granted in the views migration). Everything else is
-- authenticated-only and further narrowed by RLS role checks.

-- Anonymous citizens: submit only. They never read base tables.
grant insert on public.needs to anon;
grant insert on public.hazards to anon;
grant insert on public.missing_persons to anon;

-- Authenticated responders: full operational surface (RLS narrows to role).
grant select, insert, update on public.needs to authenticated;
grant select, insert, update on public.hazards to authenticated;
grant select, insert, update on public.missing_persons to authenticated;
grant select, insert, update, delete on public.resources to authenticated;
grant select, update on public.profiles to authenticated;
grant select, insert, update, delete on public.assignments to authenticated;
grant select on public.audit_log to authenticated;
