# Deployment

Faro deploys free, end to end: Supabase (database + auth) and Vercel (frontend),
both on their free tiers, plus two **optional, self-hosted, zero-API-cost**
add-ons (Ollama for AI triage, OSRM for routing) that no-op cleanly when absent.

## 1. Database — Supabase (free tier)

The entire security model lives in Postgres (RLS), so the database is the part to
get right.

```bash
# Install the Supabase CLI: https://supabase.com/docs/guides/cli
supabase login
supabase link --project-ref <your-project-ref>

# Push the schema: ordered migrations create tables, RLS policies,
# SECURITY DEFINER role helpers, the PII-free public views, and audit triggers.
supabase db push

# CRITICAL: prove the security model on the real instance before any user
# touches it. Asserts anon cannot read needs/missing_persons/profiles,
# cannot self-verify, and that public coordinates are blurred.
supabase test db        # runs supabase/tests/rls_test.sql — must be all green

# Optional: load demo rows (a coordinator + volunteer + sample reports).
# Do NOT run this on a real deployment with real data.
supabase db seed
```

Promoting a coordinator (roles are not self-assignable by design):

```sql
update public.profiles set role = 'coordinator' where id = '<auth-user-id>';
```

## 2. Frontend — Vercel (free tier)

Import the repo into Vercel and set these environment variables (from
`.env.example`):

| Variable                        | Required | Notes                                                              |
| ------------------------------- | -------- | ------------------------------------------------------------------ |
| `NEXT_PUBLIC_SUPABASE_URL`      | yes      | Safe to expose (RLS protects data)                                 |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | yes      | Safe to expose (RLS protects data)                                 |
| `SUPABASE_SERVICE_ROLE_KEY`     | no\*     | SECRET, server-side only. Bypasses RLS — only for migrations/admin |
| `NEXT_PUBLIC_APP_URL`           | yes      | Public base URL of the deployment                                  |
| `OLLAMA_URL` / `OLLAMA_MODEL`   | no       | Enables AI triage (see below)                                      |
| `OSRM_URL`                      | no       | Enables responder ETAs (see below)                                 |

\* Not needed at runtime by the app; keep it out of the deployment unless an
admin task requires it.

The build uses `next build --webpack` (so Serwist can emit the offline service
worker). Vercel runs the `build` script automatically.

## 3. Optional AI triage — Ollama (zero API cost)

The coordinator dashboard shows a "Sugerencia IA — verificar" chip when a local
model disagrees with a citizen's category/urgency. AI **only suggests**; a human
verifies (Golden Rule 3). Leave `OLLAMA_URL` unset and the feature stays hidden.

```bash
# On a box reachable by the Next.js server (a VPS, a GPU machine, or a laptop):
# install Ollama → https://ollama.com
ollama pull qwen2.5:7b     # good multilingual (Spanish) instruct model; ~7B
# Then set OLLAMA_URL=http://<that-box>:11434 and OLLAMA_MODEL=qwen2.5:7b
```

Smaller hardware: `qwen2.5:3b`. The model never leaves your infrastructure, and
report text is never sent to a third party.

## 4. Optional routing — OSRM (zero API cost)

Adds road distance + ETA from a responder to each need, proxied through
`/api/route` (gated to logged-in responders). Leave `OSRM_URL` unset and the
badge simply doesn't render.

```bash
# Download a Venezuela extract and preprocess it (Docker):
wget https://download.geofabrik.de/south-america/venezuela-latest.osm.pbf
docker run -t -v "${PWD}:/data" ghcr.io/project-osrm/osrm-backend \
  osrm-extract -p /opt/car.lua /data/venezuela-latest.osm.pbf
docker run -t -v "${PWD}:/data" ghcr.io/project-osrm/osrm-backend \
  osrm-partition /data/venezuela-latest.osrm
docker run -t -v "${PWD}:/data" ghcr.io/project-osrm/osrm-backend \
  osrm-customize /data/venezuela-latest.osrm
docker run -t -i -p 5000:5000 -v "${PWD}:/data" ghcr.io/project-osrm/osrm-backend \
  osrm-routed --algorithm mld /data/venezuela-latest.osrm
# Then set OSRM_URL=http://<that-box>:5000
```

ETAs route the **pre-quake** road network, so they are best-guess and shown with
a `~` (Golden Rule 5: don't present stale data as fact).
