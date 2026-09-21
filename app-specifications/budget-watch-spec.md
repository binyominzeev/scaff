---
spec_version: "0.2"
project:
  name: daily-budget
  type: pwa
  one_liner: "Dinamikusan kiszámolja, hogy a felhasználó aktuális pénzügyi helyzete alapján mennyit költhet naponta úgy, hogy a tervezett kiadások és megtakarítási cél teljesüljön."
stack:
  framework: nextjs-app-router
  language: typescript
  styling: tailwind-v4
  router: null
database:
  enabled: true
  engine: sqlite
  orm: prisma
  seed: true
api:
  enabled: true
  style: route-handlers
auth:
  enabled: true
  provider: pocket-id-oidc
ai_integration:
  enabled: false
  provider: none
  purpose: ""
pwa:
  enabled: true
  offline: false
deployment:
  target: pm2
  docker: false
---

```prisma
// data-model

model User {
  id              String           @id
  createdAt       DateTime         @default(now())
  updatedAt       DateTime         @updatedAt
  budgets         Budget[]
  expenses        Expense[]
  plannedExpenses PlannedExpense[]
}

model Budget {
  id            String   @id @default(cuid())
  userId        String
  month         String
  income        Int
  fixedExpenses Int
  savingsTarget Int
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([userId, month])
  @@index([userId])
}

model Expense {
  id          String   @id @default(cuid())
  userId     String
  date        DateTime
  amount      Int
  description String
  category    String?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId, date])
}

enum PlannedExpenseStatus {
  PLANNED
  COMPLETED
  CANCELLED
}

model PlannedExpense {
  id          String                @id @default(cuid())
  userId      String
  date        DateTime
  amount      Int
  description String
  category    String?
  status      PlannedExpenseStatus @default(PLANNED)
  createdAt   DateTime              @default(now())
  updatedAt   DateTime              @updatedAt

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId, date])
  @@index([userId, status])
}
```

```json
# seed-data
{
  "User": [
    {
      "_alias": "demoUser",
      "id": "pocket-demo-user"
    }
  ],
  "Budget": [
    {
      "_alias": "septemberBudget",
      "userId": {
        "$ref": "demoUser"
      },
      "month": "2026-09",
      "income": 500000,
      "fixedExpenses": 180000,
      "savingsTarget": 100000
    }
  ],
  "Expense": [
    {
      "_alias": "groceriesExpense",
      "userId": {
        "$ref": "demoUser"
      },
      "date": "2026-09-18T12:00:00.000Z",
      "amount": 12500,
      "description": "Bevásárlás",
      "category": "Élelmiszer"
    },
    {
      "_alias": "transportExpense",
      "userId": {
        "$ref": "demoUser"
      },
      "date": "2026-09-20T12:00:00.000Z",
      "amount": 4500,
      "description": "Közlekedés",
      "category": "Közlekedés"
    }
  ],
  "PlannedExpense": [
    {
      "_alias": "plannedPurchase",
      "userId": {
        "$ref": "demoUser"
      },
      "date": "2026-09-27T12:00:00.000Z",
      "amount": 30000,
      "description": "Tervezett nagyobb vásárlás",
      "category": "Egyéb",
      "status": "PLANNED"
    }
  ]
}
```

