-- =====================================================================
-- Faro — LOCAL DEV SEED ONLY.  DO NOT run against production.
-- This file is applied automatically by `supabase start` / `db reset` on the
-- LOCAL stack. It is never shipped to the hosted project. All people, phones
-- and locations below are fictional and exist purely to exercise the UI/RLS.
-- =====================================================================

-- Two test responders so you can log in and try the coordinator/volunteer flows.
-- Credentials (LOCAL ONLY): coordinador@faro.test / volunteer@faro.test, pwd "faro-dev-123".
insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, created_at, updated_at,
  confirmation_token, recovery_token, email_change_token_new, email_change
)
values
  ('00000000-0000-0000-0000-000000000000',
   '11111111-1111-1111-1111-111111111111', 'authenticated', 'authenticated',
   'coordinador@faro.test', crypt('faro-dev-123', gen_salt('bf')),
   now(), now(), now(), '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000',
   '22222222-2222-2222-2222-222222222222', 'authenticated', 'authenticated',
   'volunteer@faro.test', crypt('faro-dev-123', gen_salt('bf')),
   now(), now(), now(), '', '', '', '')
on conflict (id) do nothing;

-- Email/password identities so GoTrue accepts the logins.
insert into auth.identities (
  provider_id, user_id, identity_data, provider, created_at, updated_at
)
values
  ('11111111-1111-1111-1111-111111111111',
   '11111111-1111-1111-1111-111111111111',
   '{"sub":"11111111-1111-1111-1111-111111111111","email":"coordinador@faro.test"}',
   'email', now(), now()),
  ('22222222-2222-2222-2222-222222222222',
   '22222222-2222-2222-2222-222222222222',
   '{"sub":"22222222-2222-2222-2222-222222222222","email":"volunteer@faro.test"}',
   'email', now(), now())
on conflict (provider_id, provider) do nothing;

-- The handle_new_user trigger created their profiles as volunteers; promote one
-- to coordinator and set friendly names.
update public.profiles
  set role = 'coordinator', display_name = 'Coordinadora de prueba'
  where id = '11111111-1111-1111-1111-111111111111';
update public.profiles
  set display_name = 'Voluntario de prueba'
  where id = '22222222-2222-2222-2222-222222222222';

-- Sample SOS needs (as an anonymous citizen would submit — no contact required).
insert into public.needs (category, urgency, description, people_count, lat, lng, address_note)
values
  ('rescue',  'critical', 'Personas atrapadas bajo escombros de un edificio.', 3, 10.4806, -66.9036, 'Cerca de la plaza'),
  ('water',   'high',     'Sin agua potable desde el sismo.',                  5, 10.5000, -66.9170, null),
  ('medical', 'high',     'Persona herida necesita atención.',                 1, 10.4910, -66.8800, 'Segundo piso');

-- Sample resources (responder-published help points).
insert into public.resources (type, name, description, lat, lng, is_open, capacity_note, created_by)
values
  ('water_point', 'Punto de agua — Parque Central', 'Agua potable disponible.', 10.4900, -66.9000, true, 'Sin límite por ahora', '22222222-2222-2222-2222-222222222222'),
  ('shelter',     'Refugio Escuela Bolívar',        'Refugio temporal con catres.', 10.5050, -66.9100, true, 'Capacidad ~120', '22222222-2222-2222-2222-222222222222'),
  ('clinic',      'Clínica de campaña',             'Atención de primeros auxilios.', 10.4850, -66.8950, true, null, '22222222-2222-2222-2222-222222222222');

-- Sample hazards.
insert into public.hazards (type, severity, description, lat, lng)
values
  ('building_collapse', 'high',   'Estructura inestable, riesgo de derrumbe.', 10.4820, -66.9050),
  ('gas_leak',          'critical','Fuerte olor a gas en la zona.',            10.4990, -66.9150);
