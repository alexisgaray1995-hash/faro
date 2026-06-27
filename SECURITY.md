# Security & Privacy — Faro

Faro handles data about people in danger. A leak can cost lives. This document
describes how we minimize that risk. The table-by-table enforcement is in
[`docs/DATA_MODEL.md`](./docs/DATA_MODEL.md); a hardened Content-Security-Policy
is the next planned hardening step.

## Principles

- **Assume the database can leak.** Design so that a leak does the least harm.
- **Minimize PII.** Asking for help is anonymous by default. Contact details and
  precise individual locations are optional and treated as sensitive.
- **Least privilege.** Row-Level Security (RLS) is the primary access control,
  enforced in Postgres — not just in the UI — and proven by a 20-assertion pgTAP
  suite (`supabase test db`).
- **No tracking, no ads, ever.** No third-party analytics or advertising SDKs.
  Two unavoidable third-party requests exist and are by design: map tiles load
  from OpenStreetMap (`tile.openstreetmap.org`), which sees the viewport (rough
  area, not identity), and the "Directions" link opens Google Maps only on an
  explicit tap. No user data, report content, or PII is sent to either.

## Sensitive data handling (enforced in Postgres)

- **Needs (SOS):** anyone, including anonymous users, may create one. Public reads
  exclude `contact` and blur/round or hide the exact `lat/lng` of an individual.
  Only verified `volunteer`/`coordinator` roles see full detail.
- **Missing persons:** the most sensitive table. Reportable anonymously, but
  readable **only by authenticated responders** — there is intentionally **no
  public view at all**. Assume the DB can leak and minimize blast radius.
- **Free-text descriptions are public.** The `description` on needs/hazards is
  shown via the public views, so the SOS and hazard forms explicitly warn users
  not to put personal data there; name/phone live in a separate, responder-only
  contact section.
- **Audit:** every status change, assignment, and verification is written to an
  append-only `audit_log` (trigger-only writes, coordinator-only reads).
- **Data decay:** reports carry timestamps and `expires_at`; stale data is shown
  as such and expires. Unverified info is never presented as confirmed.

## Secrets

- No secrets in the repo. All keys come from environment variables; see
  `.env.example`.
- Only `NEXT_PUBLIC_*` variables reach the browser. The Supabase service-role key
  is server-side only and is not required at runtime.
- The AI (Ollama) and routing (OSRM) layers are **self-hosted** — no third-party
  API keys, and report data never leaves your infrastructure. `/api/route` is
  gated to authenticated responders so it can't be used as an open proxy.

## Transport & headers

- Baseline security headers are set in `next.config.mjs`
  (`X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`,
  `Permissions-Policy`). Geolocation is intentionally allowed (GPS-based SOS).

## Reporting a vulnerability

Please open a private report rather than a public issue. Until a dedicated
security contact is published, contact the maintainers and allow reasonable time
to remediate before any public disclosure.
