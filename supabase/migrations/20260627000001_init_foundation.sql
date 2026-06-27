-- Faro — Milestone 1: foundation (extensions, enums, shared functions).
-- Golden Rules honored here: PII minimization (blur_coord), data-freshness
-- triggers (set_updated_at), and SECURITY DEFINER role helpers used by RLS so
-- citizens stay anonymous while responders get gated access.

-- pgcrypto gives us gen_random_uuid() for surrogate keys.
create extension if not exists pgcrypto with schema extensions;

-- ---------------------------------------------------------------------------
-- Enumerations. Kept small and stable; new values are added via migrations.
-- ---------------------------------------------------------------------------

-- Who a profile is. Citizens never need a profile (they stay anonymous); this
-- enum gates volunteers and coordinators.
create type public.user_role as enum ('volunteer', 'coordinator');

-- What a person needs after the quake.
create type public.need_category as enum (
  'rescue',   -- trapped / collapse extraction
  'medical',  -- injury, medicine, clinic
  'water',
  'food',
  'shelter',
  'evacuation',
  'other'
);

-- How time-critical a need is.
create type public.urgency as enum ('critical', 'high', 'medium', 'low');

-- Lifecycle shared by needs and assignments.
create type public.need_status as enum (
  'open',
  'in_progress',
  'resolved',
  'cancelled',
  'expired'
);

-- Kinds of help-points responders publish on the map.
create type public.resource_type as enum (
  'water_point',
  'food_distribution',
  'shelter',
  'clinic',
  'charging_station',
  'distribution_center',
  'other'
);

-- Kinds of danger to warn people away from.
create type public.hazard_type as enum (
  'building_collapse',
  'fire',
  'flood',
  'gas_leak',
  'road_blocked',
  'power_line',
  'aftershock',
  'other'
);

-- Trust state for any human-verifiable record (Golden Rule: do no harm with
-- stale/false data — freshness and verification are always visible).
create type public.verification_status as enum (
  'unverified',
  'verified',
  'disputed'
);

-- Status of a responder being matched to a need.
create type public.assignment_status as enum (
  'assigned',
  'accepted',
  'en_route',
  'completed',
  'cancelled'
);

-- ---------------------------------------------------------------------------
-- Shared functions.
-- ---------------------------------------------------------------------------

-- Keep updated_at honest on every row mutation.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- Blur a coordinate to ~111m (3 decimal places) for public exposure so exact
-- locations of vulnerable people are never broadcast.
create or replace function public.blur_coord(value double precision)
returns double precision
language sql
immutable
parallel safe
as $$
  select round(value::numeric, 3)::double precision;
$$;

-- Role helpers. SECURITY DEFINER so they can read profiles from inside RLS
-- policies without the caller needing select rights on profiles (and without
-- recursive policy evaluation). search_path is pinned to defeat hijacking.
-- plpgsql (not sql) so the reference to public.profiles is resolved at runtime,
-- not at creation time — profiles is created in a later migration.
create or replace function public.app_role()
returns public.user_role
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
begin
  return (select role from public.profiles where id = auth.uid());
end;
$$;

create or replace function public.is_coordinator()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select coalesce(public.app_role() = 'coordinator', false);
$$;

create or replace function public.is_responder()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select coalesce(public.app_role() in ('volunteer', 'coordinator'), false);
$$;
