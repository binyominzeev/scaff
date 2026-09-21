---
spec_version: "0.2"

project:
  name: "machon-cards"
  type: "web-app"
  one_liner: "Egyszerű, Mochi-szerű flashcard rendszer a Sulchán Áruch négy részének és szimánjainak struktúrájára, Pocket ID bejelentkezéssel."

stack:
  framework: "nextjs-app-router"
  language: "typescript"
  styling: "tailwind-v4"
  router: null

database:
  enabled: true
  engine: "sqlite"
  orm: "prisma"
  seed: true

api:
  enabled: true
  style: "route-handlers"

auth:
  enabled: true
  provider: "pocket-id-oidc"

ai_integration:
  enabled: false
  provider: "none"
  purpose: ""

pwa:
  enabled: false
  offline: false

deployment:
  target: "pm2"
  docker: false
---

### 2. Adatmodell

```prisma
// data-model

enum Section {
  ORACH_CHAIM
  YOREH_DEAH
  EVEN_HAEZER
  CHOSHEN_MISHPAT
}

model Siman {
  id          String    @id @default(cuid())
  section     Section
  number      Int
  displayName String?
  cards       Card[]
  preferences AppPreference[]

  @@unique([section, number])
}

model Card {
  id        String   @id @default(cuid())
  simanId   String
  front     String
  back      String
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  siman     Siman   @relation(fields: [simanId], references: [id], onDelete: Cascade)

  @@index([simanId])
}

model AppPreference {
  id             String @id
  currentSimanId String
  currentSiman   Siman  @relation(fields: [currentSimanId], references: [id], onDelete: Restrict)

  @@index([currentSimanId])
}
```

### 3. Seed adatok

```json
# seed-data
{
  "Siman": [
    {
      "_alias": "orachChaim1",
      "id": "seed_orachChaim1",
      "section": "ORACH_CHAIM",
      "number": 1,
      "displayName": "Orach Chaim 1"
    },
    {
      "_alias": "orachChaim2",
      "id": "seed_orachChaim2",
      "section": "ORACH_CHAIM",
      "number": 2,
      "displayName": "Orach Chaim 2"
    },
    {
      "_alias": "yorehDeah1",
      "id": "seed_yorehDeah1",
      "section": "YOREH_DEAH",
      "number": 1,
      "displayName": "Yoreh De'ah 1"
    },
    {
      "_alias": "evenHaezer1",
      "id": "seed_evenHaezer1",
      "section": "EVEN_HAEZER",
      "number": 1,
      "displayName": "Even HaEzer 1"
    },
    {
      "_alias": "choshenMishpat1",
      "id": "seed_choshenMishpat1",
      "section": "CHOSHEN_MISHPAT",
      "number": 1,
      "displayName": "Choshen Mishpat 1"
    }
  ],
  "Card": [
    {
      "_alias": "sampleCard1",
      "id": "seed_sampleCard1",
      "simanId": {
        "$ref": "orachChaim1"
      },
      "front": "Mit jelent az első szimán első alapelve?",
      "back": "Legyen az Örökkévaló előtti szolgálat tudatos és állandó.",
      "createdAt": "2026-09-17T00:00:00.000Z",
      "updatedAt": "2026-09-17T00:00:00.000Z"
    },
    {
      "_alias": "sampleCard2",
      "id": "seed_sampleCard2",
      "simanId": {
        "$ref": "orachChaim1"
      },
      "front": "Mi a gyakorlás alapvető működése?",
      "back": "Először az előlap látható, majd a válasz megjelenítése után a következő kártyára lehet lépni.",
      "createdAt": "2026-09-17T00:00:00.000Z",
      "updatedAt": "2026-09-17T00:00:00.000Z"
    },
    {
      "_alias": "sampleCard3",
      "id": "seed_sampleCard3",
      "simanId": {
        "$ref": "yorehDeah1"
      },
      "front": "Melyik részhez tartozik ez a szimán?",
      "back": "Yoreh De'ah.",
      "createdAt": "2026-09-17T00:00:00.000Z",
      "updatedAt": "2026-09-17T00:00:00.000Z"
    }
  ],
  "AppPreference": [
    {
      "_alias": "defaultPreference",
      "id": "dev-test-user",
      "currentSimanId": {
        "$ref": "orachChaim1"
      }
    }
  ]
}
```

### 4. UI képernyők

