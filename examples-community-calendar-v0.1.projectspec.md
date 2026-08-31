---
spec_version: "0.1"

project:
  name: community-calendar
  type: web-app
  one_liner: >
    A modern web application for managing recurring Jewish community
    events based on the Hebrew calendar.

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
  provider: next-auth-credentials

ai_integration:
  enabled: false
  provider: none
  purpose: null

pwa:
  enabled: false
  offline: false

deployment:
  target: docker-vps
  docker: true
---

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
  type          String   // "Yahrzeit" | "Birthday", bővíthető
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

```text
# pages
/                     → dashboard: gyors áttekintés, közelgő események
/calendar             → havi/heti naptár nézet, tag/típus szűrővel
/people               → személyek listája, kereséssel, hiányzó adat szűrőkkel
/import               → spreadsheet-szerű beillesztős import (Excel/Sheets paste)
/settings             → tag-ek és event típusok kezelése
```

```text
# constraints
- Ne vezess be Docker/Kubernetes/Redis-t, hacsak nem elengedhetetlen.
- Ne építs enterprise-szintű funkciókat vagy jogosultságkezelést.
- Egyszerű credentials-alapú auth elég, nincs szükség OAuth-ra.
- Kerüld a felesleges dialógusokat, preferáld az inline szerkesztést.
- Az architektúra legyen bővíthető (pl. új event típusok), de az MVP maradjon egyszerű.
- Ha valami alulspecifikált, válassz egyszerűbb megoldást a bonyolultabb helyett.
```

```text
# development-order
1. Projekt + adatbázis + alap dashboard
2. Core CRUD (Person, Event, Tag)
3. Naptár nézetek (heti/havi), Hebrew ↔ Gregorian konverzióval
4. Import (spreadsheet paste)
5. Export (.ics, printable HTML)
```
