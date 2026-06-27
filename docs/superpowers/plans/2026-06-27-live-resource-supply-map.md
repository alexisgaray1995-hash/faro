# Live Resource & Supply Map Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let responders publish and maintain help points with a structured per-category supply picture, surfaced on a map that colors pins by stock and works offline for create.

**Architecture:** Reuse the proven RLS + public-view + realtime + outbox patterns already in Faro. A new `resource_supplies` child table (one line per category, `unique(resource_id, category)`) holds the supply picture; the existing `public_resources` view gains a PII-free `supplies` aggregate so citizens get points + supplies in their single existing fetch. Responders author from a new `/recursos` route: adding a point goes through the offline outbox (client-generated UUID, parent-before-children), editing an existing point's supplies is online-only via the RLS-gated browser client. Pin color is a pure helper (`pinStatus`) so it is unit-tested in isolation.

**Tech Stack:** Next.js 16 (App Router), React 19, TypeScript strict, Supabase (Postgres, RLS, Realtime), Leaflet + OSM raster tiles, Dexie/IndexedDB outbox, pgTAP, Vitest.

**Spec:** `docs/superpowers/specs/2026-06-27-live-resource-supply-map-design.md`

---

## File Structure

**Migrations (new):**

- `supabase/migrations/20260627000014_supply_enums.sql` — `supply_category`, `supply_status` enums
- `supabase/migrations/20260627000015_resource_supplies.sql` — table, index, `set_updated_at` trigger, RLS
- `supabase/migrations/20260627000016_public_resources_supplies.sql` — recreate `public_resources` with `supplies` aggregate + re-grant
- `supabase/migrations/20260627000017_resources_supplies_realtime.sql` — idempotent publication add for `resources` + `resource_supplies`

**Tests:**

- `supabase/tests/rls_test.sql` — extend with supply RLS / exposure / unique tests
- `src/lib/supply.test.ts` — pure helper tests (TDD)
- `src/lib/sync/outbox.test.ts` — new-table enqueue/flush + parent-before-child ordering

**Types:**

- `src/types/database.ts` — regenerated

**Domain / data:**

- `src/lib/supply.ts` — supply enums, labels, `pinStatus`, `PIN_COLOR`, `supplyLineText`, `draftsToRows`
- `src/lib/data/publicData.ts` — add `supplies` to `PublicResource`
- `src/lib/db/db.ts` — extend `OutboxTable` union

**Components / routes:**

- `src/components/find/SupplyChips.tsx` — shared read-only supply display
- `src/components/find/MapView.tsx` — pin color by supply status + popup breakdown
- `src/components/find/FindHelp.tsx` — resource cards show `SupplyChips`
- `src/components/recursos/SupplyEditor.tsx` — controlled per-category supply rows
- `src/components/recursos/RecursosEditor.tsx` — authoring map + add-a-point flow (offline outbox)
- `src/components/recursos/ResourcePoints.tsx` — existing points list + online supply edit
- `src/components/recursos/LiveResources.tsx` — realtime refresh (mirrors `LiveNeeds`)
- `src/app/recursos/page.tsx` — responder-gated server component
- `src/proxy.ts` — add `/recursos/:path*` to the auth matcher
- `src/app/panel/page.tsx`, `src/app/coordinador/page.tsx` — nav link to `/recursos`

**Skipped (Ponytail):** `mapInit` shared helper — single consumer (`RecursosEditor`); MapView's working map stays untouched. Extract only if MapView is later refactored to share setup. Server actions `createResource`/`updateResource` — the offline outbox already inserts; supply edits go straight through the RLS-gated browser client like `SosForm`. Add server actions only if a non-client caller appears.

---

## Phase A — Database & Security

### Task 1: Supply enums migration

**Files:**

- Create: `supabase/migrations/20260627000014_supply_enums.sql`

- [ ] **Step 1: Write the migration**

```sql
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
```

- [ ] **Step 2: Apply and verify**

Run: `supabase db reset`
Expected: all migrations 1–14 apply with no error; final line reports seeding finished.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20260627000014_supply_enums.sql
git commit -m "feat(db): supply_category and supply_status enums"
```

### Task 2: resource_supplies table, RLS, trigger

**Files:**

- Create: `supabase/migrations/20260627000015_resource_supplies.sql`

- [ ] **Step 1: Write the migration**

```sql
-- Faro — subsystem #1: structured supply lines. One row per (resource, category)
-- so a pin's worst-status is unambiguous and upsert is natural. Mirrors the
-- resources RLS already proven by the pgTAP suite: responders write, citizens
-- read only through the PII-free public_resources view (never this base table).

create table public.resource_supplies (
  id uuid primary key default gen_random_uuid(),
  resource_id uuid not null references public.resources (id) on delete cascade,
  category public.supply_category not null,
  status public.supply_status not null default 'ok',
  quantity numeric check (quantity is null or quantity >= 0),
  unit text check (unit is null or char_length(unit) <= 20),
  label text check (label is null or char_length(label) <= 80),
  updated_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- One clean line per category. ponytail: this also caps 'other' to a single
  -- free-form slot; drop the constraint on 'other' later if responders need more.
  unique (resource_id, category)
);

comment on table public.resource_supplies is
  'Per-category supply picture for a help point. Responder-written; exposed to '
  'citizens only via the aggregated, PII-free public_resources.supplies column.';

create index resource_supplies_resource_idx
  on public.resource_supplies (resource_id);

create trigger resource_supplies_set_updated_at
  before update on public.resource_supplies
  for each row execute function public.set_updated_at();

alter table public.resource_supplies enable row level security;

-- Responders author supply lines; updated_by is pinned to the author on insert.
create policy "resource_supplies: responders insert"
  on public.resource_supplies for insert
  to authenticated
  with check (public.is_responder() and updated_by = auth.uid());

create policy "resource_supplies: responders read all"
  on public.resource_supplies for select
  to authenticated
  using (public.is_responder());

create policy "resource_supplies: responders update"
  on public.resource_supplies for update
  to authenticated
  using (public.is_responder())
  with check (public.is_responder());

