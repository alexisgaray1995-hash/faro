-- Faro — M1: claim ownership. "Tomar" must record WHO is working a need so two
-- responders don't show up to the same person. The heavyweight, coordinator-
-- blessed match lives in public.assignments; this is the lightweight self-claim
-- a volunteer makes when they grab a need off the queue.

alter table public.needs
  add column claimed_by uuid references public.profiles (id) on delete set null;

comment on column public.needs.claimed_by is
  'Responder who self-claimed this need from the queue. Null = unclaimed. '
  'Exclusivity is enforced app-side via a claimed_by-is-null conditional update '
  '(atomic in Postgres), not RLS.';

create index needs_claimed_by_idx on public.needs (claimed_by);

-- Claim-stealing is blocked by guard_needs_claim (see the next migration):
-- a responder may only claim for themselves and only change a claim they hold;
-- coordinators may reassign.
