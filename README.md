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
8. **Interoperar.** Exportar/importar formatos humanitarios estándar.

### Cómo ejecutar (local)

```bash
npm install
cp .env.example .env.local   # rellena las claves cuando estén disponibles
npm run dev                  # http://localhost:3000
```

Comprobaciones de calidad:

```bash
npm run typecheck     # TypeScript estricto
npm run lint          # ESLint
npm run format:check  # Prettier
npm run build         # build de producción (genera el service worker)
```

### Estado del proyecto

**M0 (completado):** estructura, PWA offline, tooling, CI, página de inicio en
español. Próximo: **M1** modelo de datos + RLS, **M2** motor de sincronización
offline, **M3** SOS, **M4** mapa, **M5** reportes, **M6** panel de coordinación.

---

## 🇬🇧 English

### What it is

Faro is an **offline-first**, installable web app (PWA) for three kinds of users,
often on cheap phones with poor signal: people who need help, volunteers, and
coordinators. The lifesaving core — send an SOS, find the nearest water/shelter,
report a hazard — works with **zero connectivity**; writes queue locally and sync
when a connection returns.

### Golden rules (summary)

Offline-first · asking for help never requires a login or internet · AI only
suggests, a human always confirms · protect vulnerable people (minimize PII,
enforce RLS) · don't present stale/unverified data as fact · degrade gracefully ·
Spanish-first · interoperate with standard humanitarian formats.

See `SECURITY.md` for privacy and data-handling details.

### Run locally

```bash
npm install
cp .env.example .env.local
npm run dev            # http://localhost:3000
npm run build          # production build (emits the service worker)
```

### Tech stack

Next.js 16 (App Router, TypeScript strict) · React 19 · PWA via Serwist
(Workbox) · Dexie/IndexedDB + outbox sync (M2) · Supabase (Postgres, Auth, RLS,
Realtime) (M1) · MapLibre GL + Protomaps PMTiles for offline maps (M4) ·
Tailwind CSS · next-intl (es/en) · Anthropic Claude API, server-side only
(Phase 2). Free tiers throughout.

### Deploy

Frontend on **Vercel**, backend on **Supabase** (both free tier). Set the
environment variables from `.env.example` in the Vercel project. Detailed deploy
steps are added as M1 wires up Supabase.

### Contributing

Issues and PRs welcome. Conventional commits. Run typecheck + lint + build before
opening a PR; CI enforces them.

## License

MIT — see [`LICENSE`](./LICENSE). Built so that, when everything else is broken,
this still works.
