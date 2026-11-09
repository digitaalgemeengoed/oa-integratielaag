import { NextResponse, type NextRequest } from "next/server";
import { eigenAdres } from "../../../../lib/adres";
import { config } from "../../../../lib/config";
import { naarMislukt, TERUGCOOKIE, veiligTerug } from "../../../../lib/inloggen";
import { inlogAdres } from "../../../../lib/oidc";
import { bewaarPoging, nieuweSleutel, POGING_MINUTEN } from "../../../../lib/sessie";

export const dynamic = "force-dynamic";

/** Begint het inloggen bij Keycloak. ?terug=/pad bepaalt waar je daarna uitkomt. */
export async function GET(req: NextRequest) {
  const terug = veiligTerug(req.nextUrl.searchParams.get("terug"));

  if (config.authModus() === "dev") {
    const r = NextResponse.redirect(new URL(terug, eigenAdres(req)));
    const gebruiker = req.nextUrl.searchParams.get("gebruiker");
    if (gebruiker) r.cookies.set("oa_dev_gebruiker", gebruiker, { httpOnly: true, sameSite: "lax", path: "/" });
    return r;
  }

  const state = nieuweSleutel();
  let adres: string, verifier: string;
  try {
    ({ adres, verifier } = await inlogAdres(state));
  } catch (e) {
    console.error("inloggen: inlogdienst niet bereikbaar", e);
    return naarMislukt(req, "dienst", terug);
  }
  bewaarPoging(state, { verifier, terugNaar: terug, verloopt: Date.now() + POGING_MINUTEN * 60_000 });
  const r = NextResponse.redirect(adres);
  // Raakt de poging kwijt (verlopen, server herstart), dan weten we nog waar je heen wilde.
  r.cookies.set(TERUGCOOKIE, terug, { httpOnly: true, sameSite: "lax", path: "/", maxAge: 2 * POGING_MINUTEN * 60 });
  return r;
}
