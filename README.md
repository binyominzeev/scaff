# scaff

Egy `.projectspec.md` fájlból generál kész Next.js (App Router) vagy Vite+React projekt-vázat.

**Újdonság v0.2-ben:** ha a spec tartalmaz egy `# ui-screens` blokkot, a CLI már nem üres
oldal-stubokat rak le, hanem **valódi, működő UI-t** — szerver-komponens listanézeteket
(Prisma-lekérdezéssel), kliens-komponens form-okat (create/update, prefill-lel), törlés-gombokat,
egy közös `Nav`-ot, és mindezt egy saját, előre megírt, elegáns `components/ui/` komponens-kicsomagolt
(Button, Input, Table, Card, Nav) tetejére építve.

## Design looks & layout archetypes

A front matter opcionális `design.look` / `design.components` mezőivel a generált UI kinézete
variálható. **Ez a szekció az EGYETLEN megbízható forrás arra, hogy mi van ténylegesen
implementálva a motorban (valós Tailwind-renderelés) és mi csak spec-szintű, leíró érték
(fallback rendereléssel)** — nem kell forráskódot böngészni hozzá. Forrás: `lib/designCatalog.mjs`
`implemented` flag-jei; ha ott változás történik, ezt a táblázatot **ugyanabban a
commit/PR-ban** frissíteni kell, mert a kettő szinkronban tartása kézi (nincs automatikus
ellenőrzés a kettő között).

Ha a spec nem ad meg `design`-t, a kimenet a `minimal-mono` + `dense-table` alapértelmezésre esik
vissza — ez pontosan a korábbi (design-katalógus előtti) hardcoded kinézet, tehát régi specek
kimenete változatlan marad.

### `design.look` (20 db, mindegyik ténylegesen implementálva)

| id | Leírás | Státusz |
|---|---|---|
| `minimal-mono` | Restrained monochrome palette, generous whitespace, sharp/barely-rounded corners, sans-serif. | ✅ Implemented |
| `playful-cards` | Rounded cards, saturated pastel accents, friendly icons/badges, soft shadows. | ✅ Implemented |
| `editorial-serif` | Serif/mixed typography, narrow reading column, minimal chrome, content-first. | ✅ Implemented |
| `dense-dashboard` | Tight spacing, small type, high information density, table-centric. | ✅ Implemented |
| `warm-community` | Warm palette, avatar-forward, larger touch targets, human-centered layout. | ✅ Implemented |
| `brutalist-raw` | Unstyled borders, harsh contrast, exposed grid lines, deliberately unpolished. | ✅ Implemented |
| `glassmorphic` | Frosted translucent panels, background blur, soft gradients, layered depth. | ✅ Implemented |
| `dark-terminal` | Dark background, monospace accents, neon/muted-green highlights, dev-tool feel. | ✅ Implemented |
| `soft-neumorph` | Subtle embossed shadows, low-contrast surfaces, tactile button feel. | ✅ Implemented |
| `corporate-clean` | Blue/gray palette, structured grid, conservative typography, low noise. | ✅ Implemented |
| `retro-pixel` | Pixel-art icons, blocky borders, saturated primary colors, 8-bit nostalgia. | ✅ Implemented |
| `luxury-serif` | Black/gold or deep-tone palette, elegant serif headings, generous negative space. | ✅ Implemented |
| `paper-texture` | Off-white bg, subtle paper/grain texture, ink-like typography, print-inspired. | ✅ Implemented |
| `bold-brutalist-color` | Oversized type, clashing bright colors, thick black outlines, high energy. | ✅ Implemented |
| `scandi-minimal` | Muted neutrals, thin-weight sans-serif, lots of air, understated accents. | ✅ Implemented |
| `medical-clinical` | Cool blues/whites, high legibility, clear iconography, trustworthy/sterile. | ✅ Implemented |
| `kids-friendly` | Rounded shapes, bright primary colors, large tap targets, playful illustrations. | ✅ Implemented |
| `gradient-vivid` | Bold multi-color gradients as backgrounds/buttons, high-energy modern SaaS feel. | ✅ Implemented |
| `newsprint` | Black-and-white, serif headlines, column layout, classic newspaper structure. | ✅ Implemented |
| `glass-dashboard-dark` | Dark mode with glassmorphic panels, glowing accents, data-viz oriented. | ✅ Implemented |

### `design.components` (20 db, ebből 6 valós renderelés, 14 fallback)

