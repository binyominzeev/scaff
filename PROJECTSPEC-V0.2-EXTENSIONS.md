# `.projectspec.md` v0.2 — bővítési javaslat

## Cél

A v0.1 formátum a *vázat* adta: stack, adatmodell, oldal-lista, korlátok. A generált scaffold
viszont üres oldal-stubokat rakott le — semmi UI, semmi adatkapcsolat. A v0.2 három dolgot told be
ugyanabba az egy fájlba, úgy, hogy közben megmarad a fő elv: **a chat közben könnyen finomítható
rész laza szöveg marad, a gép által determinisztikusan feldolgozandó rész pedig szigorú token-szintaxis**,
csak most már *oldal-szinten* keveredik a kettő, nem külön blokkokban.

Fontos: a v0.1 specek **továbbra is érvényesek** — minden új elem opcionális, visszafelé kompatibilis.
A `spec_version` mezőt `"0.2"`-re emeljük, ha ezeket az elemeket használod.

---

## 1. ASCII UI wireframe-ek

A jelenlegi `# pages` blokk (`/route → leírás`) helyett/mellett egy új blokk jön: **`# ui-screens`**.
Minden oldalhoz tartozik egy ASCII "rajz", amiben a díszítés (dobozok, vonalak) csak az emberi
olvashatóságot szolgálja — a gép csak a szögletes zárójeles **elem-tokeneket** olvassa ki, a
körülöttük lévő `┌─│└` karaktereket figyelmen kívül hagyja.

```text
# ui-screens

## /people
┌─────────────────────────────────────────┐
│ People                                   │
│                                           │
│ [Input: search (text) placeholder="Keresés..."] │
│ [Table: columns=name,email; rows=Person.findMany(); rowLink=/people/{id}] │
│                                           │
│ [Button: Új személy -> /people/new]      │
└─────────────────────────────────────────┘

## /people/[id]
┌─────────────────────────────────────────┐
│ {name}                                   │
│                                           │
│ [Text: email]                            │
│ [Table: columns=hebrewDate,type; rows=Event.findMany(where: personId={id})] │
│                                           │
│ [Button: Szerkesztés -> /people/{id}/edit] │
│ [Link: Vissza -> /people]                │
└─────────────────────────────────────────┘

## /people/new
┌─────────────────────────────────────────┐
│ Új személy                               │
│                                           │
│ [Input: name (text, required)]           │
│ [Input: email (email)]                   │
│                                           │
│ [Button: Mentés -> Person.create()]      │
│ [Link: Mégse -> /people]                 │
└─────────────────────────────────────────┘
```

### Elem-token szótár (v0.2)

| Token | Jelentés | Generált eredmény |
|---|---|---|
| `[Text: ...]` | statikus szöveg, vagy `{field}`-fel mezőérték-interpoláció | `<p>` / `<h1>` a kontextustól függően |
| `[Input: name (type, modifiers)]` | form mező | vezérelt `<input>`, típus szerint (`text`, `email`, `number`, `date`, `textarea`) |
| `[Button: Label -> action]` | gomb | ha `action` egy `/route` → navigáció (`<Link>`); ha `Model.op()` → form submit handler |
| `[Link: Label -> /route]` | sima navigáció | `<Link>` |
| `[Table: columns=...; rows=...; rowLink=...]` | listanézet | szerver oldali lekérdezés + táblázat, opcionális sor-link |
| `[List: rows=...]` | egyszerűbb, nem táblázatos lista | `<ul>` kártyákkal, Table helyett akkor, ha nincs több oszlop |
| `[Data: Model.findUnique({param})]` | néma adatlekérés, nem renderel semmit | elérhetővé teszi a rekordot a képernyő `{field}` interpolációi számára |

**A `[Data: ...]` token szerepe:** ha egy képernyő címe vagy szövege `{field}`-et használ (pl. `{displayName}`),
de a képernyőn nincs olyan `Table`/`Button`, ami ugyanazt a modellt egyetlen rekordként lekérné, a
gépnek nincs honnan tudnia, *melyik* rekordra gondolsz. A `[Data: Person.findUnique({id})]` token
pontosan ezt mondja ki explicit módon — "ehhez a képernyőhöz tartozik egy Person rekord, az `id` route
paraméter alapján" — anélkül, hogy bármit renderelne. Ha egy szerkesztő-form (`Model.update({param})`
gombbal) már amúgy is lekéri a rekordot az előtöltéshez, a `[Data: ...]` token elhagyható — a
generátor ilyenkor magától felismeri, hogy szükség van a lekérésre.