```text
# ui-screens

## /
Ma
[Heading: Mai napi keret]
[Text: "Ma elkölthető: {dailyBudget} Ft"]
[Text: "A napi keret az eddigi tényleges költést, a hátralévő napokat, a tervezett kiadásokat és a megtakarítási célt is figyelembe veszi."]
[Heading: Havi állapot]
[Text: "Aktuális havi keret: {monthlyBudget} Ft"]
[Text: "Eddigi költés: {spent} Ft"]
[Text: "Hátralévő keret: {remaining} Ft"]
[Text: "Hátralévő napok: {remainingDays}"]
[Heading: Tervezett nagy kiadások]
[List: rows=PlannedExpense.findMany()]
[Button: "+ Kiadás" -> /expenses/new]
[Button: "+ Tervezett kiadás" -> /planned-expenses/new]
[Button: "Mi lenne, ha?" -> /what-if]
[Link: "Kiadások megtekintése" -> /expenses]
[Link: "Tervezett kiadások megtekintése" -> /planned-expenses]
[Link: "Havi áttekintés" -> /monthly]
[Link: "Beállítások" -> /settings]

## /onboarding
Pénzügyi alapbeállítások
[Input: month (text, required) placeholder="2026-09"]
[Input: income (number, required) placeholder="500000"]
[Input: fixedExpenses (number, required) placeholder="180000"]
[Input: savingsTarget (number, required) placeholder="100000"]
[Text: "A megadott alapadatok alapján kiszámítható a szabadon beosztható összeg."]
[Button: "Mentés" -> Budget.create()]
[Link: "Vissza a Mai oldalra" -> /]

## /expenses
Kiadások
[Table: columns=date,amount,description,category; rows=Expense.findMany(); rowLink=/expenses/{id}]
[Button: "+ Új kiadás" -> /expenses/new]
[Link: "Vissza a Mai oldalra" -> /]

## /expenses/new
Új kiadás
[Input: date (date, required) placeholder="2026-09-21"]
[Input: amount (number, required) placeholder="10000"]
[Input: description (text, required) placeholder="Bevásárlás"]
[Input: category (text) placeholder="Élelmiszer"]
[Button: "Mentés" -> Expense.create()]
[Link: "Mégse" -> /expenses]

## /expenses/[id]
Kiadás részletei
[Data: Expense.findUnique({id})]
[Input: date (date, required) placeholder="2026-09-21"]
[Input: amount (number, required) placeholder="10000"]
[Input: description (text, required) placeholder="Bevásárlás"]
[Input: category (text) placeholder="Élelmiszer"]
[Button: "Mentés" -> Expense.update({id})]
[Button: "Törlés" -> Expense.delete({id})]
[Link: "Vissza a kiadásokhoz" -> /expenses]

## /planned-expenses
Tervezett kiadások
[Table: columns=description,amount,date,status; rows=PlannedExpense.findMany(); rowLink=/planned-expenses/{id}]
[Button: "+ Új tervezett kiadás" -> /planned-expenses/new]
[Button: "Mi lenne, ha?" -> /what-if]
[Link: "Vissza a Mai oldalra" -> /]

## /planned-expenses/new
Új tervezett kiadás
[Input: date (date, required) placeholder="2026-09-27"]
[Input: amount (number, required) placeholder="30000"]
[Input: description (text, required) placeholder="Új vásárlás"]
[Input: category (text) placeholder="Egyéb"]
[Button: "Mentés" -> PlannedExpense.create()]
[Link: "Mégse" -> /planned-expenses]

## /planned-expenses/[id]
Tervezett kiadás részletei
[Data: PlannedExpense.findUnique({id})]
[Input: date (date, required) placeholder="2026-09-27"]
[Input: amount (number, required) placeholder="30000"]
[Input: description (text, required) placeholder="Új vásárlás"]
[Input: category (text) placeholder="Egyéb"]
[Input: status (text, required) placeholder="PLANNED / COMPLETED / CANCELLED"]
[Button: "Mentés" -> PlannedExpense.update({id})]
[Button: "Teljesítettként megjelölés" -> PlannedExpense.update({id})]
[Button: "Törlés" -> PlannedExpense.delete({id})]
[Link: "Mi lenne, ha?" -> /what-if]
[Link: "Vissza a tervezett kiadásokhoz" -> /planned-expenses]

## /what-if
Mi lenne, ha?
[Input: amount (number, required) placeholder="50000"]
[Input: date (date, required) placeholder="2026-09-28"]
[Input: description (text) placeholder="Nagyobb vásárlás"]
[Heading: Jelenlegi helyzet]
[Text: "Jelenlegi napi keret: {currentDailyBudget} Ft"]
[Heading: Vásárlás hatása]
[Text: "Vásárlás után várható napi keret: {simulatedDailyBudget} Ft"]
[Text: "A hátralévő napokra jutó napi keret csökkenése: {dailyDifference} Ft"]
[Button: "Mentés tervezett kiadásként" -> PlannedExpense.create()]
[Link: "Vissza a Mai oldalra" -> /]
[Link: "Tervezett kiadások" -> /planned-expenses]

## /monthly
Havi áttekintés
[Heading: Aktuális hónap]
[Text: "Bevétel: {income} Ft"]
[Text: "Fix kiadások: {fixedExpenses} Ft"]
[Text: "Megtakarítás: {savingsTarget} Ft"]
[Text: "Szabad keret: {freeBudget} Ft"]
[Text: "Tényleges költés: {spent} Ft"]
[Text: "Hátralévő keret: {remaining} Ft"]
[Heading: Kiadások]
[Table: columns=date,description,category,amount; rows=Expense.findMany(); rowLink=/expenses/{id}]
[Heading: Kategóriaösszesítés]
[List: rows=Expense.findMany()]
[Link: "Vissza a Mai oldalra" -> /]

## /settings
Beállítások
[Heading: Pénzügyi alapadatok]
[Table: columns=month,income,fixedExpenses,savingsTarget; rows=Budget.findMany(); rowLink=/settings/budget/{id}]
[Link: "Alapadatok módosítása" -> /settings/budget/{id}]
[Heading: Fiók]
[Text: "A bejelentkezést Pocket ID kezeli."]
[Link: "Vissza a Mai oldalra" -> /]

## /settings/budget/[id]
Pénzügyi alapadatok módosítása
[Data: Budget.findUnique({id})]
[Input: income (number, required) placeholder="500000"]
[Input: fixedExpenses (number, required) placeholder="180000"]
[Input: savingsTarget (number, required) placeholder="100000"]
[Button: "Mentés" -> Budget.update({id})]
[Link: "Vissza a beállításokhoz" -> /settings]
```

