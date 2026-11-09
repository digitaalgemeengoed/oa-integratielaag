import type { NextRequest } from "next/server";
import type { Actor, Ppl, WieBenIk } from "@digitaalgemeengoed/oa-contract";
import { config } from "./config";
import { leesSessie, SESSIECOOKIE } from "./sessie";
import { Weigering } from "./antwoord";

/** Testgebruikers voor OA_AUTH=dev. Nooit in een omgeving met echte gegevens. */
const DEV_GEBRUIKERS: Record<string, WieBenIk> = {
  "haarlem-medewerker": { sub: "dev-haarlem-1", naam: "Femke de Vries", gemeente: "haarlem", rollen: ["medewerker", "ppl-1"], niveau: 1 },
  "haarlem-beheerder": { sub: "dev-haarlem-2", naam: "Jeroen Bakker", gemeente: "haarlem", rollen: ["medewerker", "beheerder", "ppl-3"], niveau: 3 },
  "zandvoort-medewerker": { sub: "dev-zandvoort-1", naam: "Sanne Visser", gemeente: "zandvoort", rollen: ["medewerker", "ppl-1"], niveau: 1 },
};

/**
 * Stelt vast wie er belt. Elke aanroep naar het platform of de diensten
 * gaat hierdoorheen; een aanroep die de integratielaag overslaat, komt niet voor.
 */
export function wieBeltEr(req: NextRequest): WieBenIk {
  if (config.authModus() === "dev") {
    const kop = req.headers.get("authorization");
    const viaKop = kop?.startsWith("Bearer dev:") ? kop.slice(11) : null;
    const kies = viaKop ?? req.headers.get("x-oa-dev-gebruiker") ?? req.cookies.get("oa_dev_gebruiker")?.value ?? "haarlem-medewerker";
    const g = DEV_GEBRUIKERS[kies];
    if (!g) throw new Weigering(401, "niet-ingelogd", "Onbekende testgebruiker.");
    return g;
  }
  const s = leesSessie(sessiesleutel(req));
  if (!s) throw new Weigering(401, "niet-ingelogd", "Log eerst in.");
  return s.identiteit;
}

/**
 * De sessiesleutel: uit het cookie, of uit de kop "Authorization: Bearer".
 * De kop is voor werkomgevingen waar het cookie niet aankomt, zoals een
 * Office-invoegtoepassing in een iframe van office.com. Een kop stuurt een
 * andere site nooit vanzelf mee, dus CSRF speelt daar niet.
 */
export function sessiesleutel(req: NextRequest): string | undefined {
  const kop = req.headers.get("authorization");
  if (kop?.startsWith("Bearer ")) return kop.slice(7).trim() || undefined;
  return req.cookies.get(SESSIECOOKIE)?.value;
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
  return {
    sub: w.sub,
    naam: w.naam,
    niveau: w.niveau ?? 0,
    // Informatiebeheer: mag versies lezen die alleen nog voor beheer zijn.
    ...(w.rollen?.includes("beheerder") ? { beheerder: true } : {}),
    ...(w.namens ? { namens: w.namens } : {}),
  };
}

/** PPL-niveau uit de realm-rollen ppl-1, ppl-2 en ppl-3: de hoogste telt. Geen rol = 0. */
export function niveauUitRollen(rollen: string[]): Ppl {
  let n = 0;
  for (const r of rollen) {
    const m = /^ppl-([123])$/.exec(r);
    if (m) n = Math.max(n, Number(m[1]));
  }
  return n as Ppl;
}
