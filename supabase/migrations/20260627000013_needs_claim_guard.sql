-- Faro — claim-steal guard. The "needs: responders update" policy lets any
-- responder write claimed_by, so without this a crafted API call could grab a
-- need another responder is already working (or release theirs). Mirror
-- guard_needs_verification: a responder may only claim for themselves and may
-- only change a claim they already hold; coordinators may override (reassign).

create or replace function public.guard_needs_claim()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if new.claimed_by is distinct from old.claimed_by then
    if old.claimed_by is null then
      -- Claiming an unclaimed need: only for yourself.
      if new.claimed_by is distinct from auth.uid() and not public.is_coordinator() then
        raise exception 'you can only claim a need for yourself';
      end if;
    else
      -- Re-claiming or releasing: only the holder (or a coordinator) may.
      if old.claimed_by is distinct from auth.uid() and not public.is_coordinator() then
        raise exception 'cannot change a claim held by another responder';
      end if;
    end if;
  end if;
  return new;
end;
$$;

create trigger needs_guard_claim
  before update on public.needs
  for each row execute function public.guard_needs_claim();