**Fontos konzisztencia-szabály:** a `{field}` (kapcsos zárójel) **mindenhol** mezőérték- vagy
route-paraméter-interpolációt jelent — a `## /people/[id]` fejlécben, a `rows=...where:...={id}`
kifejezésekben és a `[Text: ...]` tokenben is. Zárójel *nélküli* szöveg mindig szó szerinti,
statikus szöveg — pl. `[Text: hebrewName]` a "hebrewName" szót írja ki szó szerint, míg
`[Text: {hebrewName}]` a mező tényleges értékét jeleníti meg. Ez a szabály egységes az egész
formátumban, tehát nem kell fejben tartani külön kivételeket.

**Ami szándékosan hiányzik v0.2-ből:** feltételes megjelenítés, komplex layout-elemek (tabok, modal),
vizuális stílusparaméterek (szín, méret). Ezek a "fine-tuning" fázisra maradnak VS Code-ban — a cél
egy **elegáns, de minimális** alap, nem egy pixel-pontos design.

### Az "elegáns alap UI" honnan jön, ha a spec nem ír elő stílust?

A generátor egyszer, projektenként lerak egy kis **saját komponent-kicsomagolt (`components/ui/`)**
könyvtárat — `Button`, `Input`, `Table`, `Card` — előre megírt, konzisztens Tailwind stílussal
(hasonlóan a shadcn/ui-hoz, de sokkal kisebb, saját, statikus készlet, nem generálja AI). Minden
`[Button]`/`[Input]`/`[Table]` token ezekre a kész, már szép komponensekre fordul le. Így a spec maga
sosem foglalkozik dizájnnal, mégis konzisztens, rendes alapot kapsz minden projektben — ez egy
**generátor-szintű döntés**, nem spec-mező, tehát nem bonyolítja a formátumot.

---

## 1/b. Navigáció — hogy semmi ne maradjon árva

Az `# ui-screens` blokkban minden link *kontextuális*: egy adott képernyőn belül írod le, hova mutat.
Ennek van egy fontos hiányossága: **semmi nem garantálja, hogy minden oldal elérhető valahonnan**.
Ha a ChatGPT-beszélgetés (vagy te) elfelejtesz linkelni egy oldalra, az az oldal létrejön a
scaffoldban, de kattintással sosem érhető el — csak URL-be beírva.

Ezt egy új, **minden UI-t generáló specben ajánlott** blokk oldja meg: **`# navigation`**.

```text
# navigation
[Nav: Dashboard -> /, Személyek -> /people, Import -> /import, Beállítások -> /settings]
```

Ez egy állandó navigációs sávot generál (`components/ui/nav.tsx`), amit a generátor beépít az
`app/layout.tsx`-be — tehát **minden oldalon megjelenik**, függetlenül attól, hogy az adott oldal
wireframe-je hivatkozik-e rá vagy sem. A `[Nav: ...]` tokenben csak a fő, nem-dinamikus oldalakat
érdemes felsorolni (a `/people/[id]`-szerű részletoldalak természetesen nem valók egy fix menübe).

### Elérhetőségi ellenőrzés (validáció, nem generálás)

A `# navigation` blokk megoldja a *fő* oldalak elérhetőségét, de a dinamikus részletoldalakról
(`/people/[id]`, `/people/[id]/edit` stb.) még mindig lemaradhat a link. Ezért a generátor a
scaffold előtt egy **elérhetőségi ellenőrzést** végez:

1. Összegyűjti az összes `## /route` fejlécet az `# ui-screens` blokkból.
2. Összegyűjti az összes hivatkozást: a `# navigation` blokk célpontjait, plusz minden
   `[Button: ... -> ...]`, `[Link: ... -> ...]` és `rowLink=...` célpontot minden képernyőről.
