-- Faro — RLS / Golden-Rule proof. Run with `supabase test db`.
-- These tests assert the security model in the database itself: anonymous people
-- can ask for help but can never read others' PII, and only coordinators bless
-- trust. If any of these fail, we are violating a Golden Rule — treat as a P0.

begin;
select plan(36);

-- ---------------------------------------------------------------------------
-- Golden Rule 2: "I need help" is never behind a login.
-- ---------------------------------------------------------------------------
set local role anon;

select lives_ok(
  $$insert into public.needs (category, urgency, lat, lng, description)
    values ('rescue', 'critical', 10.4806, -66.9036, 'prueba anónima')$$,
  'anon can submit an SOS need without logging in'
);

select lives_ok(
  $$insert into public.hazards (type, severity, lat, lng, description)
    values ('gas_leak', 'high', 10.5, -66.9, 'prueba peligro')$$,
  'anon can report a hazard without logging in'
);

select lives_ok(
  $$insert into public.missing_persons (full_name, description)
    values ('Persona Prueba', 'reporte anónimo')$$,
  'anon can file a missing-person report without logging in'
);

-- Golden Rule 5: anon cannot forge trust — inserting as 'verified' is blocked.
select throws_ok(
  $$insert into public.needs (category, urgency, lat, lng, verification)
    values ('water', 'high', 10.5, -66.9, 'verified')$$,
  '42501',
  null,
  'anon cannot self-verify a need (RLS with_check blocks it)'
);

-- ---------------------------------------------------------------------------
-- Golden Rule 4: protect vulnerable people — anon never reads base PII tables.
-- ---------------------------------------------------------------------------
select throws_ok(
  $$select * from public.needs$$,
  '42501',
  null,
  'anon cannot read the needs base table (PII protected)'
);

select throws_ok(
  $$select * from public.missing_persons$$,
  '42501',
  null,
  'anon cannot read missing_persons at all (no public view exists)'
);

select throws_ok(
  $$select * from public.profiles$$,
  '42501',
  null,
  'anon cannot read responder profiles'
);

-- Anon CAN read the curated public views.
select lives_ok(
  $$select * from public.public_needs$$,
  'anon can read the de-identified public_needs view'
);

-- And those views blur coordinates to 3 decimals (~111m).
select is(
  (select max(scale(lat::numeric)) from public.public_needs),
  3,
  'public_needs coordinates are blurred to at most 3 decimals'
);

-- Citizens consume resources but never publish them.
select throws_ok(
  $$insert into public.resources (type, name, lat, lng)
    values ('water_point', 'falso', 10.5, -66.9)$$,
  '42501',
  null,
  'anon cannot publish resources (responders only)'
);

-- Responder registry: anon cannot forge a responder profile. Self-registration
-- goes through Supabase auth + the handle_new_user trigger (definer), never a
-- direct insert — there is no anon insert policy on profiles.
select throws_ok(
  $$insert into public.profiles (id, role, display_name)
    values ('33333333-3333-3333-3333-333333333333', 'coordinator', 'falso')$$,
  '42501',
  null,
  'anon cannot insert a profile (no self-registered coordinators)'
);

reset role;

-- ---------------------------------------------------------------------------
-- Volunteer (authenticated, role=volunteer). Seeded user 2222.
-- ---------------------------------------------------------------------------
set local role authenticated;
set local request.jwt.claims to '{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated"}';

select lives_ok(
  $$select * from public.needs$$,
  'a volunteer can read full needs (incl. contact) to act on them'
);

select lives_ok(
  $$select * from public.missing_persons$$,
  'a volunteer can read missing_persons to help reunite people'
);

-- Responder registry: a volunteer sees the roster (to coordinate) ...
select ok(
  (select count(*) from public.profiles) >= 2,
  'a volunteer can read the responder roster'
);

-- ... can edit their own profile ...
select lives_ok(
  $$update public.profiles set display_name = 'Voluntario Renombrado'
      where id = '22222222-2222-2222-2222-222222222222'$$,
  'a volunteer can update their own profile'
);

-- ... but cannot promote themselves to coordinator (Golden Rule 4: roles are
-- coordinator-granted, never self-claimed; with_check pins role = app_role()).
select throws_ok(
  $$update public.profiles set role = 'coordinator'
      where id = '22222222-2222-2222-2222-222222222222'$$,
  '42501',
  null,
  'a volunteer cannot escalate their own role'
);

-- Golden Rule 3: only a human coordinator blesses trust. A volunteer cannot.
select throws_ok(
  $$update public.needs
      set verification = 'verified'
      where description = 'prueba anónima'$$,
  'only coordinators can change verification',
  'a volunteer cannot verify a need'
);

-- A volunteer has the audit grant but RLS hides the trail from non-coordinators.
select is(
  (select count(*)::int from public.audit_log),
  0,
  'a volunteer cannot read the audit log'
);

-- Guard: a volunteer cannot claim a need on someone else's behalf (only for
-- themselves) — blocks one form of claim-stealing at the trigger.
select throws_ok(
  $$update public.needs
      set claimed_by = '11111111-1111-1111-1111-111111111111'
      where description = 'prueba anónima' and claimed_by is null$$,
  'you can only claim a need for yourself',
  'a volunteer cannot claim a need for another responder'
);

-- Claim ownership: a volunteer grabs an unclaimed need off the queue.
select lives_ok(
  $$update public.needs set status = 'in_progress',
      claimed_by = '22222222-2222-2222-2222-222222222222'
      where description = 'prueba anónima' and claimed_by is null$$,
  'a volunteer can self-claim an unclaimed need'
);

