# scaff

Egy `.projectspec.md` fájlból generál kész Next.js (App Router) vagy Vite+React projekt-vázat.

**Újdonság v0.2-ben:** ha a spec tartalmaz egy `# ui-screens` blokkot, a CLI már nem üres
oldal-stubokat rak le, hanem **valódi, működő UI-t** — szerver-komponens listanézeteket
(Prisma-lekérdezéssel), kliens-komponens form-okat (create/update, prefill-lel), törlés-gombokat,
egy közös `Nav`-ot, és mindezt egy saját, előre megírt, elegáns `components/ui/` komponens-kicsomagolt
(Button, Input, Table, Card, Nav) tetejére építve.

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

## Ismert korlátok / lehetséges bővítési pontok

- A Vite ág nem generál adatkötött UI-t (lásd fent).
- Egy képernyőn csak egy elsődleges modell támogatott (nincs több-modelles form egy oldalon).
- Nincs feltételes UI-elem, lapozás, rendezés, törlés-megerősítő dialógus — mind szándékosan
  kimaradt, hogy a scaffold-lépés determinisztikus és AI-hívás nélküli maradjon.
- Az API route stubok csak alap CRUD-ot generálnak, egyedi validációt/jogosultságkezelést nem.
