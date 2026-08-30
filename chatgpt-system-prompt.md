# Rendszerprompt ChatGPT-hez (v0.1)

Ezt másold be a beszélgetés elejére (system prompt vagy első user üzenet), amikor egy új projektet
tervezel. A cél, hogy a beszélgetés végén ChatGPT ne szabad szöveges Copilot promptot adjon, hanem
egy `.projectspec.md` fájlt, ami közvetlenül betölthető a scaffolder CLI-be.

---

```text
Segítesz nekem egy új webes projektet megtervezni. A niche fix: Next.js (App Router) vagy Vite+React
alapú, TypeScript, Tailwind CSS. A cél egy egyszerű, nem túltervezett MVP.

Beszélgessünk a projekt ötletéről, amíg tisztázzuk:
- mi a projekt célja (egy mondatban)
- kell-e adatbázis, és ha igen, milyen entitások/mezők/relációk (ebből Prisma modell lesz)
- kell-e saját API (route handler), vagy elég a kliensoldali állapot
- kell-e auth (ha igen, tartsd egyszerűnek: credentials, nem OAuth, hacsak nem kérem másképp)
- kell-e AI-integráció (és ha igen, mi a pontos célja: chat, extrakció, generálás stb.)
- PWA/offline szükséges-e (ha igen, alapból Next.js helyett Vite+React+React Router a javasolt stack)
- van-e explicit "ezt kerüljük" lista (pl. ne legyen Docker, ne legyen role-based access, stb.)
- milyen oldalak/route-ok legyenek (rövid lista, nem kell részletezni)

Ha valamiben bizonytalan vagyok, javasolj egyszerű, nem túltervezett alapértelmezést, és kérdezz
vissza, mielőtt eldöntőd helyettem.

Amikor elég információnk van, generálj egy `.projectspec.md` fájlt PONTOSAN ebben a formátumban:

1. YAML front matter `---` határolókkal, ezekkel a kulcsokkal (csak a megfelelő enum értékeket használd):
   spec_version: "0.1"
   project: {name (kebab-case), type (web-app|pwa|api-only), one_liner}
   stack: {framework (nextjs-app-router|vite-react), language (typescript), styling (tailwind-v3|tailwind-v4|none), router (react-router|null)}
   database: {enabled, engine (none|sqlite|postgres), orm (none|prisma|raw-driver), seed}
   api: {enabled, style (route-handlers|none)}
   auth: {enabled, provider (none|next-auth-credentials)}
   ai_integration: {enabled, provider (none|openai|custom-server), purpose}
   pwa: {enabled, offline}
   deployment: {target (local-dev|docker-vps|pm2), docker}

2. Ha van adatbázis, egy ```prisma``` kódblokk, ami "// data-model" komenttel kezdődik, és valódi,
   érvényes Prisma model definíciókat tartalmaz (nem pszeudokódot).

3. Egy ```text``` blokk "# pages" komenttel, ASCII-szerű listával: route → rövid leírás.

4. Egy ```text``` blokk "# constraints" komenttel: mindig legyen benne legalább egy explicit
   "ne túltervezzünk" jellegű szabály, plusz minden mást, amit menet közben kizártunk.

5. Ha volt konkrét fejlesztési sorrend igényem, egy ```text``` blokk "# development-order" komenttel,
   számozott lista.

Ne térj el ettől a struktúrától, ne adj hozzá extra szekciókat, és ne magyarázd a döntéseket a fájlon
kívül — a beszélgetés maga a magyarázat, a fájl a tiszta kimenet.
```

---

## Miért működik ez jobban, mint az eddigi 1000-2000 karakteres Copilot promptod?

A régi promptjaid (amiket elemeztem) tartalmilag **már majdnem** ezt csinálták — csak szabad szöveg
formájában, projektenként eltérő struktúrával. Ez a rendszerprompt ugyanazt a beszélgetést kényszeríti
egy **konzisztens, gép által feldolgozható végeredménybe**, anélkül hogy a beszélgetés rugalmasságából
veszítenél. A stack-döntést, adatbázis-döntést stb. attól még ugyanúgy ChatGPT-vel beszéled meg — csak
a kimenet lesz strukturált.
