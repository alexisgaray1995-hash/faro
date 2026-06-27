-- Faro — RLS / Golden-Rule proof. Run with `supabase test db`.
-- These tests assert the security model in the database itself: anonymous people
-- can ask for help but can never read others' PII, and only coordinators bless
-- trust. If any of these fail, we are violating a Golden Rule — treat as a P0.

begin;
select plan(20);

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

reset role;

select * from finish();
rollback;
