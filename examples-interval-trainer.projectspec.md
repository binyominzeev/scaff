---
spec_version: "0.1"

project:
  name: interval-trainer
  type: pwa
  one_liner: >
    Mobil-first, offline-képes Progressive Web App intervallumos edzéstervek
    összeállítására és lejátszására.

stack:
  framework: vite-react
  language: typescript
  styling: tailwind-v4
  router: react-router

database:
  enabled: false
  engine: none
  orm: none
  seed: false

api:
  enabled: false
  style: none

auth:
  enabled: false
  provider: none

ai_integration:
  enabled: true
  provider: custom-server
  purpose: "magyar nyelvű AI edző chat, helyi Node szerverhez kötve"

pwa:
  enabled: true
  offline: true

deployment:
  target: pm2
  docker: false
---

```text
# pages
/                     → Gyakorlatok: piktogram + magyar név + kategória lista, kereső, szűrő
/plan                 → Edzésterv szerkesztése: munkaidő, pihenőidő, sorrend
/playback             → Lejátszás: nagy piktogram, visszaszámláló, munka/pihenő állapot
/coach                → AI edző: helyi profil és beszélgetési előzmény
```

```text
# constraints
- Ne használj Next.js-t.
- Ne duplikáld a logikát, használj jól elkülönített React komponenseket.
- Ne készíts olyan funkciókat, amelyeket nem kértem.
- Az MVP legyen egyszerű, letisztult és működőképes.
- Ha valamiben bizonytalan vagy, inkább egyszerűbb megoldást válassz, mint túltervezettet.
```
