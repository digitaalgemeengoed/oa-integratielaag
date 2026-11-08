# Wijzigingen

## 0.3.0 — 2026-11-08

- Sessie ook via `Authorization: Bearer`, en `POST /api/auth/koppel` voor een tweede sessiesleutel (Word-invoegtoepassing).
- WOPI-host en werkbestanden voor Collabora Online (`/wopi/files/...`, `/api/collabora/...`).
- `/word/manifest.xml` en `/libreoffice/office-assistent.oxt`, met het adres van de omgeving erin.
- `frame-ancestors`: alleen de eigen pagina's mogen elkaar inbedden; `/word/` ook Word voor het web.

## 0.2.0 — 2026-11-07

Zoeken (`/api/lees/zoeken` en de pagina `/zoeken`), onleesbaar maken voor de rol beheerder, en een sandbox voor uitgeleverde documentinhoud.

## 0.1.0 — 2026-11-07

Fase 1 van het werkende prototype: contract, minimaal platform, integratielaag met twee ingangen, assistentkern, paneel en een demo-werkomgeving met de modules metadateren en toegankelijkheid.
