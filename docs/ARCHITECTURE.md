# Architecture

How Faro is put together, and why. This is the map for contributors; the
security model lives in [`../SECURITY.md`](../SECURITY.md) and deploy steps in
[`DEPLOYMENT.md`](./DEPLOYMENT.md).

## Design constraints (these drive every decision)

Faro runs on cheap Android phones with bad signal and unreliable power, in a
disaster. That forces the architecture:

- **Offline-first is not a feature, it's the substrate.** The lifesaving core
  (send SOS, find water/shelter, report a hazard) must work with the radio off.
- **The database is assumed to leak.** Security is enforced in Postgres (RLS),
  never only in the UI.
- **Every external dependency must degrade to nothing.** No GPS, no AI, no
  routing box, no signal — the app still does its job.
- **Free and self-hostable end to end.** No paid APIs anywhere on the critical
  path.

## High-level shape

```
        ┌──────────────────────── Browser (PWA) ────────────────────────┐
        │                                                                │
  Citizen (anon) ─► forms ─► outbox (Dexie/IndexedDB) ─► flush ──┐       │
        │                          ▲                             │       │
        │                          └── client_token (idempotent) │       │
        │                                                         ▼       │
  Responder ────► server components ───────────────────► Supabase JS ────┼──► Supabase
        │            (panel, coordinator)                  (anon key)     │    (Postgres
        │                                                                 │     + Auth
  Service Worker (Serwist): precache shell, runtime cache, /offline       │     + RLS)
        └────────────────────────────────────────────────────────────────┘
                                                                              ▲
              Optional, self-hosted, no-API-cost, all degrade to no-op:       │
              Ollama (AI triage) ── OSRM (responder ETAs) ── OSM tiles ───────┘
```

## Layers

### Frontend — `src/app`, `src/components`

Next.js 16 App Router, React 19, TypeScript strict, Tailwind. Server Components
read data; small Client Components own the interactive bits (forms, map,
geolocation, sync status). Pages:

- Public/anon: `/` (home), `/sos`, `/peligro` (hazard), `/desaparecido`
  (missing person), `/mapa` (find help), `/offline`.
- Responder (auth): `/panel` (volunteer queue), `/coordinador` (verify, assign,
  AI triage), `/acceso` (login), `/registro` (signup).

### Offline sync — `src/lib/sync`, `src/lib/db`, `src/lib/data`

- **Outbox** (`sync/outbox.ts`): writes are `enqueue`d to a Dexie/IndexedDB
  queue, then `flush`ed oldest-first when online. Each row carries a
  `client_token`; a duplicate-key (23505) on replay is treated as already-synced,
  so retries can't double-count.
- **Read cache** (`data/publicData.ts`): public views are served from cache
  instantly, refreshed from the network in the background, and marked stale when
  offline. Offline with no cache throws a handled `offline-no-cache`.
- **Service worker** (`app/sw.ts`, Serwist): precaches the shell, runtime-caches
  assets/data, falls back to `/offline`.

### Data & security — `supabase/`

Postgres with Row-Level Security as the primary access control. 11 ordered
migrations build enums, tables (`profiles`, `needs`, `resources`, `hazards`,
`missing_persons`, `assignments`, `audit_log`), `SECURITY DEFINER` role helpers,
verification-guard triggers, an append-only audit trail, and PII-free public
views. `supabase/tests/rls_test.sql` (pgTAP) proves the Golden Rules in the DB
itself. See [`DATA_MODEL.md`](./DATA_MODEL.md) for the table-by-table breakdown.

### Optional self-hosted add-ons — `src/lib/ai`, `src/lib/routing`

- **AI triage** (`ai/triage.ts`): a local Ollama model suggests category/urgency
  for open needs. AI only suggests — a human always confirms (Golden Rule 3).
  Unreachable Ollama → suggestions silently hidden.
- **Routing ETAs** (`routing/osrm.ts`): a self-hosted OSRM box returns
  road distance/ETA, proxied through `/api/route` (gated to responders).
  Unset → the badge doesn't render.

## Key flows

**Anonymous SOS (offline):** form → `enqueue("needs", payload)` → Dexie → on
`online` event `flush()` inserts with `client_token` → success or duplicate
dequeues the item. The citizen never waits on the network and never logs in.

**Claim a need (atomic):** a responder taps "Tomar" → conditional update
`set claimed_by = me where claimed_by is null`. Postgres lets exactly one of two
racing responders win, so two people can't be sent to the same person.

**Verify a need (coordinator only):** update sets `verification = 'verified'` →
a DB trigger rejects non-coordinators and stamps `verified_by`/`verified_at` →
the audit trigger records it.

## Conventions

- Spanish-first. `es` is the source of truth in `src/lib/i18n.ts`; `en` is the
  toggle.
- Never rely on color alone (a11y); visible focus rings; reduced-motion honored.
- Conventional Commits. The gate (typecheck · lint · format · test · build) must
  be green before merge.
