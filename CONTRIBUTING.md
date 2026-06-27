# Contributing to Faro

Thank you for helping. Faro is a tool for people in danger, so the bar is
reliability and safety over features. Small, well-tested changes win.

## Ground rules

- **Read the Golden Rules** in the [README](./README.md) first. A change that
  breaks one (e.g. putting "ask for help" behind a login, or exposing PII) will
  not be merged, however nice it looks.
- **Spanish-first.** User-facing strings start in `es` (`src/lib/i18n.ts`); `en`
  is the toggle.
- **Be kind.** See [`CODE_OF_CONDUCT.md`](./CODE_OF_CONDUCT.md).

## Workflow

1. Fork and branch from `main`.
2. Make the change. Keep diffs small and focused.
3. Run the full gate locally — all must be green:

   ```bash
   npm run typecheck     # strict TypeScript
   npm run lint          # ESLint
   npm run format:check  # Prettier
   npm test              # Vitest unit tests
   npm run build         # production build (emits the service worker)
   ```

4. **If you touch RLS or any public surface**, update and re-run the database
   security proof:

   ```bash
   supabase test db      # supabase/tests/rls_test.sql — must be all green
   ```

5. Open a PR with a [Conventional Commits](https://www.conventionalcommits.org/)
   title (`feat:`, `fix:`, `docs:`, `test:`, `refactor:`, `chore:`). CI runs the
   same gate.

## What to work on

Good first contributions and known shortcuts are tracked as `ponytail:` comments
in the code (deliberate simplifications with a named upgrade path) — grep for
them:

```bash
grep -rn "ponytail:" src supabase
```

The current high-value ones are listed in the project roadmap (see the README
status section).

## Reviewing

Reliability and the security model first; aesthetics second. Anything that could
present stale or unverified data as fact, or leak PII, is a blocker.
