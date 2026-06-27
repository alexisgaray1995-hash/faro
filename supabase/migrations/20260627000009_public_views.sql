-- Faro — M1: public read surface. Anonymous citizens never read base tables
-- (RLS denies them — no anon SELECT policy exists). Instead they read these
-- curated views, which are the security boundary: they project ONLY safe
-- columns, blur sensitive coordinates, and hide cancelled/expired rows.
--
-- These views run with the definer's rights (the default), so they bypass the
-- base-table RLS deliberately. That is safe precisely because the view itself
-- selects no PII. There is intentionally NO public view for missing_persons.

-- Needs: blurred location, NO contact name/phone, NO exact coords/address.
create view public.public_needs as
  select
    id,
    category,
    urgency,
    status,
    description,
    people_count,
    public.blur_coord(lat) as lat,
    public.blur_coord(lng) as lng,
    verification,
    verified_at,
    expires_at,
    created_at,
    updated_at
  from public.needs
  where status in ('open', 'in_progress')
    and expires_at > now();

comment on view public.public_needs is
  'Anonymous-safe view of needs: blurred location, no contact PII, active only.';

-- Resources: precise location (a water point must be findable), NO operator
-- contact PII.
create view public.public_resources as
  select
    id,
    type,
    name,
    description,
    lat,
    lng,
    address_note,
    is_open,
    capacity_note,
    verification,
    verified_at,
    expires_at,
    created_at,
    updated_at
  from public.resources
  where expires_at > now();

comment on view public.public_resources is
  'Anonymous-safe view of resources: precise location, no operator PII.';

-- Hazards: blurred location so a report near a home does not pinpoint it.
create view public.public_hazards as
  select
    id,
    type,
    severity,
    status,
    description,
    public.blur_coord(lat) as lat,
    public.blur_coord(lng) as lng,
    verification,
    verified_at,
    expires_at,
    created_at,
    updated_at
  from public.hazards
  where status in ('open', 'in_progress')
    and expires_at > now();

comment on view public.public_hazards is
  'Anonymous-safe view of hazards: blurred location, active only.';

-- Expose the curated views to everyone; base tables stay RLS-gated.
grant select on public.public_needs to anon, authenticated;
grant select on public.public_resources to anon, authenticated;
grant select on public.public_hazards to anon, authenticated;