3. Minden statikus (nem-dinamikus) route-nak kell legyen bejövő hivatkozása valahonnan
   (navigációból vagy egy másik oldal linkjéből) — **kivéve a `/` főoldalt**, ami mindig a
   belépési pont, tehát sosem számít árvának, még ha semmi nem linkel is rá explicit.
4. Minden dinamikus route-nak (pl. `/people/[id]`) elég, ha egy `rowLink` vagy `[Button]`/`[Link]`
   *sablon-szinten* (pl. `/people/{id}`) mutat rá valahonnan — nem kell minden konkrét `id`-re
   külön linket találni, hiszen ez futásidőben, adatonként dől el.
5. Ha egy route árva marad, a scaffolder **figyelmeztetést ír ki generáláskor, de nem áll le**
   (pl. `⚠️  /import nincs belinkelve sehonnan — a navigációba vagy egy másik oldalra érdemes
   felvenni`). Ez tudatos döntés: inkább figyelmeztessen és hagyja a scaffoldot lefutni, mint hogy
   megállítsa a folyamatot egy olyan hiba miatt, amit a user egy sorral könnyen javít.

Ezzel a kiegészítéssel garantált, hogy egy v0.2 spec alapján generált UI-ban **a nyitóoldalról
kattintgatva minden statikus oldal elérhető**, a dinamikus részletoldalak pedig a listákon
keresztül — pontosan úgy, ahogy egy kész, éles alkalmazásban elvárnád.

---

## 2. Szép URL-ek (dinamikus route-ok)

A `# ui-screens` blokk fejlécei (`## /route`) most már **Next.js-stílusú dinamikus szegmenseket**
is tartalmazhatnak: `[id]`, `[slug]` stb. Ez közvetlenül megfelel a fájlrendszeres routing mappaneveinek
(`app/people/[id]/page.tsx`), tehát nincs szükség külön szintaxisra.

```
/people                → lista
/people/[id]           → részletek
/people/[id]/edit      → szerkesztés
/events/[id]           → esemény részletek
```

**Vite+React ág eltérése:** ott nincs fájlrendszeres routing, a `react-router` `:id` szintaxist
használja. A generátor feladata a fordítás: `[id]` a specben → `:id` a react-router route
definícióban. A user szempontjából a spec mindig ugyanúgy néz ki, függetlenül a választott stacktől
— ez fontos, mert a chat-beszélgetésnek nem kell tudnia, melyik keretrendszer került kiválasztásra.

A `{id}` (kapcsos zárójel) az **elem-tokeneken belül** a route paraméterre hivatkozik (lásd fent:
`rows=Event.findMany(where: personId={id})`), megkülönböztetve a route-definícióban használt
szögletes `[id]`-től.

---

## 3. Egyszerű DB-kapcsolatok (Project Garden minta)

A `Project Garden` repódban nincs Prisma, csak nyers `better-sqlite3` — egyszerű, egyszemélyes
belső eszközökhöz ez gyorsabb és átláthatóbb. A v0.2-ben ez **nem új spec-nyelvet** jelent, hanem azt,
hogy a már meglévő Prisma-szintaxisú `data-model` blokk **modellezésre** mindig megmarad (ez a
"forrásigazság" ember és gép számára egyaránt), de a generátor a `database.orm` mező alapján dönti
el, hogy ebből **valódi Prisma projektet** épít-e, vagy **nyers SQL + kis wrapper függvényeket**
(`lib/db.ts` egyszerű `get`/`all`/`run` metódusokkal, ahogy a Project Garden-ben).

```yaml
database:
  enabled: true
  engine: sqlite
  orm: raw-driver     # <- ez már létezik a v0.1 schema-ban, csak eddig nem volt mögötte generátor-logika
```

Az elem-tokenek (`Person.findMany()`, `Event.create()` stb.) **ugyanúgy néznek ki** mindkét esetben —
a chat-beszélgetés és a wireframe szintjén nem számít, hogy Prisma vagy nyers SQL generálódik-e
mögé. Ez fontos: a bonyolultsági döntés (Prisma vs. nyers driver) *stack-szintű*, nem
*képernyő-szintű* döntés, tehát elég egyszer, a front matterben kimondani.

### Támogatott műveletek v0.2-ben

