import type { NextRequest } from "next/server";
import type { Actor, WieBenIk } from "@oa/contract";
import { config } from "./config";
import { leesSessie, SESSIECOOKIE } from "./sessie";
import { Weigering } from "./antwoord";

/** Testgebruikers voor OA_AUTH=dev. Nooit in een omgeving met echte gegevens. */
const DEV_GEBRUIKERS: Record<string, WieBenIk> = {
  "haarlem-medewerker": { sub: "dev-haarlem-1", naam: "Femke de Vries", gemeente: "haarlem", rollen: ["medewerker"] },
  "haarlem-beheerder": { sub: "dev-haarlem-2", naam: "Jeroen Bakker", gemeente: "haarlem", rollen: ["medewerker", "beheerder"] },
  "zandvoort-medewerker": { sub: "dev-zandvoort-1", naam: "Sanne Visser", gemeente: "zandvoort", rollen: ["medewerker"] },
};

/**
 * Stelt vast wie er belt. Elke aanroep naar het platform of de diensten
 * gaat hierdoorheen; een aanroep die de integratielaag overslaat, komt niet voor.
 */
export function wieBeltEr(req: NextRequest): WieBenIk {
  if (config.authModus() === "dev") {
    const kies = req.headers.get("x-oa-dev-gebruiker") ?? req.cookies.get("oa_dev_gebruiker")?.value ?? "haarlem-medewerker";
    const g = DEV_GEBRUIKERS[kies];
    if (!g) throw new Weigering(401, "niet-ingelogd", "Onbekende testgebruiker.");
    return g;
  }
  const s = leesSessie(req.cookies.get(SESSIECOOKIE)?.value);
  if (!s) throw new Weigering(401, "niet-ingelogd", "Log eerst in.");
  return s.identiteit;
}

/**
 * Toetst of deze identiteit nu mag handelen. Fase 1: een leverancier mag nog
 * niets; de delegatie die de gemeente zelf verleent en intrekt, komt in fase 3
 * (OA-ADR-004) en wordt hier per aanroep getoetst.
 */
export function toetsDelegatie(w: WieBenIk): void {
  if (w.namens) throw new Weigering(403, "geen-delegatie", "Handelen namens een gemeente kan pas met een delegatie (fase 3).");
  if (!w.rollen.includes("medewerker")) throw new Weigering(403, "geen-rol", "Deze gebruiker heeft geen rol medewerker.");
}

/** Vastleggen vereist een aangepaste kop: een formulier van een andere site kan die niet sturen. */
export function toetsHerkomst(req: NextRequest): void {
  if (req.headers.get("x-oa-verzoek") !== "1") {
    throw new Weigering(403, "herkomst", "Dit verzoek komt niet van het paneel.");
  }
}

export function naarActor(w: WieBenIk): Actor {
  return { sub: w.sub, naam: w.naam, ...(w.namens ? { namens: w.namens } : {}) };
}