```text
# ui-screens

## /
[Data: AppPreference.findUnique({userId})]
[Data: Siman.findMany()]
[Text: Machon Cards]
[Text: Aktuális szimán]
[Text: {currentSimanId}]
[Text: Kártyák száma]
[Button: Gyakorlás -> /study]
[Button: Új kártya -> /cards/new]
[Button: Szimán választása -> /siman]
[Table: columns=front,back; rows=Card.findMany(); rowLink=/cards/{id}]

## /cards/new
[Text: Új kártya]
[Input: front (textarea, required) placeholder="Előlap"]
[Input: back (textarea, required) placeholder="Hátlap"]
[Select: simanId; options=Siman.findMany(); value=id; label=displayName; required]
[Button: Mentés -> Card.create()]
[Link: Vissza a dashboardra -> /]

## /cards/[id]
[Data: Card.findUnique({id})]
[Text: Kártya szerkesztése]
[Text: Szimán: {simanId}]
[Input: front (textarea, required) placeholder="Előlap"]
[Input: back (textarea, required) placeholder="Hátlap"]
[Select: simanId; options=Siman.findMany(); value=id; label=displayName; required]
[Button: Mentés -> Card.update({id})]
[Button: Törlés -> Card.delete({id})]
[Link: Vissza a dashboardra -> /]

## /siman
[Data: Siman.findMany()]
[Data: AppPreference.findUnique({userId})]
[Text: Szimánok]
[List: rows=Siman.findMany()]
[Select: currentSimanId; options=Siman.findMany(); value=id; label=displayName; required]
[Button: Aktuális szimán beállítása -> AppPreference.update({userId})]
[Link: Dashboard -> /]

## /study
[Data: AppPreference.findUnique({userId})]
[Text: Gyakorlás]
[Text: Aktuális szimán: {currentSimanId}]
[InteractiveList: rows=Card.findMany(); primary=front; secondary=back; reveal="Válasz mutatása"; next="Következő"]
[Link: Dashboard -> /]

## /import
[Text: Mochi import]
[Input: file (text, required) placeholder="Mochi export fájl"]
[Button: Import -> /import]
[Text: Import eredménye]
[Link: Dashboard -> /]
```

### 5. Navigáció

```text
# navigation

[Nav: Dashboard -> /, Gyakorlás -> /study, Szimánok -> /siman, Új kártya -> /cards/new, Import -> /import]
```

### 6. Korlátok

```text
# constraints

- A bejelentkezés Pocket ID OIDC-n keresztül történik; nincs saját User modell, a bejelentkezett felhasználót a JWT `sub` claimje (`{userId}`) azonosítja.
- A Sulchán Áruch struktúrája és a felhasználói kártyák maradjanak különválasztva.
- Az alapstruktúra Sulchán Áruch → rész → szimán → kártyák.
- Egy Card alapvetően csak front + back + siman kapcsolatot tartalmazzon.
- A kártyaállomány (Siman, Card) minden bejelentkezett felhasználó között közös; csak az aktuális szimán preferencia személyes, felhasználónkénti (AppPreference).
- Nincs spaced repetition vagy összetett gyakorlási algoritmus.
- Nincs statisztikai dashboard, streak, gamification vagy achievement rendszer.
- Nincs AI-integráció.
- Nincs WebSocket vagy realtime sync.
- Nincs offline-first működés vagy PWA.
- Nincs komplex tag-, deck- vagy hierarchikus Mochi-modell.
- Nincs mikroszerviz-architektúra és nincs Docker.
- Az API maradjon egyszerű Next.js route handler / server-side CRUD megoldás.
- Az UI legyen egyszerű, gyors, reszponzív és mobile-first.
- Ne tervezzünk előre olyan funkciókat, amelyekre az első használat során nincs szükség.
- A gyakorlási workflow maradjon egyszerű, és a későbbi használati tapasztalatok alapján bővíthető legyen.
- A cross-device működést a központi VPS-en futó SQLite adatbázis biztosítja.
- A Mochi import ne próbáljon automatikusan szimánt felismerni.
```

### 7. Fejlesztési sorrend

```text
# development-order

1. Next.js + TypeScript scaffold
2. Pocket ID OIDC auth bekötése (login, callback, session cookie, JWKS-ellenőrzés)
3. SQLite + Prisma
4. Adatmodell és fejlesztői Sulchán Áruch szimán-struktúra seedelése
5. Dashboard
6. Kártya CRUD
7. Szimánválasztás és felhasználónkénti aktuális szimán tárolása
8. Egyszerű gyakorlási mód
9. Mochi import
10. Reszponzív és mobil UI finomítása
11. VPS deployment PM2 + nginx
12. A használat alapján a gyakorlási workflow további finomítása
```
