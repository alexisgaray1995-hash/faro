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

## 5. Abuse & flood resistance (edge, not database)

Anonymous SOS / hazard / missing-person submits go straight to PostgREST as the
`anon` role — there is no server choke point, by design (Golden Rule 2: "I need
help" is never behind a login or a server we control). That makes write-flood
defense an **edge** concern, and deliberately **not** a database rate limit:

> A DB-level per-IP throttle would harm real victims. In Venezuela most users
> share IPs via CGNAT, and a genuine mass-casualty event looks exactly like a
> flood — high volume, geographically clustered. Any threshold low enough to
> stop a script is low enough to block a shelter full of real people. So we do
> **not** rate-limit victim writes in Postgres; we absorb floods at the edge,
> where real client IPs and behavioral signals exist, and clean up after the
> fact in the DB.

What's already in place (in-repo, victim-safe):

- **Idempotency** — `needs`, `hazards`, `missing_persons` each have a `UNIQUE`
  `client_token`, so retried offline-outbox flushes can't duplicate.
- **`max_rows = 1000`** (`config.toml [api]`) caps read/export payloads.
- **Coordinator hard-delete** (migration 22) pulls obvious abuse immediately.
- **`purge_expired()`** (migration 21) ages out stale/abandoned PII so a flood
  can't accumulate forever.

What to configure at deploy (platform, free-tier friendly):

1. **Turnstile / hCaptcha in front of the submit forms.** Cloudflare Turnstile
   is free and invisible for most users; verify the token in a thin Edge
   Function (or Vercel middleware) that proxies the insert, and fail **open** on
   a captcha-service outage — never block a real SOS because the captcha
   provider is down.
2. **Cloudflare (free) in front of the Supabase + Vercel hostnames.** Enable
   "Under Attack" mode only during an actual flood; set a generous rate rule
   (e.g. per-IP burst in the hundreds/min) that trips a JS challenge rather than
   a hard block, so CGNAT crowds get a challenge, not a wall.
3. **Supabase auth rate limits** (`config.toml [auth.rate_limit]`) already cap
   sign-in/OTP abuse; leave them on. These cover responder accounts, not the
   anonymous write path.

The ordering matters: a challenge that a human passes (captcha / JS challenge)
is acceptable; a silent drop of a victim's report is not.

## 6. Responder account security

Anonymous victims never log in, but **responder** accounts (volunteers,
coordinators) hold the keys to victim PII and to blessing trust — so they are
the high-value target. Hardening lives in `config.toml [auth]` and the Supabase
dashboard:

- **Strong passwords (in repo).** `minimum_password_length = 10` and
  `password_requirements = "lower_upper_letters_digits"` are set, so weak
  responder passwords are rejected at signup/reset.
- **TOTP MFA capability (in repo).** `[auth.mfa.totp]` is enabled, so accounts
  can enrol an authenticator app.
- **Leaked-password protection (dashboard).** Enable
  *Authentication → Policies → "Check against HaveIBeenPwned"* on the hosted
  project — it's not exposed in local `config.toml`. This blocks passwords known
  from breaches, the cheapest credential-stuffing defense.

**Follow-up — enforce MFA for coordinators (AAL2).** Enabling TOTP makes MFA
*available*, not *required*. Full enforcement needs two pieces this build does
not yet ship:

1. an enrolment screen in the coordinator dashboard
   (`supabase.auth.mfa.enroll`/`challenge`/`verify`), and
2. an `aal2` check in `src/proxy.ts` for `/coordinador` (read the
   `aal` claim from the session and redirect un-stepped-up coordinators to the
   enrol/challenge flow).

Do **not** add the `proxy.ts` gate before the enrolment screen exists, or you
lock every coordinator out with no way to enrol. Ship the screen first, then the
gate.

## 7. Content-Security-Policy — what's shipped vs. deferred

`next.config.mjs` ships the **safe, script-free** subset of CSP, applied to all
routes:

```
frame-ancestors 'none'; base-uri 'self'; form-action 'self';
object-src 'none'; frame-src 'none'
```

This blocks clickjacking, base-tag and form hijacking, and plugin/iframe
injection — none of which can break script, style, or map-tile loading, so it
needs no browser verification.

**Deferred on purpose: a strict `script-src` nonce CSP.** It is *not* shipped,
and that is a deliberate risk call, not an oversight:

- The XSS surface it would defend is near-zero — the app has **no**
  `dangerouslySetInnerHTML`, no inline `<script>`, no `eval`/`new Function`,
  React escapes all output, and every public view is PII-free.
- Getting it wrong **bricks script loading for victims** — unacceptable in a
  disaster, far worse than the marginal XSS hardening it buys.
- It can't be verified in this repo: it needs a per-request nonce in middleware,
  a refactor of the auth-critical `proxy.ts`, and `'strict-dynamic'` interaction
  with Next's chunk loader and the Serwist service-worker registration — all of
  which must be confirmed in a real browser against a **production** build
  (`next build && next start`), since a dev server needs `'unsafe-eval'` for HMR
  and can't validate the production policy.

**Recipe for when a staging env exists** (follow Next.js's official CSP guide):

1. Split `src/proxy.ts` so the **CSP/nonce header** is set on *all* routes while
   the **auth redirect** stays scoped to the protected matcher — today they're
   fused, and widening the matcher would redirect every public page to
   `/acceso`. Do this first.
2. Per request, generate a nonce, set
   `script-src 'self' 'nonce-<n>' 'strict-dynamic'` (plus the §7 static
   directives, an `img-src` allowlist for the OSM tile host, and a `connect-src`
   allowlist for the Supabase URL), and pass the nonce via an `x-nonce` request
   header. Keep the policy permissive (or report-only) in `NODE_ENV !==
   'production'`.
3. Load a production build in a browser, open the console, and iterate until
   **zero** CSP violations across: home, SOS submit, the Leaflet map (tiles +
   markers), responder login, and the coordinator dashboard. Only then remove
   the static CSP from `next.config.mjs` (middleware now owns it).

Start in `Content-Security-Policy-Report-Only` mode so violations are logged but
nothing is blocked; promote to enforcing only once the report is clean.
