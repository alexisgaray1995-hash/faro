# Security & Privacy — Faro

Faro handles data about people in danger. A leak can cost lives. This document
describes how we minimize that risk. It evolves with the project; the full
threat model and a hardened Content-Security-Policy land in milestone **M8**.

## Principles

- **Assume the database can leak.** Design so that a leak does the least harm.
- **Minimize PII.** Asking for help is anonymous by default. Contact details and
  precise individual locations are optional and treated as sensitive.
- **Least privilege.** Row-Level Security (RLS) is the primary access control,
  enforced in Postgres (added in M1) — not just in the UI.
- **No tracking, no ads, ever.** No third-party analytics or advertising SDKs.

## Sensitive data handling (design intent — enforced from M1)

- **Needs (SOS):** anyone, including anonymous users, may create one. Public reads
  exclude `contact` and blur/round or hide the exact `lat/lng` of an individual.
  Only verified `volunteer`/`coordinator` roles see full detail.
- **Missing persons:** detail is gated to `coordinator`+; the public sees only a
  limited "info" view.
- **Audit:** every status change, assignment, verification, and AI suggestion is
  written to an append-only `audit_log` for accountability.
- **Data decay:** reports carry timestamps and `expires_at`; stale data is shown
  as such and expires. Unverified info is never presented as confirmed.

## Secrets

- No secrets in the repo. All keys come from environment variables; see
  `.env.example`.
- Only `NEXT_PUBLIC_*` variables reach the browser. The Supabase service-role key
  and the Anthropic API key are server-side only.

## Transport & headers

- Baseline security headers are set in `next.config.mjs`
  (`X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`,
  `Permissions-Policy`). Geolocation is intentionally allowed (GPS-based SOS).

## Reporting a vulnerability

Please open a private report rather than a public issue. Until a dedicated
security contact is published, contact the maintainers and allow reasonable time
to remediate before any public disclosure.
