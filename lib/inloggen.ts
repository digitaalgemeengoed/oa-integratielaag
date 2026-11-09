import { NextResponse, type NextRequest } from "next/server";
import { eigenAdres } from "./adres";

/**
 * Wat er bij het inloggen mis kan gaan, en hoe de medewerker er weer uit
 * komt. Nooit een kale foutmelding: of we proberen het één keer vanzelf
 * opnieuw, of er komt een pagina met uitleg en een knop.
 */
export type Reden =
  /** De inlogpoging is verlopen of al gebruikt (te lang gewacht, terugknop, tweede tabblad). */
  | "verlopen"
  /** Geannuleerd of geweigerd bij de inlogdienst. */
  | "geweigerd"
  /** De inlogdienst (Keycloak) is niet bereikbaar of gaf een fout. */
  | "dienst"
  /** Iets anders; staat in het logboek van de server. */
  | "onbekend";

/** Waar je na het inloggen uitkomt, voor als de inlogpoging zelf kwijt is. */
export const TERUGCOOKIE = "oa_inlog_terug";
/** Net al vanzelf opnieuw geprobeerd: niet nog eens, anders draait het rond. */
export const OPNIEUWCOOKIE = "oa_inlog_opnieuw";

export function veiligTerug(terug: string | null | undefined): string {
  return terug && terug.startsWith("/") && !terug.startsWith("//") && !terug.startsWith("/\\") ? terug : "/";
}

/** Naar de pagina met uitleg. */
export function naarMislukt(req: NextRequest, reden: Reden, terug: string): NextResponse {
  const u = new URL("/inloggen", eigenAdres(req));
  u.searchParams.set("reden", reden);
  u.searchParams.set("terug", veiligTerug(terug));
  const r = NextResponse.redirect(u);
  r.cookies.delete(OPNIEUWCOOKIE);
  return r;
}

/** Eén keer vanzelf opnieuw inloggen; meestal merkt de medewerker er niets van (Keycloak kent hem nog). */
export function opnieuw(req: NextRequest, terug: string): NextResponse {
  const u = new URL("/api/auth/login", eigenAdres(req));
  u.searchParams.set("terug", veiligTerug(terug));
  const r = NextResponse.redirect(u);
  r.cookies.set(OPNIEUWCOOKIE, "1", { httpOnly: true, sameSite: "lax", path: "/", maxAge: 120 });
  return r;
}

/** De codes die Keycloak in ?error= teruggeeft, vertaald. */
export function redenVanDienst(error: string): Reden {
  if (error === "access_denied" || error === "consent_required" || error === "interaction_required" || error === "login_required") return "geweigerd";
  if (error === "temporarily_unavailable" || error === "server_error") return "dienst";
  return "onbekend";
}
