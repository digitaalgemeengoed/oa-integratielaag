import { NextResponse, type NextRequest } from "next/server";
import { behandel, Weigering } from "../../../../lib/antwoord";
import { config } from "../../../../lib/config";
import { toetsHerkomst } from "../../../../lib/identiteit";
import { koppelSessie, leesSessie, SESSIECOOKIE } from "../../../../lib/sessie";

export const dynamic = "force-dynamic";

/**
 * Geeft een sessiesleutel voor een werkomgeving die geen cookie kan
 * gebruiken (de Word-invoegtoepassing). Alleen met het cookie van een
 * ingelogde sessie en de kop x-oa-verzoek; het aanmeldvenster van Office
 * roept dit aan en geeft de sleutel door aan het paneel.
 */
export async function POST(req: NextRequest) {
  return behandel(async () => {
    toetsHerkomst(req);
    if (config.authModus() === "dev") {
      const gebruiker = req.cookies.get("oa_dev_gebruiker")?.value ?? "haarlem-medewerker";
      return NextResponse.json({ sessie: `dev:${gebruiker}` }, { headers: { "cache-control": "no-store" } });
    }
    const s = leesSessie(req.cookies.get(SESSIECOOKIE)?.value);
    if (!s) throw new Weigering(401, "niet-ingelogd", "Log eerst in.");
    return NextResponse.json({ sessie: koppelSessie(s) }, { headers: { "cache-control": "no-store" } });
  });
}