-- A responder may remove a line they added — lower-stakes than retiring a whole
-- point, which stays coordinator-only via resources.
create policy "resource_supplies: responders delete"
  on public.resource_supplies for delete
  to authenticated
  using (public.is_responder());

-- Table-level grants (always-revoked default). RLS narrows rows; this allows the
-- operations at all. No anon grant — citizens read supplies only via the view.
grant select, insert, update, delete on public.resource_supplies to authenticated;
```

- [ ] **Step 2: Apply and verify**

Run: `supabase db reset`
Expected: applies through migration 15 with no error.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20260627000015_resource_supplies.sql
git commit -m "feat(db): resource_supplies table with responder RLS"
```

### Task 3: Extend public_resources view with supplies aggregate

**Files:**

- Create: `supabase/migrations/20260627000016_public_resources_supplies.sql`

- [ ] **Step 1: Write the migration**

`create or replace view` requires the existing columns in the same order; the new `supplies` column is appended last. `jsonb_agg` over an empty set returns NULL, so a point with no supply lines exposes `supplies = null` (which the UI reads as "no data → neutral", never "out").

```sql
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
```

- [ ] **Step 2: Apply and verify the aggregate works**

Run: `supabase db reset`
Then run a quick check against the local DB:

Run: `supabase db reset && psql "$(supabase status -o env | grep DB_URL | cut -d= -f2- | tr -d '"')" -c "select supplies from public.public_resources limit 1;"`
Expected: query succeeds, a `supplies` column is returned (value may be empty if seed has no resources). If the `psql` URL wiring is awkward in your environment, skip to running the pgTAP suite in Task 5 — it covers the aggregate.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20260627000016_public_resources_supplies.sql
git commit -m "feat(db): expose PII-free supplies aggregate on public_resources"
```

### Task 4: Realtime publication add

**Files:**

- Create: `supabase/migrations/20260627000017_resources_supplies_realtime.sql`

- [ ] **Step 1: Write the migration**

```sql
-- Faro — subsystem #1: stream resource + supply changes to subscribed responders
-- (the /recursos editor). Same idempotent guard as needs_realtime: re-adding a
-- table to a publication errors, so add each only if not already a member. RLS
-- still applies to the stream, so anon never receives these rows.

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'resources'
  ) then
    alter publication supabase_realtime add table public.resources;
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'resource_supplies'
  ) then
    alter publication supabase_realtime add table public.resource_supplies;
  end if;
end $$;
```

- [ ] **Step 2: Apply and verify idempotency**

Run: `supabase db reset`
Expected: applies with no error. (Re-running the `do` blocks is safe because of the `not exists` guard.)

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20260627000017_resources_supplies_realtime.sql
git commit -m "feat(db): add resources and resource_supplies to realtime publication"
```

### Task 5: pgTAP — supply RLS, exposure, and unique constraint

**Files:**

- Modify: `supabase/tests/rls_test.sql:7` (plan count) and append a supplies block before `select * from finish();` at `supabase/tests/rls_test.sql:216`

The seeded volunteer `2222` is promoted to coordinator earlier in the same transaction (lines 200–204) but remains a responder, so it can still author. The new block creates a resource + supply as that responder, then switches to `anon` to prove the base table is hidden and the view exposes `supplies` with no contact column.

- [ ] **Step 1: Bump the plan count**

Change line 7 from `select plan(24);` to:

```sql
select plan(31);
```

- [ ] **Step 2: Append the supplies block**

Insert immediately before `select * from finish();` (currently line 216):

```sql
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
```

- [ ] **Step 3: Run the suite**

Run: `supabase test db`
Expected: `All 31 tests passed`. If a count mismatch appears ("planned 31 but ran N"), set `plan(N)` to the reported actual and re-run.

- [ ] **Step 4: Commit**

```bash
git add supabase/tests/rls_test.sql
git commit -m "test(db): prove supply RLS, anon hiding, view exposure, unique"
```

### Task 6: Regenerate database types

**Files:**

- Modify: `src/types/database.ts` (regenerated, not hand-edited)

- [ ] **Step 1: Regenerate from the local DB**

Run: `supabase gen types typescript --local > src/types/database.ts`
Expected: file rewritten; now contains `supply_category` and `supply_status` under `Enums`, a `resource_supplies` table type, and a `supplies` column on the `public_resources` view.

- [ ] **Step 2: Verify it typechecks and is formatted**

Run: `npm run typecheck && npx prettier --write src/types/database.ts`
Expected: typecheck passes; prettier formats the generated file.

- [ ] **Step 3: Commit**

```bash
git add src/types/database.ts
git commit -m "chore(types): regenerate database types for supplies"
```

---

## Phase B — Pure Helpers (TDD)

### Task 7: Supply domain helpers — labels, pin status, formatting

**Files:**

- Create: `src/lib/supply.ts`
- Test: `src/lib/supply.test.ts`

Pure functions only (no I/O), so they are unit-tested directly. `pinStatus` is the worst-status → color decision; `draftsToRows` parses editor drafts into DB-ready rows.

- [ ] **Step 1: Write the failing tests**

