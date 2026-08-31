# Generátor-only prompt (v0.2)

Ezt egy **vadonatúj, tiszta beszélgetésben** használd — ne ugyanabban a szálban, ahol a projektet
kitaláltátok. A tervezőbeszélgetés végén kért összefoglalót (lásd `WORKFLOW.md` 1. lépés) illeszd
közvetlenül e prompt alá, **ugyanabba az üzenetbe**, és küldd el egyben.

---

```text
A feladatod: az alább (ez után az üzenet után) kapott projekt-összefoglalóból generálj egy
`.projectspec.md` fájlt. Ez nem tervezőbeszélgetés — az összefoglalóban minden szükséges döntés
már megvan. NE tégy fel kérdéseket, NE javasolj alternatívákat, NE magyarázd a döntéseidet.
Kivétel: ha egyetlen, kritikusan hiányzó információ van, ami nélkül a fájl nem generálható
(pl. egyetlen entitás sincs megadva, pedig database.enabled igaz lenne), tegyél fel PONTOSAN
EGY tisztázó kérdést, és várd meg a választ, mielőtt generálnál. Minden más esetben egyből
generálj, és ha valami kisebb részlet hiányzik, válassz egyszerű, nem túltervezett
alapértelmezést.

A válaszod KIZÁRÓLAG a `.projectspec.md` fájl tartalma legyen — semmi bevezető szöveg, semmi
magyarázat előtte vagy utána, semmi "Íme a spec:" jellegű mondat. Egyetlen kódblokkban add vissza
az egész fájlt, hogy egy az egyben kimásolható legyen.

PONTOS FORMÁTUM, ebben a sorrendben:

### 1. YAML front matter (--- határolókkal)

  spec_version: "0.2"
  project: {name (kebab-case), type (web-app|pwa|api-only), one_liner}
  stack: {framework (nextjs-app-router|vite-react), language (typescript),
          styling (tailwind-v3|tailwind-v4|none), router (react-router|null)}
  database: {enabled, engine (none|sqlite|postgres), orm (none|prisma|raw-driver), seed}
  api: {enabled, style (route-handlers|none)}
  auth: {enabled, provider (none|next-auth-credentials)}
  ai_integration: {enabled, provider (none|openai|custom-server), purpose}
  pwa: {enabled, offline}
  deployment: {target (local-dev|docker-vps|pm2), docker}

### 2. Adatmodell — ```prisma``` blokk, "// data-model" komenttel kezdve

Csak ha database.enabled: true. Valódi, érvényes Prisma model definíciók.

### 3. UI képernyők — ```text``` blokk, "# ui-screens" fejléccel

Minden képernyő "## /route" fejléccel kezdődik (dinamikus szegmens: [id], pl. "## /people/[id]").
Token-szótár:

  [Input: mezőnév (típus, modifiers) placeholder="..."]   -- típus: text/email/number/date/textarea, modifier: required
  [Button: Felirat -> action]                              -- action = /route VAGY Model.op()
  [Link: Felirat -> /route]
  [Table: columns=mező1,mező2; rows=Model.op(); rowLink=/route/{id}]
  [List: rows=Model.op()]
  [Data: Model.findUnique({param})]                        -- néma lekérés, csak {field} interpolációhoz
  [Text: szöveg vagy {field}]

Támogatott Model.op(): findMany() | findMany(where: mező={param}) | findUnique({param}) |
create() | update({param}) | delete({param})

SZABÁLY: {field} MINDIG interpoláció (route paraméter vagy mezőérték). Zárójel nélküli szöveg
mindig szó szerinti. Ha egy képernyő címe/szövege {field}-et használ, de nincs form ami
előtöltené a rekordot, tedd be a [Data: Model.findUnique({param})] tokent.

Minden képernyőnek legyen legalább egy bejövő linkje valahonnan (navigációból vagy másik
képernyő linkjéből) — a "/" kivétel. Dinamikus képernyőknél elég egy rowLink sablon.

### 4. Navigáció — ```text``` blokk, "# navigation" fejléccel

  [Nav: Felirat -> /route, Felirat -> /route, ...]

### 5. Korlátok — ```text``` blokk, "# constraints" fejléccel

Legalább egy "ne túltervezzünk" jellegű szabály.

### 6. Fejlesztési sorrend (opcionális) — ```text``` blokk, "# development-order" fejléccel

Generálás előtt ellenőrizd magadban:
- minden route statikus vagy dinamikus szegmensei konzisztensek a Table/Button/Link
  hivatkozásokkal
- minden {field} vagy route paraméterként, vagy [Data:]/form-mezőként fel van oldva
- minden képernyő elérhető valahonnan
- a front matter minden enum-értéke pontosan a megadott listák egyike

Most várom a projekt-összefoglalót.
```
