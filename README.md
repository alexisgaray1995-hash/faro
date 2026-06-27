# Faro 🪔

**Una herramienta gratuita y de código abierto para pedir y coordinar ayuda en
emergencias — funcione o no el internet.**
_A free, open-source tool to request and coordinate emergency help — with or
without the internet._

> Construida para responder a los terremotos del 24 de junio de 2026 en
> Venezuela y a la crisis humanitaria en curso. Sin anuncios, sin rastreo, sin
> fines de lucro. Licencia MIT.

---

## 🇪🇸 Español

### ¿Qué es?

Faro es una aplicación web instalable (PWA) **offline-first** para tres tipos de
personas, a menudo con teléfonos económicos y sin buena señal:

1. **Quien necesita ayuda** — enviar un SOS, encontrar agua, comida, refugio o
   atención médica, y reportar o buscar a una persona desaparecida.
2. **Voluntarios y rescatistas** — ver necesidades cercanas y atenderlas.
3. **Coordinadores** — priorizar, asignar y generar reportes de situación.

### Reglas de oro

1. **Offline primero.** Lo esencial funciona sin conexión; lo que registres se
   guarda y se sincroniza solo cuando vuelve la señal.
2. **Pedir ayuda nunca exige cuenta ni internet.** Es anónimo e inmediato.
3. **La IA solo sugiere; siempre confirma una persona.** Nada se asigna ni se
   resuelve automáticamente.
4. **Protege a las personas vulnerables.** Mínimos datos personales; ubicación y
   contacto individuales no son públicos.
5. **No hacer daño con datos viejos o falsos.** Todo lleva fecha y caducidad.
6. **Degradar con dignidad.** Nada se rompe sin GPS, sin permisos o sin IA.
7. **Español primero.** Inglés como opción.
8. **Interoperar.** Exportar formatos humanitarios estándar (HXL CSV, GeoJSON).

### Cómo ejecutar (local)

```bash
npm install
cp .env.example .env.local   # rellena las claves de Supabase
npm run dev                  # http://localhost:3000
```

La guía completa de despliegue (Supabase, Vercel, IA y rutas auto-alojadas) está
en la sección **Deploy** más abajo, en inglés.

---

## 🇬🇧 English

### What it is

Faro is an **offline-first**, installable web app (PWA) for three kinds of users,
often on cheap phones with poor signal: people who need help, volunteers, and
coordinators. The lifesaving core — send an SOS, find the nearest water/shelter,
report a hazard — works with **zero connectivity**; writes queue locally in
IndexedDB and sync when a connection returns.

### Golden rules (summary)

Offline-first · asking for help never requires a login or internet · AI only
suggests, a human always confirms · protect vulnerable people (minimize PII,
enforce RLS) · don't present stale/unverified data as fact · degrade gracefully ·
Spanish-first · interoperate with standard humanitarian formats.

See [`SECURITY.md`](./SECURITY.md) for the privacy/data-handling model and the
results of the RLS audit.

### Tech stack

Next.js 16 (App Router, TypeScript strict) · React 19 · PWA via Serwist
(Workbox) · Dexie/IndexedDB outbox for offline writes · Supabase (Postgres, Auth,
RLS) · Tailwind CSS · custom cookie-based i18n (es/en, no dependency) · an
interactive Leaflet map on OpenStreetMap tiles (no API key), with Google Maps
directions deep-links. **Optional, fully self-hosted, zero-API-cost** add-ons:
Ollama (AI triage suggestions) and OSRM (responder ETAs). Free tiers throughout.

### Status

MVP (M0–M8) and the self-hostable Phase 2 layer are **complete**:

- ✅ Anonymous SOS, hazard, and missing-person reports (offline-first)
- ✅ Public map of help/hazards, volunteer & coordinator dashboards
- ✅ Bilingual (es default, en toggle), a11y baseline
- ✅ HXL CSV + GeoJSON export (`/api/export/{resources|hazards|needs}`)
- ✅ Self-hosted AI triage (Ollama) and responder ETAs (OSRM) — both no-op
  cleanly when their box isn't configured
- ⏸️ SMS intake — deliberately not built (can't be free/self-hosted); see
  `.env.example`

### Quality checks

```bash
npm run typecheck     # strict TypeScript
npm run lint          # ESLint
npm run format:check  # Prettier
npm test              # Vitest unit tests
npm run build         # production build (emits the service worker)
```

---

## Deploy

### 1. Database — Supabase (free tier)

The entire security model lives in Postgres (RLS), so the database is the part to
get right.

```bash
# Install the Supabase CLI: https://supabase.com/docs/guides/cli
supabase login
supabase link --project-ref <your-project-ref>

# Push the schema: 10 ordered migrations create tables, RLS policies,
# SECURITY DEFINER role helpers, the PII-free public views, and audit triggers.
supabase db push

# CRITICAL: prove the security model on the real instance before any user
# touches it. This asserts anon cannot read needs/missing_persons/profiles,
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

### 2. Frontend — Vercel (free tier)

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

### 3. Optional self-hosted AI triage — Ollama (zero API cost)

The coordinator dashboard shows a "Sugerencia IA — verificar" chip when a local
model disagrees with a citizen's category/urgency. AI **only suggests**; a human
verifies (Golden Rule #3). Leave `OLLAMA_URL` unset and the feature stays hidden.

```bash
# On a box reachable by the Next.js server (a VPS, a GPU machine, or a laptop):
# install Ollama → https://ollama.com
ollama pull qwen2.5:7b     # good multilingual (Spanish) instruct model; ~7B
# Then set OLLAMA_URL=http://<that-box>:11434 and OLLAMA_MODEL=qwen2.5:7b
```

Smaller hardware: `qwen2.5:3b`. The model never leaves your infrastructure, and
report text is never sent to a third party.

### 4. Optional self-hosted routing — OSRM (zero API cost)

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
a `~` (Golden Rule #5: don't present stale data as fact).

### Contributing

Issues and PRs welcome. Conventional commits. Run typecheck + lint + test + build
before opening a PR; CI enforces them. If you change RLS or any public surface,
update and re-run `supabase/tests/rls_test.sql`.

## License

MIT — see [`LICENSE`](./LICENSE). Built so that, when everything else is broken,
this still works.
