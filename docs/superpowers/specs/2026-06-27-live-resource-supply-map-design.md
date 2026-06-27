# Live Resource & Supply Map — Design Spec

**Date:** 2026-06-27
**Status:** Approved for planning
**Sub-project:** #1 of a 4-part program (see "Program context")

## Summary

Make Faro's help-point map operationally useful in a crisis: let responders
add and maintain shelters, water points ("oasis"), food distribution, clinics,
charging, and distribution centers — each with a **structured, per-item supply
picture** — and surface it on a map that updates in near-real-time. Citizens
(no login) see where help is and what it has in stock; responders get an
instant, coordinated, offline-capable authoring surface.

This is the first of four subsystems decomposed from a larger vision. It is
self-contained and ships its own value: every human, with or without an
account, can see where help is and what it holds.

## Program context (the other three subsystems, not in this spec)

1. **Live resource & supply map** — THIS SPEC.
2. **Live task board & tracking** — needs as trackable tasks (add / assign /
   en route / done) visible in real time.
3. **Brigades & dispatch** — group responders into brigades with capabilities
   and availability; assign a brigade (not just one responder) to a task.
4. **Online/offline feature tiering** — a deliberate capability layer that
   lights up richer features (routing, address geocoding, live tracking) when
   connectivity exists, over an always-working offline core.

Each gets its own spec → plan → build cycle. Realtime is not a separate
subsystem; it threads through all of them.

## Goals

- Responders can **add a help point** from the field, even offline.
- Each point carries a **structured supply breakdown** (category + status +
  optional quantity), not a free-text guess.
- The map is **instantly readable** for a distressed citizen (colored pins) and
  **detailed** for a coordinator (per-item breakdown).
- **Near-real-time**: responders see changes live; citizens see them within
  ~30s when online, and the last-known snapshot when offline.
- **Secure by construction**: citizens never touch base tables or operator PII;
  enforced in Postgres and proven by tests.

## Non-goals (explicitly deferred)

- **Citizen-submitted supply reports** ("this place is out of water") — Phase 2
  of this subsystem (the agreed "A now, C next").
- **Offline editing** of an existing point's supply status — Phase 2 (requires
  update-conflict resolution the insert-only outbox doesn't model).
- **Address entry / geocoding** when adding a point — belongs to subsystem #4
  (online feature tier).
- Multiple free-form `other` items per point — one `other` slot in Phase 1.
- Visual "stale supply" aging on pins — later polish.

## Decisions (from brainstorming)

| #            | Decision                                                                                                                       |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------ |
| Supply model | Structured: dedicated `resource_supplies` table, not a JSON blob                                                               |
| Who writes   | Responder-only (RLS). Citizen reports = Phase 2                                                                                |
| Supply shape | Fixed `supply_category` enum + `supply_status` (ok/low/out) + optional quantity & unit                                         |
| Location     | GPS default + draggable/tappable pin; no address entry                                                                         |
| Liveness     | Tiered — responders true realtime; citizens poll the public view ~30s + offline cache                                          |
| Architecture | Approach 1: reuse proven RLS + public-view + realtime + outbox patterns; separate public-read and responder-authoring surfaces |

## Architecture

### 1. Data model & security

**New enums**

- `supply_category`: `water, food, medical, shelter_beds, hygiene, power, infant, other`
- `supply_status`: `ok, low, out`

**New table `public.resource_supplies`**

| column        | type                       | notes                                                   |
| ------------- | -------------------------- | ------------------------------------------------------- |
| `id`          | uuid pk                    | `gen_random_uuid()` default                             |
| `resource_id` | uuid not null              | → `resources(id)` **on delete cascade**                 |
| `category`    | `supply_category` not null |                                                         |
| `status`      | `supply_status` not null   | default `'ok'`                                          |
| `quantity`    | numeric                    | `check (quantity is null or quantity >= 0)` — optional  |
| `unit`        | text                       | `check (length ≤ 20)` — optional ("L", "beds", "meals") |
| `label`       | text                       | `check (length ≤ 80)` — optional, mainly for `other`    |
| `updated_by`  | uuid                       | → `profiles(id)` on delete set null                     |
| `created_at`  | timestamptz                | default `now()`                                         |
| `updated_at`  | timestamptz                | maintained by existing `set_updated_at` trigger         |

- `unique (resource_id, category)` — one clean line per category, so the pin's
  worst-status is unambiguous and `upsert` is natural.
- _ponytail ceiling:_ one `other` slot per point; drop uniqueness on `other`
  later if responders need multiple free-form items.

**RLS** (mirrors `resources`, the pattern already proven by the pgTAP suite)

- `responders insert` — `is_responder() and updated_by = auth.uid()`
- `responders read all` — `is_responder()`
- `responders update` — `is_responder()`
- `responders delete` — `is_responder()` (remove a line they added; lower-stakes
  than retiring a whole point, which stays coordinator-only via `resources`)

**Public exposure** — extend the existing `public_resources` view (definer
rights, the security boundary) with an aggregated, PII-free column:

```sql
(select jsonb_agg(jsonb_build_object(
   'category', s.category, 'status', s.status,
   'quantity', s.quantity, 'unit', s.unit, 'label', s.label
 ) order by s.category)
 from public.resource_supplies s where s.resource_id = r.id) as supplies
```

Citizens receive points **and** supplies in the single fetch they already make
(`fetchResources` → `public_resources`), offline-cached by the existing
`read()` path. No new endpoint, no PII in the stream.