| Művelet | Jelentés |
|---|---|
| `Model.findMany()` | lista, opcionális `where:` szűrővel |
| `Model.findMany(where: field={param})` | szűrt lista route-paraméter alapján |
| `Model.findUnique({param})` | egy rekord lekérése route-paraméter (pl. `[id]`) alapján |
| `Model.create()` | form submit → új rekord |
| `Model.update({param})` | form submit → meglévő rekord módosítása |
| `Model.delete({param})` | gomb → törlés (megerősítő dialógus nélkül v0.2-ben — ez tudatos egyszerűsítés) |

Ezen a listán túl (pl. join-ok, aggregációk, rendezés) a v0.2 nem megy — az már a VS Code-os
fine-tuning fázis dolga. A cél a Project Garden-szintű egyszerűség: egy tábla, egy szűrő, kész.

---

## Teljes példa: `/people` képernyő végponttól végpontig

Ez mutatja, hogy a három bővítés hogyan illeszkedik össze egyetlen konzisztens képben:

```text
# ui-screens

## /people
┌─────────────────────────────────────────┐
│ People                                   │
│ [Input: search (text) placeholder="Keresés..."] │
│ [Table: columns=name,email; rows=Person.findMany(); rowLink=/people/{id}] │
│ [Button: Új személy -> /people/new]      │
└─────────────────────────────────────────┘
```

Ebből a generátor (jövőbeli implementáció, most csak spec):
1. Létrehozza az `app/people/page.tsx`-t (vagy `raw-driver` esetén ugyanezt, más adat-hívással)
2. Egy szerveroldali lekérdezést a `Person` modellre (`findMany`, keresőmező alapján kliens-oldali
   szűréssel vagy egyszerű `LIKE` where-rel — v0.2-ben elég az utóbbi, egyszerű megoldás)
3. Egy `<Table>` komponenst a saját `components/ui/table.tsx`-ből, `rowLink` alapján `<Link>`-elt sorokkal
4. Egy `<Button>`-t, ami `/people/new`-re navigál

Az `# ui-screens` blokk így **helyettesíti** a v0.1 `# pages` blokkot (a route+leírás információ
implicit benne van a `## /route` fejlécben), de a v0.1 formátum is támogatott marad azoknak a
projekteknek, ahol nem kell UI-t generálni (pl. tiszta API-only projekt).

---

## Frontmatter-változás v0.2-höz

Egyetlen új mező kell csak:

```yaml
spec_version: "0.2"
```

Nem vezetünk be külön `ui:` kapcsolót a front matterbe — a UI-generálás ténye magából abból derül ki,
hogy van-e `# ui-screens` blokk a fájlban. Ez a legkevesebb új felület, és így egy v0.1 spec
változtatás nélkül is érvényes marad.

---

## Amit tudatosan kihagytunk v0.2-ből (jövőbeli v0.3 jelöltek)

- **Almenük / többszintű navigáció** — a `# navigation` blokk v0.2-ben egyetlen, lapos menüsort
  generál. Almenük, lenyíló csoportok stb. nincsenek benne — ha egy projektnek sok top-level oldala
  lenne, ez már fine-tuning fázisban oldandó meg.
- **Törlés megerősítő dialógus** — most egyből töröl, nincs "biztos vagy benne?" — ez UX-hiányosság,
  de nem blokkolja a scaffoldot, és a fine-tuning fázisban egy sor kóddal pótolható.
- **Rendezés/lapozás listákban** — a Project Garden-szintű egyszerűséghez ez nem kellett.
- **Feltételes UI-elemek** (pl. "csak akkor mutasd a gombot, ha X") — ez már logika, nem vázlat, ide
  már valódi kódolás kell, nem determinisztikus scaffold.
- **Több modellt összekötő komplex form-ok** (pl. egy oldalon két entitást egyszerre szerkeszteni) —
  a v0.2 egy képernyő = egy elsődleges modell elvet követi, ahogy mind az 5 repódban is ez volt a minta.

Ezek mind szándékos vágások: a cél, hogy a scaffold-lépés **maradjon AI-hívás nélkül futtatható és
determinisztikus** — amint feltételes logika vagy több-modelles form kerülne bele, az már túlmutatna
azon, amit egy sablon-motor biztonságosan, kiszámíthatóan le tud generálni.
