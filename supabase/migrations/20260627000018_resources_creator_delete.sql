-- Faro — M1: let the responder who created a help point retire it. Coordinators
-- can already delete anything (stale/false points); this adds an ownership path
-- so a volunteer can clean up a point they added. The "only when depleted" rule
-- is a UX guardrail enforced in the editor (the "Eliminar punto" button only
-- shows when every supply reads out — see lib/supply.ts allSuppliesOut); the DB
-- just needs to trust the creator with their own rows.
create policy "resources: creator deletes own"
  on public.resources for delete
  to authenticated
  using (created_by = auth.uid());