| id | Leírás | Státusz |
|---|---|---|
| `dense-table` | Classic row/column table, sortable headers, scanning many records. | ✅ Implemented (own rendering) — default |
| `card-grid` | Records as a grid of equal-size cards, one record per card. | ✅ Implemented (own rendering) |
| `stacked-list` | Simple vertical list of rows, minimal decoration, one record per line. | ✅ Implemented (own rendering) |
| `split-detail` | List left, selected record detail right (master-detail). | ↩️ Falls back to dense-table |
| `bento` | Grid of variable-sized cells, one large anchor block + smaller ones. | ↩️ Falls back to dense-table |
| `two-column-reader` | Narrow centered text column, minimal surrounding UI. | ✅ Implemented (own rendering) |
| `form-focused` | Single centered column form, no distractions. | ↩️ Falls back to dense-table |
| `tabbed-sections` | Content split across horizontal tabs. | ↩️ Falls back to dense-table |
| `sidebar-shell` | Persistent left sidebar nav + main content area. | ↩️ Falls back to dense-table |
| `kanban-columns` | Multiple vertical lanes, records as draggable-style cards. | ↩️ Falls back to dense-table |
| `timeline-feed` | Vertically scrolling chronological feed, newest first. | ↩️ Falls back to dense-table |
| `hero-plus-grid` | Large hero block at top + grid of secondary items below. | ↩️ Falls back to dense-table |
| `carousel-strip` | Horizontally scrollable row of cards, one focus item visible. | ↩️ Falls back to dense-table |
| `accordion-list` | Collapsible expandable rows, detail revealed on click. | ✅ Implemented (own rendering) |
| `gallery-mosaic` | Irregular image/content grid, visual variety over uniform rows. | ↩️ Falls back to dense-table |
| `stat-summary-band` | Row of key numeric stats at top, detail content below. | ✅ Implemented (own rendering) |
| `calendar-grid` | Month/week grid layout for date-based records. | ↩️ Falls back to dense-table |
| `inbox-triple-pane` | Three-column layout: folders, item list, item detail. | ↩️ Falls back to dense-table |
| `wizard-steps` | Linear step-by-step form flow with progress indicator. | ↩️ Falls back to dense-table |
| `full-bleed-showcase` | Edge-to-edge large visual blocks, minimal text, presentation-style. | ↩️ Falls back to dense-table |

`↩️ Falls back to dense-table` azt jelenti: a spec-ben érvényes, választható enum-érték (a
generáló LLM kifejezheti vele a tervezői szándékot), de a scaffold motor jelenleg a
`dense-table` renderelési stratégiával generálja le, amíg saját implementációt nem kap.


## Telepítés

```bash
cd scaff
npm install
```

## AI-alapú tervezés (ChatGPT)

Amikor a tervezőbeszélgetés végére értél, és készen állsz a `.projectspec.md` fájl
tényleges legenerálására.

Kövesd a `WORKFLOW.md`-ben leírt 5 lépést — röviden: kérj egy tömör összefoglalót a
tervezőbeszélgetés végén, majd **nyiss egy vadonatúj beszélgetést**, és abba illeszd be a
`chatgpt-generator-prompt.md` tartalmát + az összefoglalót egyetlen üzenetben. Ez a prompt nem
beszélget, csak a kész fájlt adja vissza — így elkerülhető, hogy egy hosszú tervezőbeszélgetés
végén a formátum-instrukció "felhígulva" pontatlan kimenetet eredményezzen.

## Használat

```bash
node scaffold.mjs <path-to-projectspec.md> [outputDir]
```

Példák a mellékelt teszt-specekkel:

```bash
# v0.1 stílusú spec, üres oldal-stubokkal
node scaffold.mjs examples-community-calendar-v0.1.projectspec.md my-calendar-app

# v0.2 stílusú spec, teljes UI-val (ASCII wireframe-ekből generált oldalak)
node scaffold.mjs examples-community-calendar-v0.2.projectspec.md my-calendar-app-full

# Vite + React + PWA ág
node scaffold.mjs examples-interval-trainer.projectspec.md my-pwa-app
```

## Mit generál v0.2-ben (Next.js App Router ág)

- **Listanézetek** (`[Table: ...]`, `[List: ...]`): async szerver-komponens oldal, közvetlen Prisma
  lekérdezéssel (`findMany`, opcionális `where:` szűrővel egy route-paraméter alapján).
- **Részletnézetek** (`[Data: Model.findUnique({param})]` + `{field}` interpoláció a címben/szövegben):
  a rekordot a szerver-komponens tölti be, a `{field}` tokenek a tényleges mezőértékre cserélődnek.
- **Form-ok** (`[Button: Label -> Model.create()]` / `Model.update({param})`):
  - **create**: egyetlen kliens-komponens oldal (`"use client"`), saját state-tel, `POST /api/<resource>`-re küld.
  - **update**: szerver-komponens (`page.tsx`) tölti be a rekordot, egy colokált `form.tsx`
    kliens-komponens csinálja a szerkesztést, `PATCH /api/<resource>/<id>`-re küld, előtöltött
    mezőkkel.
