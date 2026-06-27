-- Faro — RLS / Golden-Rule proof. Run with `supabase test db`.
-- These tests assert the security model in the database itself: anonymous people
-- can ask for help but can never read others' PII, and only coordinators bless
-- trust. If any of these fail, we are violating a Golden Rule — treat as a P0.

begin;
select plan(15);

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

reset role;

select * from finish();
rollback;
