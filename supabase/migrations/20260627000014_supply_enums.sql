-- Faro — subsystem #1: supply vocabulary. Two small, stable enums describing a
-- help point's stock picture. New values are added via later migrations.

-- What a help point can hold. 'water'/'food'/'medical' are the life-critical
-- three that can turn a pin red when 'out'.
create type public.supply_category as enum (
  'water',
  'food',
  'medical',
  'shelter_beds',
  'hygiene',
  'power',
  'infant',
  'other'
);

-- Stock state for one category. 'ok' stocked, 'low' running out, 'out' empty.
create type public.supply_status as enum ('ok', 'low', 'out');