```ts
import { expect, test } from "vitest";

import {
  draftsToRows,
  pinStatus,
  supplyLineText,
  type SupplyLine,
} from "./supply";

test("closed point is grey regardless of stock", () => {
  const s: SupplyLine[] = [{ category: "water", status: "ok" }];
  expect(pinStatus(s, false)).toBe("closed");
});

test("no supply data is neutral, never red", () => {
  expect(pinStatus(null, true)).toBe("neutral");
  expect(pinStatus([], true)).toBe("neutral");
});

test("a critical category out turns the pin red", () => {
  const s: SupplyLine[] = [
    { category: "water", status: "out" },
    { category: "hygiene", status: "ok" },
  ];
  expect(pinStatus(s, true)).toBe("critical");
});

test("a non-critical category out does not turn the pin red", () => {
  const s: SupplyLine[] = [{ category: "hygiene", status: "out" }];
  expect(pinStatus(s, true)).toBe("low");
});

test("anything low (and nothing critical-out) is amber", () => {
  const s: SupplyLine[] = [{ category: "food", status: "low" }];
  expect(pinStatus(s, true)).toBe("low");
});

test("all stocked is green", () => {
  const s: SupplyLine[] = [{ category: "water", status: "ok" }];
  expect(pinStatus(s, true)).toBe("ok");
});

test("supplyLineText appends quantity and unit when present", () => {
  expect(supplyLineText({ category: "water", status: "ok" })).toBe(
    "Agua: Disponible",
  );
  expect(
    supplyLineText({
      category: "water",
      status: "low",
      quantity: 200,
      unit: "L",
    }),
  ).toBe("Agua: Poco · 200 L");
});

test("draftsToRows parses blanks to null and numbers from strings", () => {
  const rows = draftsToRows({
    water: { status: "ok", quantity: "200", unit: "L" },
    food: { status: "out", quantity: "", unit: "" },
  });
  expect(rows).toContainEqual({
    category: "water",
    status: "ok",
    quantity: 200,
    unit: "L",
  });
  expect(rows).toContainEqual({
    category: "food",
    status: "out",
    quantity: null,
    unit: null,
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run src/lib/supply.test.ts`
Expected: FAIL — `./supply` has no such exports (module not found / undefined).

- [ ] **Step 3: Write the implementation**

```ts
import type { Database } from "@/types/database";

export type SupplyCategory = Database["public"]["Enums"]["supply_category"];
export type SupplyStatus = Database["public"]["Enums"]["supply_status"];

// Spanish labels — a new enum value is a compile error here until it gets one.
export const SUPPLY_CATEGORY_LABEL: Record<SupplyCategory, string> = {
  water: "Agua",
  food: "Comida",
  medical: "Médico",
  shelter_beds: "Camas",
  hygiene: "Higiene",
  power: "Energía",
  infant: "Bebés",
  other: "Otro",
};

export const SUPPLY_STATUS_LABEL: Record<SupplyStatus, string> = {
  ok: "Disponible",
  low: "Poco",
  out: "Agotado",
};

export const SUPPLY_STATUS_EMOJI: Record<SupplyStatus, string> = {
  ok: "🟢",
  low: "🟡",
  out: "🔴",
};

// Stable ordering for editor rows and chips.
export const SUPPLY_CATEGORIES: SupplyCategory[] = [
  "water",
  "food",
  "medical",
  "shelter_beds",
  "hygiene",
  "power",
  "infant",
  "other",
];

// Only the absence of these is life-threatening enough to turn a pin red.
const CRITICAL: SupplyCategory[] = ["water", "food", "medical"];

export type PinStatus = "critical" | "low" | "ok" | "closed" | "neutral";

export interface SupplyLine {
  category: SupplyCategory;
  status: SupplyStatus;
  quantity?: number | null;
  unit?: string | null;
  label?: string | null;
}

// Worst-status → pin status. Closed wins (a closed point is not an active
// alarm); then a critical category being out (red); then anything low (amber);
// then stocked (green). No supply data at all is neutral — unknown is not "out".
export function pinStatus(
  supplies: SupplyLine[] | null | undefined,
  isOpen: boolean,
): PinStatus {
  if (!isOpen) return "closed";
  if (!supplies || supplies.length === 0) return "neutral";
  if (supplies.some((s) => s.status === "out" && CRITICAL.includes(s.category)))
    return "critical";
  if (supplies.some((s) => s.status === "low")) return "low";
  return "ok";
}

// Marker tints per pin status.
export const PIN_COLOR: Record<PinStatus, string> = {
  critical: "#dc2626",
  low: "#d97706",
  ok: "#16a34a",
  closed: "#9ca3af",
  neutral: "#6b7280",
};

// One chip's text: "Agua: Disponible" or "Agua: Poco · 200 L".
export function supplyLineText(s: SupplyLine): string {
  const base = `${SUPPLY_CATEGORY_LABEL[s.category]}: ${SUPPLY_STATUS_LABEL[s.status]}`;
  if (s.quantity == null) return base;
  return `${base} · ${s.quantity}${s.unit ? ` ${s.unit}` : ""}`;
}

// Editor draft shape (quantity/unit are raw input strings).
export interface SupplyDraft {
  status: SupplyStatus;
  quantity: string;
  unit: string;
}

export interface SupplyRowInput {
  category: SupplyCategory;
  status: SupplyStatus;
  quantity: number | null;
  unit: string | null;
}

// Convert editor drafts into DB-ready rows: blanks → null, numeric strings → number.
export function draftsToRows(
  value: Partial<Record<SupplyCategory, SupplyDraft>>,
): SupplyRowInput[] {
  return (Object.entries(value) as [SupplyCategory, SupplyDraft][]).map(
    ([category, d]) => ({
      category,
      status: d.status,
      quantity: d.quantity.trim() === "" ? null : Number(d.quantity),
      unit: d.unit.trim() === "" ? null : d.unit.trim(),
    }),
  );
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run src/lib/supply.test.ts`
Expected: PASS — 8 tests.

- [ ] **Step 5: Commit**

```bash
git add src/lib/supply.ts src/lib/supply.test.ts
git commit -m "feat: supply labels, pin-status helper, draft parsing (TDD)"
```

---

## Phase C — Public Read Surface

### Task 8: Carry supplies through PublicResource

**Files:**

- Modify: `src/lib/data/publicData.ts:8-9` (import) and `:15-25` (interface)

- [ ] **Step 1: Import the SupplyLine type**

Change the import block at the top (currently lines 1-9) so it also pulls `SupplyLine`. Add this import after the existing `@/lib/domain` import:

```ts
import type { SupplyLine } from "@/lib/supply";
```

- [ ] **Step 2: Add the supplies field**

In the `PublicResource` interface (lines 15-25), add a `supplies` field before the closing brace, after `updated_at: string;`:

```ts
  supplies: SupplyLine[] | null;
```

The `read()` cast (`data as unknown as T[]`) already passes the view's `supplies` jsonb through untouched — no change to `read` needed.

- [ ] **Step 3: Verify typecheck**

Run: `npm run typecheck`
Expected: passes (no consumers broken; `supplies` is additive).

- [ ] **Step 4: Commit**