**Realtime** — add `resources` and `resource_supplies` to the
`supabase_realtime` publication via an **idempotent guard** migration (same
shape as `20260627000012_needs_realtime.sql`). Responders subscribe; citizens
poll.

### 2. Components & screens

**Public — `/mapa` (existing, light touches)**

- `MapView` stays the calm, read-only citizen map. Additions:
  - **Pin color by supply status:** red if any _critical_ category
    (water/food/medical) is `out`; amber if anything is `low`; green if stocked;
    dimmed/grey if `is_open = false`; **neutral** if there is no supply data at
    all (unknown ≠ out).
  - **Popup supply breakdown** via shared `SupplyChips`.
- `FindHelp` resources tab: cards show the same `SupplyChips`.

**Responder — new route `/recursos` (authoring surface)**

- Server component, **responder-gated** like `/panel` / `/coordinador`
  (redirect non-responders).
- Editable map + list of points. Reuses the Leaflet + OSM-tile setup via a
  small shared `mapInit` helper (dedupe, not a heavy abstraction), so both maps
  share the offline-tile cache shipped earlier.
- **Add a point:** drops a marker at the GPS fix, draggable to correct, or tap
  to place. Form: type, name, optional description, `is_open`, capacity note.
- **Supply editor:** one row per category with a 3-state status toggle
  (🟢🟡🔴, tap to cycle) and an optional quantity+unit field. Empty categories
  are hidden until added.

**Component boundaries (each independently testable)**

- `MapView` (read) · `RecursosEditor` (authoring map + add flow) · `SupplyEditor`
  (one point's supply rows) · `SupplyChips` (shared read-only display) ·
  `mapInit` (shared tile/map setup) · `LiveResources` (realtime refresh, mirrors
  `LiveNeeds`).

**Server actions** (responder-gated by RLS, same pattern as
`claimNeed`/`verifyNeed`): `createResource`, `updateResource`, `upsertSupply`
(`on conflict (resource_id, category)`), `deleteSupply`.

### 3. Data flow & liveness

**Citizen read (near-real-time):** `/mapa` → `fetchResources()` →
`public_resources` (now with `supplies`) → render + Dexie cache. A **~30s poll**
runs only when the tab is **visible and online** (pause when hidden/offline) to
spare battery. Offline → cached snapshot marked stale.

**Responder read (true realtime):** `/recursos` server-renders the responder's
points+supplies from base tables (RLS permits). `LiveResources` subscribes to
`postgres_changes` on `resources` + `resource_supplies` and fires a debounced
`router.refresh()`.

**Write — create (works offline):** the client generates the resource UUID up
front (`crypto.randomUUID()`), enqueues the `resources` insert and the
`resource_supplies` inserts into the **outbox** (oldest-first, so the parent
lands before its children), and flushes immediately if online. Extends
`OutboxTable` to include `resources` and `resource_supplies` — the same
idempotent, dead-letter-protected replay already hardened.

**Write — edit (online, Phase 1):** editing an existing point's supply status
requires connectivity. Offline edits to existing rows need update-conflict
resolution (two responders, same point) that the insert-only outbox doesn't
model; deferred to Phase 2.

### 4. Error handling & edge cases

- **GPS denied/unavailable:** never block adding — fall back to map center,
  require a tap/drag to place.
- **No supply data ≠ out:** zero supply rows → neutral pin (by `is_open`), never
  red.
- **Duplicate category:** `upsertSupply` uses `on conflict (resource_id,
category)`.
- **Offline-create failure:** a child whose parent insert was rejected hits an
  FK violation (23503, permanent) → dead-lettered, surfaced via `failedCount()`.
- **Validation at the trust boundary:** server actions and DB `check`
  constraints both enforce enum membership, lat/lng range, string lengths.
- **Realtime drop:** server-rendered snapshot remains; reconnect re-subscribes;
  debounce prevents thrash.
- **Expiry:** points past `expires_at` drop from the public view; any responder
  update keeps a point live.
- **Cascade:** coordinator retiring a point cascades its supplies.

### 5. Testing & verification

- **pgTAP (RLS/security):** responder can insert/update/delete a supply; **anon
  cannot read `resource_supplies`**; `public_resources` exposes `supplies` with
  **no contact columns**; `unique(resource_id, category)` holds.
- **Vitest (logic):** outbox enqueue/flush for the two new tables; offline-create
  **ordering** (parent before children); **worst-status → pin-color** pure
  helper; supply-chip formatting.
- **TDD:** pure helpers (worst-status color, supply summary) and RLS rules get
  tests written first.
- **Verification before completion:** full gate — typecheck · lint · prettier ·
  vitest · build — **plus** `supabase test db`, plus a manual smoke pass (add a
  point offline → reconnect → appears for another responder; flip a status → it
  lands live; citizen map reflects within ~30s).

## Migrations (new)

1. `…_supply_enums.sql` — `supply_category`, `supply_status`.
2. `…_resource_supplies.sql` — table, indexes, `set_updated_at` trigger, RLS.
3. `…_public_resources_supplies.sql` — `create or replace view public_resources`
   with the `supplies` aggregate (re-grant unchanged).
4. `…_resources_supplies_realtime.sql` — idempotent publication add for
   `resources` + `resource_supplies`.

## Open questions

None blocking. Phase 2 items (citizen supply reports, offline edit) are tracked
under Non-goals.
