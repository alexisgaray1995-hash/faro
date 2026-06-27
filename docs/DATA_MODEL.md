# Data model

Postgres schema, built by the ordered migrations in `supabase/migrations/`.
Row-Level Security (RLS) is the primary access control — the policies _are_ the
security model. See [`../SECURITY.md`](../SECURITY.md) for the privacy rationale
and [`ARCHITECTURE.md`](./ARCHITECTURE.md) for how the app uses these tables.

## Tables

| Table             | Who writes                                              | Who reads                                | Notes                                                                                                                                   |
| ----------------- | ------------------------------------------------------- | ---------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| `profiles`        | trigger on signup (volunteer); self (own); coordinators | responders                               | Responder roster. Citizens are anonymous — never in here. Roles are coordinator-granted, never self-claimed.                            |
| `needs`           | anyone (anon SOS)                                       | responders (full); anyone (blurred view) | The SOS table. PII (`contact_*`) responder-only. `claimed_by` for atomic self-claim. 24h `expires_at`.                                  |
| `resources`       | responders                                              | responders (full); anyone (precise view) | Help points (water/food/shelter/clinic/charging/distribution). Precise location is intentional — citizens need to find them. 7d expiry. |
| `hazards`         | anyone (anon)                                           | responders (full); anyone (blurred view) | Danger warnings. 48h expiry.                                                                                                            |
| `missing_persons` | anyone (anon)                                           | responders **only**                      | Most sensitive. **No public view at all.**                                                                                              |
| `assignments`     | coordinators                                            | assigned responder + coordinators        | Coordinator-blessed match of responder→need.                                                                                            |
| `audit_log`       | triggers only                                           | coordinators only                        | Append-only accountability trail.                                                                                                       |

## Enforcement mechanisms

- **RLS policies** gate every row by role (`app_role()`, `is_coordinator()`,
  `is_responder()` — `SECURITY DEFINER` helpers).
- **Verification guard triggers** (`guard_*_verification`): only coordinators can
  set `verification = 'verified'`; the trigger stamps `verified_by`/`verified_at`.
- **Public views** (`public_needs`, `public_resources`, `public_hazards`) strip
  contact PII and blur individual coordinates to 3 decimals (~111 m) via
  `blur_coord()`. Clients read these views, never the base tables.
- **Least-privilege grants**: `anon` can only INSERT SOS/hazard/missing-person
  rows and SELECT the public views — nothing else.
- **Idempotency**: unique `client_token` on `needs`/`hazards`/`missing_persons`
  makes offline replay safe.

## Proving it

`supabase/tests/rls_test.sql` (pgTAP, 20 assertions) runs with `supabase test
db` and must be all-green. It asserts, in the database itself, that anon can ask
for help but cannot read PII, cannot self-verify, cannot forge a profile; that a
volunteer cannot escalate their role or verify; and that the atomic claim can't
be stolen.