```bash
git add src/lib/data/publicData.ts
git commit -m "feat: include supplies in PublicResource"
```

### Task 9: SupplyChips read-only component

**Files:**

- Create: `src/components/find/SupplyChips.tsx`

- [ ] **Step 1: Write the component**

```tsx
import {
  SUPPLY_STATUS_EMOJI,
  supplyLineText,
  type SupplyLine,
} from "@/lib/supply";

// Shared read-only supply display: one chip per category line, emoji-coded by
// status. Renders nothing when there is no supply data (unknown ≠ out).
export function SupplyChips({ supplies }: { supplies: SupplyLine[] | null }) {
  if (!supplies || supplies.length === 0) return null;
  return (
    <ul className="mt-2 flex flex-wrap gap-1.5">
      {supplies.map((s) => (
        <li
          key={s.category}
          className="inline-flex items-center gap-1 rounded-full border border-border bg-night/30 px-2 py-0.5 text-xs text-foreground"
        >
          <span aria-hidden>{SUPPLY_STATUS_EMOJI[s.status]}</span>
          {supplyLineText(s)}
        </li>
      ))}
    </ul>
  );
}
```

- [ ] **Step 2: Verify typecheck**

Run: `npm run typecheck`
Expected: passes.

- [ ] **Step 3: Commit**

```bash
git add src/components/find/SupplyChips.tsx
git commit -m "feat: SupplyChips read-only supply display"
```

### Task 10: Pin color + popup supply breakdown in MapView

**Files:**

- Modify: `src/components/find/MapView.tsx`

MapView builds popups as HTML strings (not React), so the breakdown is built inline using the same `supply.ts` constants, with DB-sourced text escaped via the existing `esc()`. Pin color comes from `pinStatus` → `PIN_COLOR`.

- [ ] **Step 1: Add imports**

After the existing `fetchResources` import (line 9), add:

```ts
import { PIN_COLOR, pinStatus, supplyLineText } from "@/lib/supply";
```

- [ ] **Step 2: Color the marker and add the breakdown**

Replace the marker block (current lines 97-114, the `for (const r of rows)` body) with:

```ts
for (const r of rows) {
  const dir = `https://www.google.com/maps/dir/?api=1&destination=${r.lat},${r.lng}`;
  const status = r.is_open ? "" : ` · ${esc(t.closed)}`;
  const color = PIN_COLOR[pinStatus(r.supplies, r.is_open)];
  const supplyHtml =
    r.supplies && r.supplies.length > 0
      ? `<br>${r.supplies.map((s) => esc(supplyLineText(s))).join("<br>")}`
      : "";
  L.marker([r.lat, r.lng], {
    icon: L.divIcon({
      className: "",
      html: `<div style="display:flex;align-items:center;justify-content:center;width:30px;height:30px;border-radius:50%;background:${color};border:2px solid #fff;box-shadow:0 1px 3px rgba(0,0,0,.5);font-size:16px;opacity:${r.is_open ? 1 : 0.6}">${EMOJI[r.type]}</div>`,
      iconSize: [30, 30],
      iconAnchor: [15, 15],
    }),
    title: r.name,
    opacity: 1,
  })
    .addTo(map)
    .bindPopup(
      `<strong>${esc(r.name)}</strong><br>${EMOJI[r.type]} ${esc(typeLabel(r.type))}${status}` +
        supplyHtml +
        `<br><a href="${dir}" target="_blank" rel="noopener noreferrer">${esc(t.directions)} →</a>`,
    );
}
```

- [ ] **Step 3: Verify typecheck and lint**

Run: `npm run typecheck && npm run lint`
Expected: both pass. (`r.supplies` is now typed via `PublicResource`.)

- [ ] **Step 4: Commit**

```bash
git add src/components/find/MapView.tsx
git commit -m "feat: color help-point pins by supply status, show breakdown in popup"
```

### Task 11: SupplyChips on resource cards in FindHelp

**Files:**

- Modify: `src/components/find/FindHelp.tsx`

The shared `Card` component renders all three tabs; add an optional `supplies` prop so only resource cards pass it.

- [ ] **Step 1: Import SupplyChips and SupplyLine**

After the `timeAgo`/`VERIFICATION_LABEL` import (line 26), add:

```ts
import { SupplyChips } from "@/components/find/SupplyChips";
import type { SupplyLine } from "@/lib/supply";
```

- [ ] **Step 2: Add the optional prop to Card**

In the `Card` props type (lines 53-71), add after `mapLabel: string;`:

```ts
  supplies?: SupplyLine[] | null;
```

Add the prop to the destructure (it already lists `mapLabel`): change `mapLabel,` to `mapLabel,\n  supplies,`. Then render the chips just before the closing `</li>` of Card (after the `<div>` that holds `timeAgo`/map link, currently line 89):

```tsx
{
  supplies && <SupplyChips supplies={supplies} />;
}
```

- [ ] **Step 3: Pass supplies from the resources tab**

In the resources `.map` (lines 177-193), add to the `<Card>` props after `mapLabel={t.viewMap}`:

```tsx
                supplies={r.supplies}
```

- [ ] **Step 4: Verify typecheck**

Run: `npm run typecheck`
Expected: passes. Hazard and need cards omit `supplies`, so `SupplyChips` is not rendered for them.

- [ ] **Step 5: Commit**

```bash
git add src/components/find/FindHelp.tsx
git commit -m "feat: show supply chips on resource cards"
```

---

## Phase D — Outbox Extension (TDD)

### Task 12: Allow resources + resource_supplies in the outbox

**Files:**

- Modify: `src/lib/db/db.ts:5` (OutboxTable union)
- Test: `src/lib/sync/outbox.test.ts` (append cases)

`flush()` is table-generic (`supabase.from(item.table).insert(...)`) and already drains oldest-first by `createdAt`; ties break by autoincrement `++id`, which is insertion order. So enqueuing the parent `resources` row before its `resource_supplies` children guarantees the parent flushes first. The only code change is widening the type union; the tests pin the behavior.

- [ ] **Step 1: Write the failing tests**

Append to `src/lib/sync/outbox.test.ts` (it already defines `fakeSupabase` returning `{ client, inserted }` and imports `enqueue`, `flush`, `db`):

```ts
test("enqueues and flushes the two resource tables", async () => {
  await enqueue("resources", { id: "r1", type: "water_point", name: "Oasis" });
  await enqueue("resource_supplies", { resource_id: "r1", category: "water" });
  const { client, inserted } = fakeSupabase();
  const synced = await flush(client);
  expect(synced).toBe(2);
  expect(inserted).toHaveLength(2);
});

