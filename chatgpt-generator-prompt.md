# Generátor-only prompt (v0.3)

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
magyarázat előtte vagy utána, semmi "Íme a spec:" jellegű mondat. NE tedd az egész fájlt egyetlen
külső ``` kódblokkba — írd ki nyers szövegként, a fájlon belüli ```prisma és ```text blokkokkal
együtt, hogy a fájl közvetlenül, egy az egyben kimásolható és elmenthető legyen.

PONTOS FORMÁTUM, ebben a sorrendben:

### 1. YAML front matter (--- határolókkal)

  spec_version: "0.2"
  project: {name (kebab-case), type (web-app|pwa|api-only), one_liner}
  stack: {framework (nextjs-app-router|vite-react), language (typescript),
          styling (tailwind-v3|tailwind-v4|none), router (react-router|null)}
  database: {enabled, engine (none|sqlite|postgres), orm (none|prisma|raw-driver), seed}
  api: {enabled, style (route-handlers|none)}
  auth: {enabled, provider (none|next-auth-credentials|pocket-id-oidc)}
  ai_integration: {enabled, provider (none|openai|custom-server), purpose}
  pwa: {enabled, offline}
  deployment: {target (local-dev|docker-vps|pm2), docker}

Auth provider választás:
- `none`: nincs bejelentkezés.
- `next-auth-credentials`: Next.js App Router projektnél a scaffold minimális next-auth
  alapot generál; a tényleges session- és credential-logikát később kell bekötni.
- `pocket-id-oidc`: csak `nextjs-app-router` esetén válaszd. A scaffold teljes Pocket ID /
  OIDC Authorization Code + PKCE flow-t generál, Next.js Route Handlerekkel, JWKS token-
  ellenőrzéssel és httpOnly cookie sessionnel. A Vite+React ág ezt jelenleg nem támogatja.
  A projekt összefoglalójában legyen egyértelmű, hogy a Pocket ID klienshez szükséges az
  issuer, client ID, backend-only client secret, valamint az `/auth/callback` redirect URI.
  A generált `.env` értékeit nem szabad kitalálni vagy titokkal feltölteni.

### 2. Adatmodell — ```prisma``` blokk, "// data-model" komenttel kezdve

Csak ha database.enabled: true. Valódi, érvényes Prisma model definíciók.

### 3. Seed adatok — kötelező ```json``` blokk adatbázis esetén, "# seed-data" fejléccel

Ha `database.enabled: true`, akkor a front matterben mindig `seed: true` legyen, és ez a
`# seed-data` blokk kötelező. Ne hagyd ki, ne állítsd `seed: false` értékre. Ha
`database.enabled: false`, akkor `seed: false` legyen, és ne generálj seed blokkot.
A seed blokk gyökere objektum legyen,
a kulcsok Prisma modellnevek, az értékek rekordtömbök. Minden rekordnak legyen egy egyedi
`_alias` mezője. Az `id` elhagyható; a scaffold stabil `seed_<alias>` ID-t generál.
Relációs mezőnél alias-hivatkozást használj: `{ "$ref": "alias" }`.

Példa:

```json
# seed-data
{
  "User": [
    { "_alias": "devUser", "id": "dev-test-user" }
  ],
  "Siman": [
    { "_alias": "orachChaim1", "section": "ORACH_CHAIM", "number": 1, "displayName": "Első szimán" }
  ],
  "UserPreference": [
    { "_alias": "devPreference", "userId": { "$ref": "devUser" }, "currentSimanId": { "$ref": "orachChaim1" } }
  ]
}
```

Csak a Prisma modellben létező mezőket használd. A seed adatok legyenek kis méretű, hasznos
fejlesztői/demo adatok, ne teljes adatbázis-export. Legyen legalább egy használható kezdő/demo
rekord minden, a kezdőképernyő által lekérdezett modellhez, valamint az auth által használt
tesztfelhasználóhoz szükséges rekord. A relációk legyenek feloldhatók, és ne használj olyan
aliasra mutató `$ref`-et, amely nincs definiálva.

### 4. UI képernyők — ```text``` blokk, "# ui-screens" fejléccel

