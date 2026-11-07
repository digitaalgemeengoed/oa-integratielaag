import { NextResponse, type NextRequest } from "next/server";
import { eigenAdres } from "../../../../lib/adres";
import { config } from "../../../../lib/config";
import { inlogAdres } from "../../../../lib/oidc";
import { bewaarPoging, nieuweSleutel } from "../../../../lib/sessie";

export const dynamic = "force-dynamic";

/** Begint het inloggen bij Keycloak. ?terug=/pad bepaalt waar je daarna uitkomt. */
export async function GET(req: NextRequest) {
  const terug = req.nextUrl.searchParams.get("terug") ?? "/";
  const veiligTerug = terug.startsWith("/") && !terug.startsWith("//") ? terug : "/";

  if (config.authModus() === "dev") {
    const r = NextResponse.redirect(new URL(veiligTerug, eigenAdres(req)));
    const gebruiker = req.nextUrl.searchParams.get("gebruiker");
    if (gebruiker) r.cookies.set("oa_dev_gebruiker", gebruiker, { httpOnly: true, sameSite: "lax", path: "/" });
    return r;
  }

  const state = nieuweSleutel();
  const { adres, verifier } = await inlogAdres(state);
  bewaarPoging(state, { verifier, terugNaar: veiligTerug, verloopt: Date.now() + 10 * 60_000 });
  return NextResponse.redirect(adres);
}