-- Atomicity: a second claim with the claimed_by-is-null guard touches nothing,
-- so two responders can't grab the same person.
update public.needs set claimed_by = '11111111-1111-1111-1111-111111111111'
  where description = 'prueba anónima' and claimed_by is null;
select is(
  (select claimed_by from public.needs where description = 'prueba anónima'),
  '22222222-2222-2222-2222-222222222222'::uuid,
  'a claimed need cannot be stolen by a racing responder (atomic claim)'
);

-- Moderation: a volunteer cannot hard-delete a report. The delete policy is
-- coordinator-only, so RLS filters the delete to zero rows (no exception) — the
-- row survives.
delete from public.needs where description = 'prueba anónima';
select is(
  (select count(*)::int from public.needs where description = 'prueba anónima'),
  1,
  'a volunteer cannot delete a need (coordinator-only delete policy)'
);

reset role;

-- ---------------------------------------------------------------------------
-- Coordinator (authenticated, role=coordinator). Seeded user 1111.
-- ---------------------------------------------------------------------------
set local role authenticated;
set local request.jwt.claims to '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}';

select lives_ok(
  $$update public.needs
      set verification = 'verified'
      where description = 'prueba anónima'$$,
  'a coordinator can verify a need'
);

-- Responder registry: a coordinator manages the roster — promoting a volunteer
-- is the intended, audited path to coordinator (never self-service).
select lives_ok(
  $$update public.profiles set role = 'coordinator'
      where id = '22222222-2222-2222-2222-222222222222'$$,
  'a coordinator can promote a volunteer'
);

-- ... and may reassign a claim held by someone else (the guard's override path).
select lives_ok(
  $$update public.needs
      set claimed_by = '11111111-1111-1111-1111-111111111111'
      where description = 'prueba anónima'$$,
  'a coordinator can reassign a claim held by another responder'
);

-- Moderation: a coordinator can hard-delete an abusive/false report outright.
select lives_ok(
  $$delete from public.needs where description = 'prueba anónima'$$,
  'a coordinator can delete an abusive/false need'
);

reset role;

-- ---------------------------------------------------------------------------
-- Supplies (subsystem #1): responder authoring + anon-safe exposure.
-- ---------------------------------------------------------------------------
set local role authenticated;
set local request.jwt.claims to '{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated"}';

select lives_ok(
  $$insert into public.resources (id, type, name, lat, lng, created_by)
    values ('44444444-4444-4444-4444-444444444444', 'water_point', 'Oasis Centro',
            10.5, -66.9, '22222222-2222-2222-2222-222222222222')$$,
  'a responder can publish a resource to attach supplies to'
);

select lives_ok(
  $$insert into public.resource_supplies (resource_id, category, status, updated_by)
    values ('44444444-4444-4444-4444-444444444444', 'water', 'ok',
            '22222222-2222-2222-2222-222222222222')$$,
  'a responder can add a supply line'
);

select throws_ok(
  $$insert into public.resource_supplies (resource_id, category, status, updated_by)
    values ('44444444-4444-4444-4444-444444444444', 'water', 'low',
            '22222222-2222-2222-2222-222222222222')$$,
  '23505',
  null,
  'one supply line per category (unique resource_id, category)'
);

select lives_ok(
  $$update public.resource_supplies set status = 'low'
      where resource_id = '44444444-4444-4444-4444-444444444444'
        and category = 'water'$$,
  'a responder can update a supply line'
);

reset role;
set local role anon;

select throws_ok(
  $$select * from public.resource_supplies$$,
  '42501',
  null,
  'anon cannot read the resource_supplies base table (PII boundary)'
);

select ok(
  (select supplies is not null
     from public.public_resources
     where id = '44444444-4444-4444-4444-444444444444'),
  'public_resources exposes a supplies aggregate for a stocked point'
);

select throws_ok(
  $$select contact_phone from public.public_resources$$,
  '42703',
  null,
  'public_resources still hides operator contact (no contact column)'
);

reset role;

-- ---------------------------------------------------------------------------
-- Security: is_active is a real kill switch (migration 20). A coordinator
-- deactivates a responder; that responder must immediately lose all PII access
-- and must not be able to reactivate themselves. RLS filters rather than
-- throwing (the table grant/policy exist), so we assert the OUTCOME, not an
-- exception.
-- ---------------------------------------------------------------------------
set local role authenticated;
set local request.jwt.claims to '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}';

select lives_ok(
  $$update public.profiles set is_active = false
      where id = '22222222-2222-2222-2222-222222222222'$$,
  'a coordinator can deactivate a responder'
);

reset role;
set local role authenticated;
set local request.jwt.claims to '{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated"}';

-- Access revoked: a deactivated responder reads zero needs (PII gone).
select is(
  (select count(*)::int from public.needs),
  0,
  'a deactivated responder reads zero needs (is_active revokes PII access)'
);

-- Self-reactivation is a no-op: an inactive responder cannot even see their own
-- profile row (read policy requires is_responder), so the update touches nothing
-- — and the guard trigger would block it anyway.
update public.profiles set is_active = true
  where id = '22222222-2222-2222-2222-222222222222';

reset role;
set local role authenticated;
set local request.jwt.claims to '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}';

select is(
  (select is_active from public.profiles
     where id = '22222222-2222-2222-2222-222222222222'),
  false,
  'a deactivated responder could not reactivate themselves'
);

reset role;

select * from finish();
rollback;
