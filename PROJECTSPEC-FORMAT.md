# `.projectspec.md` formátum — v0.1

Ez a köztes "nyelv" ChatGPT (vagy bármilyen chat-alapú tervezés) és a scaffolding CLI között.
Egyetlen Markdown fájl, három résszel:

1. **YAML front matter** — gépi feldolgozásra szánt kapcsolók és metaadatok (validálható JSON Schema-val)
2. **Data model** — valódi Prisma schema szintaxis, nem saját kitalált nyelv
3. **Szabad szöveges szekciók** — oldalak/route-ok (ASCII fa), constraints, fejlesztési sorrend

A fájl embert és gépet is kiszolgál: a YAML rész determinisztikusan feldolgozható a scaffolderrel,
a Prisma blokk közvetlenül `prisma validate`-elhető, a szöveges részek pedig a fine-tuning fázisban
(VS Code / Copilot / Claude Code) adnak kontextust anélkül, hogy külön dokumentációt kellene írni.

---

## 1. YAML front matter

```yaml
---
spec_version: "0.1"

project:
  name: community-calendar          # kebab-case, lesz a repó neve is
  type: web-app                     # web-app | pwa | api-only
  one_liner: >
    A modern web application for managing recurring Jewish community
    events based on the Hebrew calendar.

stack:
  framework: nextjs-app-router      # nextjs-app-router | vite-react
  language: typescript              # jelenleg mindig ez, de explicit
  styling: tailwind-v4              # tailwind-v3 | tailwind-v4 | none
  router: null                      # csak vite-react esetén releváns, pl. react-router

database:
  enabled: true
  engine: sqlite                    # none | sqlite | postgres
  orm: prisma                       # none | prisma | raw-driver
  seed: true                        # legyen-e seed script

api:
  enabled: true
  style: route-handlers             # route-handlers | none
                                     # (tRPC/GraphQL egyelőre nincs a mintákban, de bővíthető)

auth:
  enabled: true
  provider: next-auth-credentials   # none | next-auth-credentials

ai_integration:
  enabled: false
  provider: none                    # none | openai | custom-server
  purpose: null                     # pl. "chat coach", "structured extraction"

pwa:
  enabled: false
  offline: false

deployment:
  target: docker-vps                # local-dev | docker-vps | pm2
  docker: true
---
```

**Miért YAML és nem tisztán markdown?** Mert ezt a részt a scaffolder CLI-nek *determinisztikusan*,
regex/heurisztika nélkül kell tudnia beolvasni. A markdown a szöveges részekhez való, ahol az emberi
olvashatóság számít jobban, mint a gépi parse-olhatóság.

---

## 2. Data model — valódi Prisma schema

```prisma
// data-model
model Person {
  id          String  @id @default(cuid())
  displayName String
  hebrewName  String?
  notes       String?
  tags        Tag[]
  events      Event[]
}

model Event {
  id            String   @id @default(cuid())
  personId      String
  person        Person   @relation(fields: [personId], references: [id])
  type          String   // "Yahrzeit" | "Birthday" | jövőben bővíthető
  hebrewDate    String
  gregorianDate DateTime
  remarks       String?
}

model Tag {
  id      String   @id @default(cuid())
  name    String   @unique
  people  Person[]
}
```

Ez a blokk szó szerint bekerül a generált `prisma/schema.prisma`-ba (a scaffolder csak a fejlécet és
a datasource/generator blokkot fűzi hozzá). Nem kell külön szintaxist tanulni, nem kell külön parsert
írni rá — a Prisma CLI maga validálja.

Ha `database.enabled: false`, ez a szekció elmarad.

---

## 3. Oldalak / route-ok (ASCII fa)

```text
# pages
/                     → dashboard: 3 ajánlott projekt + gyors CRUD gombok
/calendar             → havi/heti naptár nézet, tag/típus szűrővel
/people               → személyek listája, kereséssel
/import               → spreadsheet-szerű beillesztős import
/settings             → tag-ek és event típusok kezelése
```

Ez a rész **nem YAML**, mert itt pont az számít, hogy a user chat közben gyorsan tudjon rajta
finomítani ("vegyük ki a settings oldalt", "legyen egy /export is") — a laza szöveges forma jobban
illeszkedik egy beszélgetéshez, mint egy szigorú séma. A scaffolder ebből csak annyit használ fel,
hogy minden sorból generál egy `app/<path>/page.tsx` stubot a nyíl előtti résszel; a nyíl utáni leírás
a fine-tuning fázisban (VS Code) segít kontextusként.

---

## 4. Constraints — a "ne túltervezz" szekció

```text
# constraints
- Ne vezess be Docker/Kubernetes/Redis-t, hacsak nem elengedhetetlen.
- Ne építs enterprise-szintű funkciókat (pl. role-based access control).
- Egyszerű credentials-alapú auth elég, nincs szükség OAuth-ra.
- Az architektúra legyen bővíthető, de az MVP maradjon egyszerű.
- Ha valami alulspecifikált, válassz egyszerűbb megoldást a bonyolultabb helyett.
```

Ez a szekció **kötelező** minden spec-ben — a repóid alapján ez a leggyakoribb, legkonzisztensebb
minta, tehát ne hagyjuk implicitnek. A scaffolder ezt nem "futtatja le" kódra, hanem belefűzi a
generált `AGENTS.md`/`CLAUDE.md` fájlba, hogy a VS Code-os fine-tuning fázisban a Copilot/Claude Code
is lássa és tartsa magát hozzá.

---

## 5. Fejlesztési sorrend (opcionális)

```text
# development-order
1. Projekt + adatbázis + alap dashboard
2. Core CRUD (Person, Event)
3. Naptár nézetek (heti/havi)
4. Import (spreadsheet paste)
5. Export (.ics, printable HTML)
```

Csak akkor kerül bele, ha a beszélgetés során explicit felmerül (mint a videobridge és kbase
promptjaidban). Ha nincs, kihagyható.

---

## Miért ez a felosztás és nem egyetlen homogén formátum?

A repóid alapján három különböző dolog van keveredve minden eddigi promptban, és pont ez teszi
nehézzé, hogy egy sima markdown fájlból determinisztikusan scaffoldolj:

| Rész | Természete | Formátum |
|---|---|---|
| Stack/feature-kapcsolók | Zárt választási lehetőségek, gép dönt belőle | YAML (szigorú) |
| Adatmodell | Strukturált, de a user is szerkeszti | Prisma schema (félig szigorú, de ismerős) |
| Oldalak, constraints, sorrend | Leíró, chat közben finomodik | Szabad szöveg (laza) |

Ez a hármas felosztás az, ami lehetővé teszi, hogy a scaffolder a YAML+Prisma részből *determinisztikusan*
generáljon kódot (nincs szükség AI hívásra a scaffold lépésben), miközben a szöveges részek megőrzik
azt a rugalmasságot, amit chatben könnyű finomítani.