Minden képernyő "## /route" fejléccel kezdődik (dinamikus szegmens: [id], pl. "## /people/[id]").
A doboz-tartalom ELSŐ sima (zárójel nélküli) szövegsora a képernyő főcíme (nagy H1-ként jelenik
meg) — MINDIG adj meg ilyet minden képernyőn, ne csak a formoknál. Token-szótár:

  [Input: mezőnév (típus, modifiers) placeholder="..."]   -- típus: text/email/number/date/textarea, modifier: required
    [Select: mezőnév; options=Model.findMany(); value=id; label=name; required]
  [Button: Felirat -> action]                              -- action = /route VAGY Model.op()
  [Link: Felirat -> /route]
  [Table: columns=mező1,mező2; rows=Model.op(); rowLink=/route/{id}]
  [List: rows=Model.op()]
  [InteractiveList: rows=Model.findMany(); primary=field; secondary=field; reveal="..."; next="..."]
  [Data: Model.findUnique({routeParam})]                   -- néma lekérés dinamikus rekordhoz
  [Data: Model.singleton()]                                -- egyetlen seedelt/statikus rekord lekérése
  [Heading: szöveg vagy {field}]                            -- kisebb alcím (H2) egy szekció elé, pl. egy Table/List fölé
  [Text: szöveg vagy {field}]

Ha egy képernyőn több, egymástól elkülönülő adatblokk van (pl. két Table vagy egy Table és egy
InteractiveList), tegyél egy `[Heading: ...]` sort közvetlenül az adott blokk elé, hogy a
felhasználó lássa, melyik szekció mit mutat — ez pusztán vizuális, nem hoz létre új adatlekérést.

Támogatott Model.op(): findMany() | findMany(where: mező={routeParam}) | findUnique({routeParam}) |
singleton() | create() | update({routeParam}) | updateSingleton() | delete({routeParam})

A kapcsos zárójelben mindig valódi nevet használj, soha ne írd ki szó szerint a `param` vagy
`routeParam` szót. Például a `## /cards/[id]` képernyőn `Card.findUnique({id})`,
`Card.update({id})` és `Card.delete({id})` helyes. A `## /` vagy `## /siman` statikus
képernyőn nincs route paraméter, ezért ott ne használj `findUnique({param})` vagy
`findMany(where: ...={param})` alakot. Authos alkalmazásnál a bejelentkezett felhasználó
azonosítóját `{userId}` néven használd, és az auth legyen bekapcsolva; auth nélküli alkalmazásnál
használj `findMany()`-t, vagy tervezz olyan statikus, seedelt rekordot, amelyhez nem kell
ismeretlen azonosító. Az `update()` és `delete()` művelet soha nem lehet paraméter nélküli:
mindig valódi route-paramétert kell megadni, például `update({id})`. Singleton rekord
közvetlen, azonosító nélküli lekéréséhez `Model.singleton()`, frissítéséhez
`Model.updateSingleton()` használandó. Ezek csak olyan modellekhez valók, amelyekből a seed
egy, jól meghatározott rekordot tartalmaz.

A `Select` relation mezőkhöz használható. Az `options` mindig valódi `findMany()` lekérés,
a `value` és `label` valódi modellmező legyen. Ne kérj kötelező relation-azonosítót szabad
szöveges `Input` mezőben, ha a választható rekordok lekérhetők `Select`-tel.

Az `InteractiveList` általános, kliensoldali listaworkflow: a `primary` mező az elsőként
megjelenő érték, a `secondary` mező a `reveal` gombbal megjelenő érték, a `next` gomb pedig
a következő listaelemre lép. Ne a route vagy a modell neve alapján próbálj workflow-t kitalálni.

SZABÁLY: {field} MINDIG interpoláció (route paraméter vagy mezőérték). Zárójel nélküli szöveg
mindig szó szerinti. Ha egy képernyő címe/szövege {field}-et használ, de nincs form ami
előtöltené a rekordot, tedd be a [Data: Model.findUnique({param})] tokent.

Minden képernyőnek legyen legalább egy bejövő linkje valahonnan (navigációból vagy másik
képernyő linkjéből) — a "/" kivétel. Dinamikus képernyőknél elég egy rowLink sablon.

### 5. Navigáció — ```text``` blokk, "# navigation" fejléccel

  [Nav: Felirat -> /route, Felirat -> /route, ...]

### 6. Korlátok — ```text``` blokk, "# constraints" fejléccel

Legalább egy "ne túltervezzünk" jellegű szabály.

### 7. Fejlesztési sorrend (opcionális) — ```text``` blokk, "# development-order" fejléccel

Generálás előtt ellenőrizd magadban:
- minden route statikus vagy dinamikus szegmensei konzisztensek a Table/Button/Link
  hivatkozásokkal
- sehol nem maradt szó szerint `{param}` vagy `{routeParam}`; minden művelet valódi route-paramétert használ
- minden {field} vagy route paraméterként, vagy [Data:]/form-mezőként fel van oldva
- minden képernyő elérhető valahonnan
- a front matter minden enum-értéke pontosan a megadott listák egyike

Most várom a projekt-összefoglalót.
```
