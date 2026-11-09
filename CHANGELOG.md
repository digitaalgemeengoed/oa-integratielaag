# Wijzigingen

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
