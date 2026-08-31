---
spec_version: "0.2"

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
  type          String
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
# ui-screens

## /
┌─────────────────────────────────────────┐
│ Community Calendar                       │
│ [Text: Közelgő események]                │
│ [Table: columns=hebrewDate,type; rows=Event.findMany(); rowLink=/people/{personId}] │
└─────────────────────────────────────────┘

## /calendar
┌─────────────────────────────────────────┐
│ Naptár                                   │
│ [Text: Havi/heti nézet]                  │
│ [Table: columns=hebrewDate,type; rows=Event.findMany(); rowLink=/people/{personId}] │
└─────────────────────────────────────────┘

## /people
┌─────────────────────────────────────────┐
│ Személyek                                │
│ [Input: search (text) placeholder="Keresés..."] │
│ [Table: columns=displayName,hebrewName; rows=Person.findMany(); rowLink=/people/{id}] │
│ [Button: Új személy -> /people/new]      │
└─────────────────────────────────────────┘

## /people/[id]
┌─────────────────────────────────────────┐
│ [Data: Person.findUnique({id})]          │
│ {displayName}                            │
│ [Text: {hebrewName}]                       │
│ [Table: columns=hebrewDate,type,remarks; rows=Event.findMany(where: personId={id})] │
│ [Button: Szerkesztés -> /people/{id}/edit] │
│ [Link: Vissza -> /people]                │
└─────────────────────────────────────────┘

## /people/new
┌─────────────────────────────────────────┐
│ Új személy                               │
│ [Input: displayName (text, required)]    │
│ [Input: hebrewName (text)]               │
│ [Input: notes (textarea)]                │
│ [Button: Mentés -> Person.create()]      │
│ [Link: Mégse -> /people]                 │
└─────────────────────────────────────────┘

## /people/[id]/edit
┌─────────────────────────────────────────┐
│ {displayName} szerkesztése               │
│ [Input: displayName (text, required)]    │
│ [Input: hebrewName (text)]               │
│ [Input: notes (textarea)]                │
│ [Button: Mentés -> Person.update({id})]  │
│ [Link: Mégse -> /people/{id}]            │
└─────────────────────────────────────────┘

## /import
┌─────────────────────────────────────────┐
│ Import                                   │
│ [Text: Illeszd be a spreadsheet adatokat] │
│ [Input: pasteArea (textarea)]            │
│ [Button: Feldolgozás -> /import]         │
└─────────────────────────────────────────┘

## /settings
┌─────────────────────────────────────────┐
│ Beállítások                              │
│ [Table: columns=name; rows=Tag.findMany()] │
│ [Button: Új tag -> Tag.create()]         │
└─────────────────────────────────────────┘
```

```text
# navigation
[Nav: Dashboard -> /, Naptár -> /calendar, Személyek -> /people, Import -> /import, Beállítások -> /settings]
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
2. Core CRUD (Person, Event, Tag) a wireframe-ek szerint
3. Naptár nézetek (heti/havi), Hebrew ↔ Gregorian konverzióval
4. Import (spreadsheet paste)
5. Export (.ics, printable HTML)
```
