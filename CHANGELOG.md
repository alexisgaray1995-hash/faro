# Changelog

All notable changes to Faro are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the project aims to
follow [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Atomic self-claim of needs on the volunteer panel ("Tomar"/"Liberar"), so two
  responders can't be sent to the same person. Enforced by a conditional update
  on `claimed_by is null`, with RLS tests proving the race is safe.
- Documentation set: `docs/ARCHITECTURE.md`, `docs/DATA_MODEL.md`,
  `docs/DEPLOYMENT.md`, plus `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`, and this
  changelog.

## [0.1.0] — MVP (M0–M8) + self-hostable Phase 2

The complete lifesaving core, offline-first throughout.

### Added

- **Anonymous reporting** — SOS needs, hazards, and missing-person reports, with
  no login or connectivity required; writes queue in an IndexedDB outbox and sync
  when signal returns (idempotent via `client_token`).
- **Find help** — public Leaflet/OpenStreetMap map of resources, hazards, and
  needs (no API key), with Google Maps directions deep-links and a read cache for
  offline viewing.
- **Responder dashboards** — volunteer queue (`/panel`) and coordinator console
  (`/coordinador`) for verifying, assigning, and triaging needs.
- **Security model in Postgres** — Row-Level Security across all tables,
  `SECURITY DEFINER` role helpers, verification-guard triggers, append-only audit
  log, PII-free public views with blurred coordinates, and a 20-assertion pgTAP
  proof (`supabase test db`).
- **Bilingual** — Spanish-first with an English toggle (custom, dependency-free
  cookie i18n), plus an accessibility baseline (visible focus, no color-only
  signals, reduced-motion support).
- **Humanitarian export** — HXL CSV and GeoJSON at `/api/export/{dataset}`.
- **Optional self-hosted add-ons** — Ollama AI triage suggestions and OSRM
  responder ETAs, both zero-API-cost and no-op when not configured.

### Deliberately not built

- SMS intake — can't be done free/self-hosted; documented in `.env.example`.

[Unreleased]: https://github.com/abby-systems/faro/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/abby-systems/faro/releases/tag/v0.1.0
