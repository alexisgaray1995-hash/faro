<div align="center">

# Faro 🪔

**Una herramienta gratuita y de código abierto para pedir y coordinar ayuda en
emergencias — funcione o no el internet.**
_A free, open-source tool to request and coordinate emergency help — with or
without the internet._

[Architecture](./docs/ARCHITECTURE.md) ·
[Data model](./docs/DATA_MODEL.md) ·
[Deployment](./docs/DEPLOYMENT.md) ·
[Security](./SECURITY.md) ·
[Contributing](./CONTRIBUTING.md) ·
[Changelog](./CHANGELOG.md)

</div>

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
en [`docs/DEPLOYMENT.md`](./docs/DEPLOYMENT.md).

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

### Tech stack

Next.js 16 (App Router, TypeScript strict) · React 19 · PWA via Serwist
(Workbox) · Dexie/IndexedDB outbox for offline writes · Supabase (Postgres, Auth,
RLS) · Tailwind CSS · custom cookie-based i18n (es/en, no dependency) · an
interactive Leaflet map on OpenStreetMap tiles (no API key), with Google Maps
directions deep-links. **Optional, fully self-hosted, zero-API-cost** add-ons:
Ollama (AI triage suggestions) and OSRM (responder ETAs). Free tiers throughout.

How it all fits together: [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md). The
database and security model: [`docs/DATA_MODEL.md`](./docs/DATA_MODEL.md) and
[`SECURITY.md`](./SECURITY.md).

### Status

MVP (M0–M8) and the self-hostable Phase 2 layer are **complete**:

- ✅ Anonymous SOS, hazard, and missing-person reports (offline-first)
- ✅ Public map of help/hazards, volunteer & coordinator dashboards
- ✅ Atomic need self-claim so two responders never work the same person
- ✅ Bilingual (es default, en toggle), a11y baseline
- ✅ HXL CSV + GeoJSON export (`/api/export/{resources|hazards|needs}`)
- ✅ Self-hosted AI triage (Ollama) and responder ETAs (OSRM) — both no-op
  cleanly when their box isn't configured
- ⏸️ SMS intake — deliberately not built (can't be free/self-hosted); see
  `.env.example`

Full history in [`CHANGELOG.md`](./CHANGELOG.md).

### Quality checks

```bash
npm run typecheck     # strict TypeScript
npm run lint          # ESLint
npm run format:check  # Prettier
npm test              # Vitest unit tests
npm run build         # production build (emits the service worker)
```

### Deploy & contribute

Free end to end on Supabase + Vercel — see [`docs/DEPLOYMENT.md`](./docs/DEPLOYMENT.md).
Contributions welcome; read [`CONTRIBUTING.md`](./CONTRIBUTING.md) first.

## License

MIT — see [`LICENSE`](./LICENSE). Built so that, when everything else is broken,
this still works.

---

<div align="center">

**Faro** · by **Abby Systems**
_When everything else is broken, this still works._

</div>
