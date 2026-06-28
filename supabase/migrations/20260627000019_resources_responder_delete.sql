-- Faro — M1: let any responder retire any resource point from the public map.
-- The /mapa responder-aware view offers an "Eliminar" action on every resource
-- card; previously only the creator (20260627000018) or a coordinator
-- (20260627000004) could delete, so a volunteer cleaning up a stale point they
-- didn't create hit the RLS wall. In a fast-moving disaster, any verified
-- responder should be trusted to clear a depleted/closed/false point — the
-- audit log keeps a record of who removed what. Coordinators can still delete
-- too (their policy stays); this just widens delete to all responders.
create policy "resources: responders delete"
  on public.resources for delete
  to authenticated
  using (public.is_responder());
