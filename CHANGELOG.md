# Wijzigingen

## 0.9.7 — 2026-11-09

Hangt af van oa-contract 0.6.0; de meting bij bevestigen gaat ongewijzigd door naar het platform.

## 0.9.6 — 2026-11-09

`GET /api/lees/objecttypen/:naam?versie=n`: het paneel haalt het metadatamodel op waarmee een stuk is vastgelegd. De zoekpagina toont titel en categorie via de rollen (ook bij RGBZ of TMLO).

## 0.9.5 — 2026-11-09

Route `POST /api/vastleg/objecten/:id/pii/categorie` (de grondslag van een voorvertoning wijzigen) naar het platform.

## 0.9.4 — 2026-11-09

**Inloggen zonder kale foutmeldingen.** Ging het inloggen mis, dan stond er JSON in de zijbalk of het aanmeldvenster. Nu:

- **Te lang gewacht** op het inlogscherm, of de inloglink al gebruikt (terugknop, tweede tabblad): één keer vanzelf opnieuw inloggen; meestal merk je daar niets van. Lukt dat ook niet, dan de pagina `/inloggen` met uitleg en een knop *Opnieuw inloggen*.
- **Al ingelogd** (terugknop na het inloggen): gewoon door naar waar je heen wilde.
- **Geannuleerd of geweigerd** bij Keycloak, of **Keycloak niet bereikbaar**: dezelfde pagina, met de passende uitleg.
- Een inlogpoging blijft 30 minuten geldig (was 10), gelijk aan Keycloak. Waar je heen wilde, staat ook in een kort cookie, zodat het niet kwijtraakt.
- Was Keycloak één keer onbereikbaar, dan bleef inloggen stuk tot een herstart van de integratielaag. Nu niet meer.
- Verlopen sessies en inlogpogingen worden opgeruimd.

## 0.9.3 — 2026-11-09

- `/versies.json` (openbaar): de versies van het manifest, de extensie en wat op de servers draait, voor de downloadpagina op office.<domein>.
- Het versienummer staat in de bestandsnaam van de downloads: `office-assistent-manifest-0.6.0.0.xml` en `office-assistent-0.11.0.oxt`.

## 0.9.2 — 2026-11-09

Office-manifest 0.6.0.0: knop "Anonimiseer selectie" op het tabblad Assistent en in het rechtermuismenu (Word, Excel ook op een cel, PowerPoint). Opnieuw uploaden.

## 0.9.1 — 2026-11-09

De overzichtspagina toont de versies: wat je zelf installeert (Office-manifest, LibreOffice-extensie; alleen opnieuw als het nummer hoger is) en wat op de servers draait (paneel, adapters, kern, contract, integratielaag, en live van VPS 2 en 3). De manifestversie staat op één plek (`MANIFEST_VERSIE`).

## 0.9.0 — 2026-11-09

- Routes voor anonimiseren in het document: voorvertoningen laten vervallen, bevestigen, terugzetten per gegeven en een versie terugzetten.
- De rol beheerder gaat als informatiebeheer mee naar het platform (beperkte versies lezen).

## 0.8.0 — 2026-11-09

- PPL-niveau uit de Keycloak-rollen `ppl-1`, `ppl-2` en `ppl-3` (de hoogste telt; geen rol is 0). Het niveau gaat mee naar het platform en staat in wie-ben-ik. De dev-gebruikers hebben PPL 1 (medewerker) en PPL 3 (beheerder).
- Routes voor het register van persoonsgegevens: lezen, registreren, inzien, en sleutel vernietigen (alleen beheerder).

## 0.7.1 — 2026-11-09

Routes voor anonimiseren: `POST /api/lees/anonimiseren`, `POST /api/lees/anonimiseren/toepassen`, `POST /api/vastleg/objecten/:id/versies/:n/anonimisering`; de weergave-route geeft `?soort=geanonimiseerd` door. Manifest 0.5.1.0 (Anonimiseren niet meer "volgt").

## 0.7.0 — 2026-11-09

- Manifest 0.5.0.0: een eigen tabblad **Assistent** in Word, Excel en PowerPoint, met Paneel, de modules en Beoordelen. De knoppen werken via een gedeelde runtime (SharedRuntime 1.1: Word vanaf 2205, Excel 2002, PowerPoint 2102, en de webversies). Upload het manifest opnieuw.
- Route `PUT /api/vastleg/objecten/:id/aard` (persoonlijk naar zakelijk).

## 0.6.0 — 2026-11-08

- `/word/manifest.xml` geldt nu voor Word, Excel en PowerPoint (hosts Document, Workbook en Presentation, versie 0.4.0.0). De minimale versie van Office.js controleert het takenvenster per programma. Wie het oude manifest heeft geüpload, uploadt het nieuwe opnieuw.

## 0.5.0 — 2026-11-08

- Collabora: werkbestanden hebben een formaat (docx, ods, odp). Nieuwe voorbeelden: een begroting (ods) en een presentatie (odp), elk met iets voor de assistent. De editor komt per formaat uit de discovery.
- `lib/odf.ts`: rekenbladen en presentaties lezen als secties (`data-oa="blad"` en `"dia"`) en herstellen op een plek (blad hernoemen, titel van een dia, ook zonder titelvak, alternatieve tekst), in content.xml. Route `POST /api/collabora/bestanden/:id/segment`. Het hele bestand vervangen kan voor ods en odp niet.
- Tests (`npm test`): lezen, de regels van oa-services, herstellen, en of LibreOffice de bestanden opent.

## 0.4.0 — 2026-11-08

Leesroute voor weergaven van een versie; `/api/collabora/bestanden/:id/bestand` levert het werkbestand als origineel.

## 0.3.0 — 2026-11-08

- Sessie ook via `Authorization: Bearer`, en `POST /api/auth/koppel` voor een tweede sessiesleutel (Word-invoegtoepassing).
- WOPI-host en werkbestanden voor Collabora Online (`/wopi/files/...`, `/api/collabora/...`).
- `/word/manifest.xml` en `/libreoffice/office-assistent.oxt`, met het adres van de omgeving erin.
- `frame-ancestors`: alleen de eigen pagina's mogen elkaar inbedden; `/word/` ook Word voor het web.

## 0.2.0 — 2026-11-07

Zoeken (`/api/lees/zoeken` en de pagina `/zoeken`), onleesbaar maken voor de rol beheerder, en een sandbox voor uitgeleverde documentinhoud.

## 0.1.0 — 2026-11-07

Fase 1 van het werkende prototype: contract, minimaal platform, integratielaag met twee ingangen, assistentkern, paneel en een demo-werkomgeving met de modules metadateren en toegankelijkheid.
