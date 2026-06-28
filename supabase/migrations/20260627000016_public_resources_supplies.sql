-- Faro — subsystem #1: surface the supply picture to citizens in the single
-- fetch they already make (fetchResources → public_resources). The view is the
-- security boundary (definer rights): it aggregates supply lines but exposes NO
-- operator PII. jsonb_agg of zero rows is NULL → "no supply data", not "out".

create or replace view public.public_resources as
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
    updated_at,
    (
      select jsonb_agg(
        jsonb_build_object(
          'category', s.category,
          'status', s.status,
          'quantity', s.quantity,
          'unit', s.unit,
          'label', s.label
        )
        order by s.category
      )
      from public.resource_supplies s
      where s.resource_id = r.id
    ) as supplies
  from public.resources r
  where r.expires_at > now();

comment on view public.public_resources is
  'Anonymous-safe view of resources: precise location, per-category supplies, '
  'no operator PII.';

-- Grants persist across replace, but re-grant to be explicit and idempotent.
grant select on public.public_resources to anon, authenticated;