- **Törlés** (`Model.delete({param})`): egy megosztott `DeleteButton` kliens-komponens, ami
  `DELETE /api/<resource>/<id>`-t hív és `router.refresh()`-eltet.
- **Navigáció** (`# navigation` blokk): egy közös `Nav` komponens minden oldalon, a `RootLayout`-ba
  beillesztve.
- **Elérhetőségi ellenőrzés**: minden generálás előtt lefut, és ha egy oldal sehonnan nincs
  belinkelve (sem a navigációból, sem másik oldal linkjéből), figyelmeztetést ír ki — de nem áll le.
- **API route-ok**: minden Prisma modellre `app/api/<resource>/route.ts` (GET lista, POST create) ÉS
  `app/api/<resource>/[id]/route.ts` (GET egy, PATCH, DELETE) — függetlenül attól, hogy a UI ténylegesen
  használja-e mindet, konzisztens REST felület végett.

## Mit generál v0.2-ben (Vite + React ág)

A Vite ág **csak a statikus részt** generálja teljesen (heading, inputok, navigációs
gombok/linkek) — az adatkötött elemek (`Table`/`List`/`Data` egy Prisma modellel) itt **még nem
támogatottak** a v0.2-ben, mert a valós projektjeidben (fitness PWA) ez a kombináció eddig nem
fordult elő, és a determinisztikus, AI-hívás nélküli generálás itt bonyolultabb lenne (nincs
szerver-komponens fogalom Vite-ban). Ha egy spec Vite ágon adatkötött elemet tartalmaz, a CLI egy
figyelmeztetést ír ki, és a régi, egyszerű oldal-stubokat generálja helyette.

## Tesztelve, ellenőrizve

Mindhárom mellékelt teszt-spec (v0.1 Next.js, v0.1 Vite+PWA, v0.2 Next.js+UI) generálás után:
- `tsc --noEmit` (Next.js) / `tsc -b --noEmit` (Vite): **0 hiba**
- `eslint .`: **0 hiba, 0 figyelmeztetés**
- Vite ág: valódi `vite build` production build is lefut, PWA service worker-rel együtt
- A generált kódban használt Prisma modell- és mezőnevek programozottan ellenőrizve, hogy
  megegyeznek a spec `data-model` blokkjában definiáltakkal

**Amit a sandbox környezet nem tudott ellenőrizni:** a `prisma generate` és `next build` teljes
lefutását, mert a hálózati house Prisma engine binárisainak CDN-je (`binaries.prisma.sh`) nincs az
elérhető domain-listán. Ez pusztán a tesztkörnyezet korlátja — a te gépeden ez simán le fog futni.

## Az `[Data: ...]` token — miért kellett hozzáadni

Menet közben kiderült, hogy ha egy képernyő címe `{field}`-et használ (pl. `{displayName}`), de a
képernyőn nincs olyan elem, ami explicit lekérné az adott modell egyetlen rekordját, a generátornak
nincs honnan tudnia, melyik rekordra gondolsz. A `[Data: Model.findUnique({param})]` token ezt teszi
explicitté — néma adatlekérés, nem renderel semmit, csak elérhetővé teszi a rekordot az
interpolációhoz. Lásd a `PROJECTSPEC-V0.2-EXTENSIONS.md`-t a részletekért.

## Auth opciók

- `auth.provider: "next-auth-credentials"` — minimál stub (`lib/auth.ts`), a tényleges next-auth
  bekötése a fejlesztőre marad.
- `auth.provider: "pocket-id-oidc"` — **csak a Next.js App Router ágon** teljes, működő Pocket ID /
  OIDC (Authorization Code + PKCE) login: `app/api/auth/*` Route Handlerek, httpOnly cookie session,
  `lib/auth.ts` szerver-oldali JWKS-verifikáció, `AuthProvider`/`useAuth()` React context, és egy
  `AuthControls` gomb a Nav-ban (vagy önállóan, ha nincs `# navigation` blokk). A Vite+React ágon ez a
  provider egyelőre figyelmeztetést kap és nem generál semmit (nincs backend a token-cseréhez). Lásd
  `AUTH_SETUP.md`-t a mögöttes minta teljes dokumentációjáért.

## Ismert korlátok / lehetséges bővítési pontok

- A Vite ág nem generál adatkötött UI-t (lásd fent).
- Egy képernyőn csak egy elsődleges modell támogatott (nincs több-modelles form egy oldalon).
- Nincs feltételes UI-elem, lapozás, rendezés, törlés-megerősítő dialógus — mind szándékosan
  kimaradt, hogy a scaffold-lépés determinisztikus és AI-hívás nélküli maradjon.
- Az API route stubok csak alap CRUD-ot generálnak, egyedi validációt/jogosultságkezelést nem.
