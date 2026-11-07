# oa-integratielaag

De **integratielaag** van de Office Assistent, in Next.js. Stelt vast wie er belt en geeft de aanroep door aan de juiste ingang. De browser praat alleen met deze laag; tokens komen nooit in de werkomgeving.

> Onderdeel van het werkende prototype van de Office Assistent. Een prototype, geen product.

## Twee ingangen

| Ingang | Pad | Wat |
|---|---|---|
| Lezend | `/api/lees/...` | Snelle vragen aan de Object Service (alleen GET) en de assistent-services. Commit nooit. |
| Vastleggend | `/api/vastleg/...` | Objecten aanmaken, metadata en versies vastleggen, objecttypen publiceren (rol beheerder). Elke aanroep levert in het platform een gebeurtenis op. |

Beide ingangen werken met een witte lijst (`lib/routes.ts`): wat daar niet staat, bestaat niet. Elke aanroep die geen GET is, moet de kop `x-oa-verzoek: 1` dragen; een formulier van een andere site kan die niet sturen.

## Inloggen

- `OA_AUTH=oidc`: authorization code flow met PKCE bij Keycloak. De laag is een vertrouwelijke client en bewaart het token aan de serverkant; de browser krijgt alleen een willekeurige sessiesleutel in een httpOnly-cookie. De gemeente komt uit de claim `gemeente`, de rollen uit de realm-rollen.
- `OA_AUTH=dev`: vaste testgebruikers zonder inlog, voor ontwikkeling en afgeschermde demo's. Nooit met echte gegevens.

Een leverancier (claim `leverancier`) wordt in fase 1 geweigerd. De delegatie die de gemeente zelf verleent en intrekt, wordt in fase 3 per aanroep getoetst (`toetsDelegatie`, OA-ADR-004).

Sessies staan in het prototype in het geheugen van één proces. Voor meer instanties hoort hier Redis of PostgreSQL.

## Bouwen en draaien

De demo-werkomgeving moet in `public/` staan **vóór** `next build`; Next.js levert alleen bestanden uit die er bij het bouwen al waren.

```
node scripts/werkomgeving.mjs ../oa-adapters/dist/werkomgeving
npm run build
npm start          # poort 3000
```

Omgevingsvariabelen staan in `lib/config.ts`.

## Licentie

© 2026 Gemeente Haarlem. EUPL 1.2, zie `LICENSE`.

Gemaakt door Erik Hoekstra, programma-architect en senior consultant, afdeling i-Ontwikkeling, Gemeente Haarlem, met assistentie van Claude (Anthropic).
