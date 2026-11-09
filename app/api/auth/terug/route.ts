import { NextResponse, type NextRequest } from "next/server";
import { config } from "../../../../lib/config";
import { naarMislukt, opnieuw, OPNIEUWCOOKIE, redenVanDienst, TERUGCOOKIE, veiligTerug } from "../../../../lib/inloggen";
import { InlogFout, wisselCode } from "../../../../lib/oidc";
import { leesSessie, maakSessie, neemPoging, SESSIECOOKIE } from "../../../../lib/sessie";

export const dynamic = "force-dynamic";

/**
 * Terugkeer van Keycloak: code wisselen, sessie maken, cookie zetten.
 *
 * Gaat het mis, dan nooit een kale foutmelding (in de zijbalk van
 * LibreOffice of het aanmeldvenster van Office staat die anders als tekst):
 * - al ingelogd (terugknop, tweede tabblad): gewoon door;
 * - inlogpoging verlopen of code al gebruikt: één keer vanzelf opnieuw;
 * - verder: een pagina met uitleg en een knop Opnieuw inloggen.
 */
export async function GET(req: NextRequest) {
  const p = req.nextUrl.searchParams;
  const code = p.get("code");
  const state = p.get("state");
  const poging = state ? neemPoging(state) : null;
  const terug = veiligTerug(poging?.terugNaar ?? req.cookies.get(TERUGCOOKIE)?.value);
  const alEerder = req.cookies.has(OPNIEUWCOOKIE);

  const fout = p.get("error");
  if (fout) {
    console.warn("inloggen: de inlogdienst gaf", fout, p.get("error_description") ?? "");
    return naarMislukt(req, redenVanDienst(fout), terug);
  }

  if (!code || !poging) {
    if (leesSessie(req.cookies.get(SESSIECOOKIE)?.value)) return NextResponse.redirect(new URL(terug, config.oidc.basisUrl()));
    return alEerder ? naarMislukt(req, "verlopen", terug) : opnieuw(req, terug);
  }

  try {
    const { identiteit, accessToken } = await wisselCode(code, poging.verifier);
    const sleutel = maakSessie(identiteit, accessToken);
    const r = NextResponse.redirect(new URL(terug, config.oidc.basisUrl()));
    r.cookies.set(SESSIECOOKIE, sleutel, {
      httpOnly: true,
      secure: config.oidc.basisUrl().startsWith("https://"),
      sameSite: "lax",
      path: "/",
      maxAge: config.sessieUren * 3600,
    });
    r.cookies.delete(OPNIEUWCOOKIE);
    // TERUGCOOKIE blijft staan (verloopt vanzelf): na de terugknop kom je dan nog steeds op de goede plek.
    return r;
  } catch (e) {
    console.error("inloggen:", e);
    if (e instanceof InlogFout && e.soort === "code-ongeldig") return alEerder ? naarMislukt(req, "verlopen", terug) : opnieuw(req, terug);
    return naarMislukt(req, e instanceof InlogFout && e.soort === "dienst" ? "dienst" : "onbekend", terug);
  }
}