```text
# navigation

[Nav: Ma -> /, Kiadások -> /expenses, Tervezett kiadások -> /planned-expenses, Havi áttekintés -> /monthly, Beállítások -> /settings]
```

```text
# constraints

- Ne legyen túltervezett: az első verzió maradjon egyszerű, mobilbarát és dashboard-központú.
- Az alkalmazás nem klasszikus könyvelőprogram, és nem kezel teljes körű bankszámla- vagy tranzakciós adatokat.
- Ne legyen banki API-integráció.
- Ne legyen komplex befektetési funkció.
- Ne legyen AI az alapfunkciókban.
- Ne legyen túl sok kategória vagy beállítás.
- A fő érték a dinamikus napi költési keret.
- A tervezett nagy kiadások első osztályú elemek.
- A pénzügyi számításokat az alapadatokból kell kiszámítani, ne redundáns tárolt összesítésekből.
- A napi keret számítása vegye figyelembe az eddigi tényleges költést, a hátralévő napokat, a tervezett kiadásokat és a megtakarítási célt.
- A napi keret számítási logikája külön, jól tesztelhető shared/server-side business-logic modulban legyen.
- A számítás legyen transzparens: a felhasználó értse, hogy egy nagyobb vásárlás miért csökkenti a későbbi napi keretet.
- Az alkalmazás ne mondja meg, hogy egy vásárlást "szabad-e" megvenni; csak a pénzügyi következményét mutassa.
- Minden pénzügyi adat az autentikált felhasználóhoz tartozzon.
- Pocket ID esetén az issuer, client ID, backend-only client secret és /auth/callback redirect URI konfiguráció szükséges; ezeket az alkalmazás nem találhatja ki és nem tartalmazhatja titkos értékként.
- A generált .env fájlban csak változónevek és szükséges, nem titkos placeholder értékek szerepelhetnek.
- PWA legyen telepíthető és reszponzív, de az első verzióban nem szükséges teljes offline CRUD.
- Deployment saját VPS-en történjen Next.js + Node.js + PM2 + Nginx környezetben.
- Docker nem szükséges.
```

```text
# development-order

1. Projekt scaffolding + SQLite + Prisma.
2. Pocket ID auth és User modell.
3. Havi pénzügyi alapadatok és onboarding.
4. Kiadások CRUD.
5. Dinamikus napi keret számítási algoritmusa.
6. Dashboard / "Ma" képernyő.
7. Tervezett kiadások CRUD.
8. Tervezett kiadások beépítése a napi keret számításába.
9. "Mi lenne, ha?" szimuláció.
10. Havi áttekintés.
11. Beállítások.
12. PWA és mobilos UX finomítása.
13. Tesztek a pénzügyi számításokra.
14. VPS deployment.
```