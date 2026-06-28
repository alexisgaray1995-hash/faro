-- Faro — moderation: let coordinators delete abusive/false needs & hazards.
--
-- Until now responders could only 'resolve' a bogus SOS or hazard, leaving the
-- spam row (and any abusive free-text / fake PII) sitting in the table until the
-- purge job ages it out. A coordinator needs a hard-delete to pull obvious
-- abuse immediately. Deleting a victim report is destructive and a trust call,
-- so — like verification (Golden Rule 3) — only a coordinator may, never a
-- self-claimed volunteer. The hard delete is audit-safe (audit_log keeps the
-- metadata trail, no PII payload).

grant delete on public.needs to authenticated;
grant delete on public.hazards to authenticated;

create policy "needs: coordinators delete"
  on public.needs for delete
  to authenticated
  using (public.is_coordinator());

create policy "hazards: coordinators delete"
  on public.hazards for delete
  to authenticated
  using (public.is_coordinator());
