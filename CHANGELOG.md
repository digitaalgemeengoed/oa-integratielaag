# Wijzigingen

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
