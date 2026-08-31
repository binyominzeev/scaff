# Hogyan zárd le megbízhatóan a tervezőbeszélgetést

Ez azt írja le, **pontosan mit csinálj a beszélgetés végén**, hogy a kimenet megbízhatóan a helyes
`.projectspec.md` formátumban jöjjön létre — függetlenül attól, hogy a tervezőbeszélgetés milyen
hosszú vagy kanyargós volt.

Az alapelv: **ne a hosszú beszélgetés végén, felhígult kontextusból generáltass** — zárd le a
tervezést egy tömör összefoglalóval, és a tényleges generálást indítsd egy vadonatúj, tiszta
beszélgetésben. Így a formátum-instrukció mindig friss, közvetlenül a generálás előtt van.

---

## 1. lépés — Fejezd be a tervezőbeszélgetést egy összefoglaló-kéréssel

A tervezőbeszélgetés végén írd be szó szerint:

```text
Foglald össze a projektet egy tömör, strukturált listában, amit egy másik beszélgetésbe át tudok
másolni. Ne prózában írd, hanem pontokban, ezekkel a szekciókkal:

- Projekt: név, típus, egy mondatos leírás
- Stack: framework, styling, kell-e router
- Adatbázis: motor, ORM, és minden entitás a mezőivel és relációival
- API: kell-e, milyen stílusban
- Auth: kell-e, milyen módszerrel
- AI-integráció: kell-e, mi a célja
- PWA: kell-e, offline-e
- Deployment: cél, kell-e Docker
- Képernyők: minden oldal, rajta milyen elemek (inputok, gombok, táblázatok/listák a
  hozzájuk tartozó adatművelettel), és honnan érik el (melyik másik oldalról linkelünk rá)
- Navigáció: mely oldalak legyenek az állandó menüben
- Korlátok: mit zártunk ki, mire figyeljünk
- Fejlesztési sorrend: ha volt ilyen megbeszélve
```

Ez az összefoglaló még **nem** a végleges spec-formátum — csak egy tömör, mindenre kiterjedő
jegyzet, amit a modell egy rövid válaszban vissza tud adni.

## 2. lépés — Másold ki az összefoglalót

Egyszerűen jelöld ki és másold a ChatGPT válaszát.

## 3. lépés — Nyiss egy vadonatúj beszélgetést

Ez a lépés a lényeg. Ne ugyanabban a szálban kérd a generálást — a hosszú tervezőbeszélgetés
üzenetei (még ha technikailag a kontextusban is maradnak) felhígítják a korai formátum-instrukció
súlyát. Egy friss beszélgetésben a formátum-instrukció az **egyetlen** dolog, amire a modellnek
figyelnie kell.

## 4. lépés — Egyetlen üzenetben told be a generátor-promptot + az összefoglalót

Nyisd meg a `chatgpt-generator-prompt.md`-t, másold be a teljes tartalmát, közvetlenül utána
(ugyanabba az üzenetbe) illeszd be a 2. lépésben kimásolt összefoglalót. Küldd el.

## 5. lépés — Mentsd el a kapott fájlt, és futtasd le a scaffoldot

```bash
node scaffold.mjs uj-projekt.projectspec.md
```

A CLI validál (JSON Schema a front matterre) és figyelmeztet (árva oldalak, feloldhatatlan
`{field}` hivatkozások). Ha van figyelmeztetés vagy hibaüzenet:

- **Séma-hiba** (pl. rossz enum-érték egy mezőben): nyisd meg a `.md` fájlt, és javítsd a
  hibaüzenetben jelzett mezőt kézzel — ezek jellemzően egy-két szavas javítások.
- **Árva oldal figyelmeztetés**: adj hozzá egy `[Button]`/`[Link]`-et valahonnan a jelzett route-ra,
  vagy vedd fel a `# navigation` blokkba.
- **Feloldhatatlan `{field}` figyelmeztetés**: tedd be a hiányzó `[Data: Model.findUnique({param})]`
  tokent a képernyőre.

Ezután futtasd újra a scaffoldot — ha nincs több figyelmeztetés, kész.

---

## Miért megbízhatóbb ez, mint az összes formátum-instrukciót egyetlen hosszú beszélgetésben tartani?

A generálás pillanatában a modell kontextusa: **kizárólag** a generátor-prompt (tömör,
egyértelmű, semmi más nem versenyez vele a figyelméért) + a te tömör összefoglalód. Nincs 40
üzenetnyi oda-vissza a stack-választásról, nincs elkalandozás, nincs esély, hogy a formátum egy
apró részlete (pl. a `[Data:]` token vagy a `{field}` szabály) elsikkad a beszélgetés közepén. A
"drága" rész (a projekt tényleges kitalálása) és az "olcsó, mechanikus" rész (a formátumra fordítás)
két külön lépés — pontosan úgy, ahogy maga a `.projectspec.md` koncepció is szétválasztja a
kreatív tervezést a determinisztikus generálástól.
