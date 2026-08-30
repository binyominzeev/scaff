# scaff (v0.1)

Egy `.projectspec.md` fájlból generál kész Next.js (App Router) vagy Vite+React projekt-vázat:
package.json, tsconfig, tailwind config, Prisma schema + API route stubok (ha van adatbázis),
oldal-stubok a "pages" blokkból, valamint AGENTS.md / CLAUDE.md a korlátokkal és a fejlesztési
sorrenddel, hogy a VS Code-os fine-tuning fázisban a Copilot / Claude Code is lássa ezeket.

## Telepítés

```bash
cd scaff
npm install
```

## Használat

```bash
node scaffold.mjs <path-to-projectspec.md> [outputDir]
```

Példa a mellékelt teszt-specekkel:

```bash
node scaffold.mjs examples-community-calendar.projectspec.md my-calendar-app
node scaffold.mjs examples-interval-trainer.projectspec.md my-pwa-app
```

Ha az `outputDir`-t nem adod meg, a spec `project.name` mezője alapján jön létre a mappa a
jelenlegi könyvtárban.

## A `.projectspec.md` formátum

A formátum részletes leírása és a JSON Schema a korábban kapott `projectspec-v0.1` csomagban van
(`PROJECTSPEC-FORMAT.md`, `projectspec.schema.json`, `chatgpt-system-prompt.md`). Ez a CLI a
`projectspec.schema.json`-t használja validációra minden futtatáskor.

## Mit generál

- **Next.js App Router ág** (`stack.framework: nextjs-app-router`): package.json, tsconfig,
  next.config.ts, eslint config, Tailwind (ha kérted), `app/layout.tsx` + `app/page.tsx`,
  oldal-stubok minden "pages" bejegyzésre, `prisma/schema.prisma` (a spec Prisma blokkjából),
  `lib/prisma.ts`, REST API route stubok minden Prisma modellre (`app/api/<resource>/route.ts`),
  docker-compose.yml (ha Postgres + docker deployment), .env.example, .gitignore.
- **Vite+React ág** (`stack.framework: vite-react`): package.json, vite.config.ts, tsconfig
  fájlok, index.html, `src/main.tsx`, `src/App.tsx`, react-router útvonalak + oldal-stubok (ha
  `stack.router: react-router`), vite-plugin-pwa bekötve (ha `pwa.enabled: true`).
- **Mindkét ágon**: `AGENTS.md` + `CLAUDE.md` (projekt-kontextus, stack, adatmodell, korlátok,
  fejlesztési sorrend) és `README.md` (setup lépések, oldalak listája).

## Amit tudatosan NEM csinál (v0.1)

- Nincs AI-hívás a generálás közben — tisztán determinisztikus template-motor.
- Nem futtat `npm install`-t vagy `prisma migrate`-et helyetted — ezeket a kiírt "következő
  lépések" alapján neked kell futtatnod.
- Az auth/AI-integráció csak dependency-szinten és az AGENTS.md-ben jelenik meg (jelzi, hogy
  kell), a tényleges implementációt a VS Code-os fine-tuning fázisra hagyja — szándékosan, hogy
  ne generáljon feleslegesen bonyolult, kitalált kódot olyan részekhez, amik projektenként úgyis
  nagyon eltérnek.

## Ismert korlátok / lehetséges bővítési pontok

- Az API route stubok csak GET/POST-ot generálnak, PATCH/DELETE-et még nem.
- A Vite ág PWA manifestje minimális, ikonokat nem generál.
- Ha egy repódban tRPC vagy GraphQL API stílus merülne fel, azt még nem támogatja a schema —
  bővíteni kell a `projectspec.schema.json`-t és a generátort.
