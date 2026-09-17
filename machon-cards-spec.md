---
spec_version: "0.2"
project:
  name: "machon-cards"
  type: "web-app"
  one_liner: "Egyszerű, Mochi-szerű flashcard rendszer a Sulchán Áruch négy részének és szimánjainak struktúrájára."
stack:
  framework: "nextjs-app-router"
  language: "typescript"
  styling: "none"
  router: null
database:
  enabled: true
  engine: "postgres"
  orm: "prisma"
  seed: true
api:
  enabled: true
  style: "route-handlers"
auth:
  enabled: true
  provider: "next-auth-credentials"
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

```prisma
// data-model

enum Section {
  ORACH_CHAIM
  YOREH_DEAH
  EVEN_HAEZER
  CHOSHEN_MISHPAT
}

model User {
  id              String           @id @default(cuid())
  cards           Card[]
  userPreferences UserPreference[]
}

model Siman {
  id          String           @id @default(cuid())
  section     Section
  number      Int
  displayName String?
  cards       Card[]
  preferences UserPreference[] @relation("CurrentSiman")

  @@unique([section, number])
}

model Card {
  id        String   @id @default(cuid())
  userId    String
  simanId   String
  front     String
  back      String
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  user  User  @relation(fields: [userId], references: [id], onDelete: Cascade)
  siman Siman @relation(fields: [simanId], references: [id], onDelete: Restrict)

  @@index([userId])
  @@index([simanId])
  @@index([userId, simanId])
}

model UserPreference {
  id             String @id @default(cuid())
  userId         String @unique
  currentSimanId String?

  user         User   @relation(fields: [userId], references: [id], onDelete: Cascade)
  currentSiman Siman? @relation("CurrentSiman", fields: [currentSimanId], references: [id], onDelete: SetNull)
}
```

```text
# ui-screens

## /
[Text: MachonCards]
[Data: UserPreference.findUnique({userId})]
[Text: Aktuális szimán: {currentSimanId}]
[Text: Kártyák száma: {cardCount}]
[Button: Gyakorlás -> /study]
[Button: Új kártya -> /cards/new]
[Button: Szimán választása -> /siman]
[Table: columns=front,back; rows=Card.findMany(where: userId={userId}); rowLink=/cards/{id}]

## /cards/new
[Text: Új kártya]
[Input: front (textarea, required) placeholder="Előlap"]
[Input: back (textarea, required) placeholder="Hátlap"]
[Input: simanId (text, required) placeholder="Szimán"]
[Button: Mentés -> Card.create()]
[Link: Mégse -> /]

## /cards/[id]
[Data: Card.findUnique({id})]
[Text: Kártya szerkesztése]
[Input: front (textarea, required) placeholder="{front}"]
[Input: back (textarea, required) placeholder="{back}"]
[Input: simanId (text, required) placeholder="{simanId}"]
[Button: Mentés -> Card.update({id})]
[Button: Törlés -> Card.delete({id})]
[Link: Vissza -> /]

## /siman
[Text: Szimán választása]
[Text: Orach Chaim]
[List: rows=Siman.findMany()]
[Text: Yoreh De'ah]
[List: rows=Siman.findMany()]
[Text: Even HaEzer]
[List: rows=Siman.findMany()]
[Text: Choshen Mishpat]
[List: rows=Siman.findMany()]
[Button: Aktuális szimán beállítása -> UserPreference.update({userId})]

## /study
[Data: UserPreference.findUnique({userId})]
[Text: Gyakorlás]
[Text: Aktuális szimán: {currentSimanId}]
[Text: Kérdés]
[Text: {front}]
[Button: Válasz mutatása -> /study]
[Text: Válasz]
[Text: {back}]
[Button: Következő -> /study]

## /import
[Text: Mochi import]
[Input: front (text, required) placeholder="Mochi export fájl"]
[Button: Import -> /import]
[Text: Import eredménye]
[Link: Dashboard -> /]
```

```text
# navigation
[Nav: Dashboard -> /, Gyakorlás -> /study, Szimánok -> /siman, Új kártya -> /cards/new, Import -> /import]
```

```text
# constraints
- Ne túltervezzük az első verziót: csak a szükséges flashcard CRUD, szimánkezelés, egyszerű gyakorlás és Mochi import készüljön el.
- Nincs spaced repetition, Anki-szerű algoritmus, statisztikai dashboard, streak, gamification vagy achievement.
- Nincs AI-integráció.
- Nincs WebSocket vagy realtime sync.
- Nincs offline-first működés vagy PWA.
- Nincs komplex tag- vagy deck-rendszer.
- A fő struktúra: Sulchán Áruch → rész → szimán → kártyák.
- A Sulchán Áruch struktúrája és a felhasználói kártyák legyenek különválasztva.
- Egy kártya alapvetően front + back + siman + user.
- A cross-device működést a szerveroldali PostgreSQL adatbázis biztosítja.
- Az auth legyen elkülönített getCurrentUser() boundary mögött, és a fejlesztés korai szakaszában egy tesztfelhasználóval is működhessen.
- Ne legyen külön mikroszerviz vagy komplex REST API-réteg.
- Ne használjunk Dockert; deployment PM2 + nginx + PostgreSQL környezetben történjen.
- Az UI legyen egyszerű, gyors, reszponzív és mobil/tablet használatra kényelmes.
- A gyakorlási workflow legyen könnyen módosítható és bővíthető későbbi tapasztalatok alapján.
```

```text
# development-order
1. Next.js + TypeScript scaffold
2. PostgreSQL + Prisma
3. Adatmodell és Sulchán Áruch szimán-struktúra seedelése
4. Dashboard
5. Kártya CRUD
6. Szimánválasztás + aktuális szimán per user
7. Egyszerű gyakorlási mód
8. Mochi import
9. Reszponzív/mobil UI finomítása
10. Auth bekötése
11. VPS deployment PM2 + nginx
12. Használat közben a gyakorlási workflow további finomítása
```