test("flushes the parent resource before its supply children (FK order)", async () => {
  // Children enqueued in the same tick as the parent must still flush after it.
  await enqueue("resources", { id: "r1", type: "shelter", name: "Refugio" });
  await enqueue("resource_supplies", { resource_id: "r1", category: "water" });
  await enqueue("resource_supplies", { resource_id: "r1", category: "food" });
  const { client, inserted } = fakeSupabase();
  await flush(client);
  const tables = (inserted as { resource_id?: string; type?: string }[]).map(
    (p) => (p.type ? "resources" : "resource_supplies"),
  );
  expect(tables[0]).toBe("resources");
  expect(tables.slice(1)).toEqual(["resource_supplies", "resource_supplies"]);
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run src/lib/sync/outbox.test.ts`
Expected: FAIL — `enqueue("resources", …)` is a type error / the union rejects the new table names (typecheck) and the test does not compile.

- [ ] **Step 3: Widen the OutboxTable union**

In `src/lib/db/db.ts`, change line 5 from:

```ts
export type OutboxTable = "needs" | "hazards" | "missing_persons";
```

to:

```ts
export type OutboxTable =
  | "needs"
  | "hazards"
  | "missing_persons"
  | "resources"
  | "resource_supplies";
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run src/lib/sync/outbox.test.ts`
Expected: PASS — existing cases plus the two new ones.

- [ ] **Step 5: Commit**

```bash
git add src/lib/db/db.ts src/lib/sync/outbox.test.ts
git commit -m "feat: allow resources and resource_supplies in the offline outbox"
```

---

## Phase E — Responder Authoring (`/recursos`)

### Task 13: SupplyEditor — controlled per-category rows

**Files:**

- Create: `src/components/recursos/SupplyEditor.tsx`

A controlled component: parent owns the `SupplyMap` state and passes `value` + `onChange`. Empty categories are hidden; a dropdown adds one; each row has a 3-state status toggle (tap to cycle 🟢→🟡→🔴) plus optional quantity + unit.

- [ ] **Step 1: Write the component**

```tsx
"use client";

import {
  SUPPLY_CATEGORIES,
  SUPPLY_CATEGORY_LABEL,
  SUPPLY_STATUS_EMOJI,
  type SupplyCategory,
  type SupplyDraft,
  type SupplyStatus,
} from "@/lib/supply";

export type SupplyMap = Partial<Record<SupplyCategory, SupplyDraft>>;

const STATUS_CYCLE: SupplyStatus[] = ["ok", "low", "out"];

export function SupplyEditor({
  value,
  onChange,
}: {
  value: SupplyMap;
  onChange: (v: SupplyMap) => void;
}) {
  const added = SUPPLY_CATEGORIES.filter((c) => value[c]);
  const available = SUPPLY_CATEGORIES.filter((c) => !value[c]);

  function setRow(c: SupplyCategory, patch: Partial<SupplyDraft>) {
    onChange({ ...value, [c]: { ...(value[c] as SupplyDraft), ...patch } });
  }
  function cycle(c: SupplyCategory) {
    const cur = value[c]!.status;
    const next =
      STATUS_CYCLE[(STATUS_CYCLE.indexOf(cur) + 1) % STATUS_CYCLE.length];
    setRow(c, { status: next });
  }
  function add(c: SupplyCategory) {
    onChange({ ...value, [c]: { status: "ok", quantity: "", unit: "" } });
  }
  function remove(c: SupplyCategory) {
    const next = { ...value };
    delete next[c];
    onChange(next);
  }

  return (
    <div className="flex flex-col gap-2">
      {added.map((c) => (
        <div key={c} className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => cycle(c)}
            aria-label={`Estado de ${SUPPLY_CATEGORY_LABEL[c]}`}
            className="min-h-[44px] min-w-[44px] text-xl"
          >
            {SUPPLY_STATUS_EMOJI[value[c]!.status]}
          </button>
          <span className="flex-1 text-foreground">
            {SUPPLY_CATEGORY_LABEL[c]}
          </span>
          <input
            inputMode="numeric"
            value={value[c]!.quantity}
            onChange={(e) => setRow(c, { quantity: e.target.value })}
            placeholder="cant."
            aria-label={`Cantidad de ${SUPPLY_CATEGORY_LABEL[c]}`}
            className="min-h-[44px] w-16 rounded-xl border border-border bg-surface px-2 text-foreground"
          />
          <input
            value={value[c]!.unit}
            onChange={(e) => setRow(c, { unit: e.target.value })}
            maxLength={20}
            placeholder="ud."
            aria-label={`Unidad de ${SUPPLY_CATEGORY_LABEL[c]}`}
            className="min-h-[44px] w-16 rounded-xl border border-border bg-surface px-2 text-foreground"
          />
          <button
            type="button"
            onClick={() => remove(c)}
            aria-label={`Quitar ${SUPPLY_CATEGORY_LABEL[c]}`}
            className="min-h-[44px] px-2 text-muted"
          >
            ✕
          </button>
        </div>
      ))}
      {available.length > 0 && (
        <select
          value=""
          onChange={(e) => add(e.target.value as SupplyCategory)}
          aria-label="Agregar suministro"
          className="min-h-[44px] rounded-xl border border-border bg-surface px-3 text-foreground"
        >
          <option value="" disabled>
            Agregar suministro…
          </option>
          {available.map((c) => (
            <option key={c} value={c}>
              {SUPPLY_CATEGORY_LABEL[c]}
            </option>
          ))}
        </select>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verify typecheck**

Run: `npm run typecheck`
Expected: passes.

- [ ] **Step 3: Commit**

```bash
git add src/components/recursos/SupplyEditor.tsx
git commit -m "feat: controlled SupplyEditor with 3-state status rows"
```

### Task 14: LiveResources — realtime refresh

**Files:**

- Create: `src/components/recursos/LiveResources.tsx`

Mirrors `LiveNeeds` (`src/components/panel/LiveNeeds.tsx`) but watches both `resources` and `resource_supplies` and coalesces bursts into one debounced `router.refresh()`.

- [ ] **Step 1: Write the component**

```tsx
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { createClient } from "@/lib/supabase/client";

// Keeps the server-rendered /recursos points fresh: subscribe to changes on
// resources + resource_supplies and re-fetch the route when one lands, so a
// responder sees another responder's edits without pulling to refresh.
// ponytail: refresh the whole route (simple, RLS-correct) instead of patching
// rows client-side. Fine at dashboard scale.
export function LiveResources() {
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();
    let timer: ReturnType<typeof setTimeout> | undefined;
    const refresh = () => {
      clearTimeout(timer);
      timer = setTimeout(() => router.refresh(), 400);
    };

    const channel = supabase
      .channel("resources-live")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "resources" },
        refresh,
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "resource_supplies" },
        refresh,
      )
      .subscribe();

    return () => {
      clearTimeout(timer);
      void supabase.removeChannel(channel);
    };
  }, [router]);

  return null;
}
```

- [ ] **Step 2: Verify typecheck**

Run: `npm run typecheck`
Expected: passes.

- [ ] **Step 3: Commit**

```bash
git add src/components/recursos/LiveResources.tsx
git commit -m "feat: LiveResources realtime refresh for /recursos"
```

### Task 15: RecursosEditor — authoring map + offline add flow

**Files:**

- Create: `src/components/recursos/RecursosEditor.tsx`

Adds a point: a draggable marker drops at the GPS fix (or map center if denied), tap the map to move it. The form captures type/name/description/is_open/capacity_note plus supplies. On submit it generates the resource UUID client-side, enqueues the `resources` insert and one `resource_supplies` insert per category (parent first → FK-safe ordering), then flushes — so it works offline and syncs later. `created_by`/`updated_by` are pinned to the passed `userId` to satisfy RLS `with check`.

- [ ] **Step 1: Write the component**

```tsx
"use client";

import "leaflet/dist/leaflet.css";
import type * as Leaflet from "leaflet";
import { useEffect, useRef, useState } from "react";

import { createClient } from "@/lib/supabase/client";
import { RESOURCE_TYPE_LABEL, type ResourceType } from "@/lib/domain";
import { draftsToRows } from "@/lib/supply";
import { enqueue, flush } from "@/lib/sync/outbox";
import {
  SupplyEditor,
  type SupplyMap,
} from "@/components/recursos/SupplyEditor";

const DEFAULT_CENTER: [number, number] = [10.4806, -66.9036]; // Caracas

const RESOURCE_TYPES = Object.entries(RESOURCE_TYPE_LABEL) as [
  ResourceType,
  string,
][];

export function RecursosEditor({ userId }: { userId: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const markerRef = useRef<Leaflet.Marker | null>(null);
  const [coords, setCoords] = useState<[number, number]>(DEFAULT_CENTER);
  const [type, setType] = useState<ResourceType>("water_point");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isOpen, setIsOpen] = useState(true);
  const [capacity, setCapacity] = useState("");
  const [supplies, setSupplies] = useState<SupplyMap>({});
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<"sent" | "queued" | null>(null);

  useEffect(() => {
    let map: Leaflet.Map | null = null;
    let cancelled = false;

    (async () => {
      const mod = await import("leaflet");
      const L = mod.default ?? mod;
      if (cancelled || !ref.current) return;

      map = L.map(ref.current).setView(DEFAULT_CENTER, 13);
      L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: "© OpenStreetMap",
        crossOrigin: true,
      }).addTo(map);

      const marker = L.marker(DEFAULT_CENTER, { draggable: true }).addTo(map);
      markerRef.current = marker;
      marker.on("dragend", () => {
        const p = marker.getLatLng();
        setCoords([p.lat, p.lng]);
      });
      // Tap anywhere to move the pin.
      map.on("click", (e: Leaflet.LeafletMouseEvent) => {
        marker.setLatLng(e.latlng);
        setCoords([e.latlng.lat, e.latlng.lng]);
      });

      navigator.geolocation?.getCurrentPosition(
        (pos) => {
          if (cancelled || !map) return;
          const here: [number, number] = [
            pos.coords.latitude,
            pos.coords.longitude,
          ];
          map.setView(here, 15);
          marker.setLatLng(here);
          setCoords(here);
        },
        () => {},
        { timeout: 10000 },
      );
    })();

    return () => {
      cancelled = true;
      map?.remove();
    };
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setSubmitting(true);

    const id = crypto.randomUUID();
    // Parent first so it lands before its children on flush (FK ordering).
    await enqueue("resources", {
      id,
      type,
      name: name.trim(),
      description: description.trim() || null,
      lat: coords[0],
      lng: coords[1],
      is_open: isOpen,
      capacity_note: capacity.trim() || null,
      created_by: userId,
    });
    for (const row of draftsToRows(supplies)) {
      await enqueue("resource_supplies", {
        resource_id: id,
        category: row.category,
        status: row.status,
        quantity: row.quantity,
        unit: row.unit,
        updated_by: userId,
      });
    }

    const synced = await flush(createClient()).catch(() => 0);
    setResult(synced > 0 ? "sent" : "queued");
    setSubmitting(false);
    // Reset for the next point.
    setName("");
    setDescription("");
    setCapacity("");
    setSupplies({});
    setIsOpen(true);
  }

  return (
    <section className="flex flex-col gap-3">
      <div
        ref={ref}
        className="h-64 w-full overflow-hidden rounded-2xl border border-border bg-surface"
        role="application"
        aria-label="Mapa para ubicar el punto"
      />
      <p className="text-xs text-muted">
        Toca el mapa o arrastra el marcador para ubicar el punto.{" "}
        {coords[0].toFixed(4)}, {coords[1].toFixed(4)}
      </p>

      {result && (
        <p className="rounded-lg bg-beacon/15 px-3 py-2 text-sm text-foreground">
          {result === "sent"
            ? "Punto publicado."
            : "Guardado — se enviará al volver la conexión."}
        </p>
      )}

      <form onSubmit={submit} className="flex flex-col gap-3">
        <label className="flex flex-col gap-1">
          <span className="font-medium text-foreground">Tipo</span>
          <select
            value={type}
            onChange={(e) => setType(e.target.value as ResourceType)}
            className="min-h-[44px] rounded-xl border border-border bg-surface px-3 text-foreground"
          >
            {RESOURCE_TYPES.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>

        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={160}
          required
          placeholder="Nombre del punto"
          className="min-h-[44px] rounded-xl border border-border bg-surface px-3 text-foreground"
        />

        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          maxLength={2000}
          rows={2}
          placeholder="Descripción (opcional)"
          className="rounded-xl border border-border bg-surface p-3 text-foreground"
        />

        <input
          value={capacity}
          onChange={(e) => setCapacity(e.target.value)}
          maxLength={200}
          placeholder="Capacidad / nota (opcional)"
          className="min-h-[44px] rounded-xl border border-border bg-surface px-3 text-foreground"
        />

        <label className="flex items-center gap-2 text-foreground">
          <input
            type="checkbox"
            checked={isOpen}
            onChange={(e) => setIsOpen(e.target.checked)}
            className="h-5 w-5"
          />
          Abierto ahora
        </label>

        <div className="rounded-xl border border-border bg-surface p-3">
          <p className="mb-2 font-medium text-foreground">Suministros</p>
          <SupplyEditor value={supplies} onChange={setSupplies} />
        </div>

        <button
          type="submit"
          disabled={submitting || !name.trim()}
          className="min-h-[52px] rounded-2xl bg-volunteer px-6 font-bold text-white disabled:opacity-60"
        >
          {submitting ? "Guardando…" : "Agregar punto"}
        </button>
      </form>
    </section>
  );
}
```

- [ ] **Step 2: Verify typecheck and lint**

Run: `npm run typecheck && npm run lint`
Expected: both pass.

- [ ] **Step 3: Commit**

```bash
git add src/components/recursos/RecursosEditor.tsx
git commit -m "feat: RecursosEditor offline add-a-point flow with supplies"
```

### Task 16: ResourcePoints — existing points with online supply edit

**Files:**

- Create: `src/components/recursos/ResourcePoints.tsx`

Lists the responder's existing points (server-rendered, passed as props). Editing a point's supplies is online-only (Phase 1): each save upserts changed lines (`on conflict (resource_id, category)`) and deletes removed categories through the RLS-gated browser client, then `router.refresh()`. `LiveResources` also refreshes when the change streams back.

- [ ] **Step 1: Write the component**

```tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { createClient } from "@/lib/supabase/client";
import { RESOURCE_TYPE_LABEL } from "@/lib/domain";
import { draftsToRows, type SupplyCategory } from "@/lib/supply";
import {
  SupplyEditor,
  type SupplyMap,
} from "@/components/recursos/SupplyEditor";
import type { Database } from "@/types/database";

type SupplyRow = Database["public"]["Tables"]["resource_supplies"]["Row"];
type ResourceRow = Database["public"]["Tables"]["resources"]["Row"];
export type ResourceWithSupplies = ResourceRow & {
  resource_supplies: SupplyRow[];
};

// Seed the editor map from the point's current supply rows.
function toMap(rows: SupplyRow[]): SupplyMap {
  const m: SupplyMap = {};
  for (const r of rows) {
    m[r.category] = {
      status: r.status,
      quantity: r.quantity == null ? "" : String(r.quantity),
      unit: r.unit ?? "",
    };
  }
  return m;
}

function PointEditor({
  point,
  userId,
}: {
  point: ResourceWithSupplies;
  userId: string;
}) {
  const router = useRouter();
  const original = point.resource_supplies.map((s) => s.category);
  const [supplies, setSupplies] = useState<SupplyMap>(
    toMap(point.resource_supplies),
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(false);

  async function save() {
    setSaving(true);
    setError(false);
    const supabase = createClient();
    const rows = draftsToRows(supplies);
    const present = new Set(rows.map((r) => r.category));
    const removed = original.filter(
      (c) => !present.has(c as SupplyCategory),
    ) as SupplyCategory[];

    try {
      if (rows.length > 0) {
        const { error: upErr } = await supabase
          .from("resource_supplies")
          .upsert(
            rows.map((r) => ({
              resource_id: point.id,
              category: r.category,
              status: r.status,
              quantity: r.quantity,
              unit: r.unit,
              updated_by: userId,
            })),
            { onConflict: "resource_id,category" },
          );
        if (upErr) throw upErr;
      }
      for (const c of removed) {
        const { error: delErr } = await supabase
          .from("resource_supplies")
          .delete()
          .eq("resource_id", point.id)
          .eq("category", c);
        if (delErr) throw delErr;
      }
      router.refresh();
    } catch {
      setError(true);
    } finally {
      setSaving(false);
    }
  }

  return (
    <li className="rounded-2xl border border-border bg-surface p-4">
      <div className="flex items-center justify-between gap-2">
        <h3 className="font-semibold text-foreground">
          {RESOURCE_TYPE_LABEL[point.type]} · {point.name}
        </h3>
        {!point.is_open && <span className="text-xs text-muted">Cerrado</span>}
      </div>
      <div className="mt-3">
        <SupplyEditor value={supplies} onChange={setSupplies} />
      </div>
      {error && (
        <p className="mt-2 text-sm text-help">
          Necesitas conexión para guardar cambios en un punto existente.
        </p>
      )}
      <button
        type="button"
        onClick={save}
        disabled={saving}
        className="mt-3 min-h-[44px] rounded-xl bg-volunteer px-4 font-medium text-white disabled:opacity-60"
      >
        {saving ? "Guardando…" : "Guardar suministros"}
      </button>
    </li>
  );
}

export function ResourcePoints({
  points,
  userId,
}: {
  points: ResourceWithSupplies[];
  userId: string;
}) {
  if (points.length === 0) {
    return <p className="text-muted">Aún no hay puntos. Agrega el primero.</p>;
  }
  return (
    <ul className="flex flex-col gap-3">
      {points.map((p) => (
        <PointEditor key={p.id} point={p} userId={userId} />
      ))}
    </ul>
  );
}
```

- [ ] **Step 2: Verify typecheck and lint**

Run: `npm run typecheck && npm run lint`
Expected: both pass.

- [ ] **Step 3: Commit**

```bash
git add src/components/recursos/ResourcePoints.tsx
git commit -m "feat: ResourcePoints list with online supply editing"
```

### Task 17: /recursos page, route gating, and nav links

**Files:**

- Create: `src/app/recursos/page.tsx`
- Modify: `src/proxy.ts:49` (matcher)
- Modify: `src/app/panel/page.tsx` and `src/app/coordinador/page.tsx` (nav link)

The page is a responder-gated server component (mirrors `/coordinador`): it confirms a profile exists, fetches the responder's points with embedded supplies (RLS permits responders), and renders the realtime + authoring + list components. `proxy.ts` already redirects unauthenticated users to `/acceso`; adding the matcher entry brings `/recursos` under that guard.

- [ ] **Step 1: Add /recursos to the auth matcher**

In `src/proxy.ts`, change the matcher array (line 49) from:

```ts
  matcher: ["/panel/:path*", "/coordinador/:path*", "/api/route"],
```

to:

```ts
  matcher: [
    "/panel/:path*",
    "/coordinador/:path*",
    "/recursos/:path*",
    "/api/route",
  ],
```

- [ ] **Step 2: Write the page**

```tsx
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { signOut } from "@/lib/auth/actions";
import { createClient } from "@/lib/supabase/server";
import { LiveResources } from "@/components/recursos/LiveResources";
import { RecursosEditor } from "@/components/recursos/RecursosEditor";
import {
  ResourcePoints,
  type ResourceWithSupplies,
} from "@/components/recursos/ResourcePoints";

export const metadata: Metadata = { title: "Recursos y suministros" };

export default async function RecursosPage() {
  const supabase = await createClient();

  // Login is enforced by proxy.ts; this confirms the user is a responder.
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: me } = await supabase
    .from("profiles")
    .select("id, role")
    .single();
  if (!user || !me) redirect("/acceso?next=/recursos");

  const { data } = await supabase
    .from("resources")
    .select("*, resource_supplies(*)")
    .order("updated_at", { ascending: false })
    .limit(200);
  const points = (data ?? []) as ResourceWithSupplies[];

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col gap-6 px-5 py-8">
      <LiveResources />
      <div className="flex items-center justify-between">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm text-muted hover:text-foreground"
        >
          <span aria-hidden>←</span> Inicio
        </Link>
        <form action={signOut}>
          <button type="submit" className="text-sm text-muted underline">
            Salir
          </button>
        </form>
      </div>

      <header>
        <h1 className="font-display text-2xl font-semibold tracking-tight text-foreground">
          Recursos y suministros
        </h1>
        <p className="mt-1 text-muted">
          Agrega puntos de ayuda y mantén su suministro al día. Agregar funciona
          sin conexión; editar un punto existente necesita internet.
        </p>
      </header>

      <RecursosEditor userId={user.id} />

      <section className="flex flex-col gap-3">
        <h2 className="font-semibold text-foreground">Puntos publicados</h2>
        <ResourcePoints points={points} userId={user.id} />
      </section>
    </main>
  );
}
```

- [ ] **Step 3: Add a nav link from both responder panels**

In `src/app/panel/page.tsx`, inside the header `<div className="flex items-center justify-between">` (lines 180-192), add a link to `/recursos` next to the "Inicio" link. Change the block so it reads:

```tsx
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm text-muted hover:text-foreground"
        >
          <span aria-hidden>←</span> Inicio
        </Link>
        <div className="flex items-center gap-4">
          <Link href="/recursos" className="text-sm text-muted underline">
            Recursos
          </Link>
          <form action={signOut}>
            <button type="submit" className="text-sm text-muted underline">
              Salir
            </button>
          </form>
        </div>
```

Apply the identical change to the matching header block in `src/app/coordinador/page.tsx` (lines 297-309).

- [ ] **Step 4: Verify typecheck, lint, build**

Run: `npm run typecheck && npm run lint && npm run build`
Expected: all pass; build emits `/recursos` as a route.

- [ ] **Step 5: Commit**

```bash
git add src/app/recursos/page.tsx src/proxy.ts src/app/panel/page.tsx src/app/coordinador/page.tsx
git commit -m "feat: responder-gated /recursos route with nav links"
```

---

## Phase F — Verification

### Task 18: Full gate + DB tests + manual smoke

- [ ] **Step 1: Run the full automated gate**

Run: `npm run typecheck && npm run lint && npm run format:check && npm run test && npm run build && supabase test db`
Expected: every stage green; `supabase test db` reports all tests passed (31).
If `format:check` fails, run `npm run format` then re-stage and commit the formatting in a follow-up commit.

- [ ] **Step 2: Manual smoke — offline create syncs**

1. `npm run dev`, sign in as a responder, open `/recursos`.
2. Open devtools → Network → set **Offline**.
3. Add a point (place pin, name it, set water = 🔴 out), submit. Expected: "Guardado — se enviará al volver la conexión."
4. Set Network back to **Online**. Within a few seconds the queued insert flushes.
5. In a second browser/profile signed in as another responder with `/recursos` open: the new point appears (via `LiveResources`).

- [ ] **Step 3: Manual smoke — status flips live and reaches citizens**

1. As a responder, on an existing point change water 🔴→🟢 and "Guardar suministros".
2. Another responder's `/recursos` refreshes within ~1s.
3. Open `/mapa` as a citizen (no login). Within ~30s (or on reload) the pin color reflects the new status and the popup lists the supply lines. A point with no supply data shows a neutral pin (not red); a closed point shows grey.

- [ ] **Step 4: Final commit if any formatting changed**

```bash
git add -A
git commit -m "chore: formatting after live resource & supply map"
```
