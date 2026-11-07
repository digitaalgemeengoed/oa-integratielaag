import { NextResponse, type NextRequest } from "next/server";
import { config } from "../../../../lib/config";
import { wisselCode } from "../../../../lib/oidc";
import { maakSessie, neemPoging, SESSIECOOKIE } from "../../../../lib/sessie";

export const dynamic = "force-dynamic";

/** Terugkeer van Keycloak: code wisselen, sessie maken, cookie zetten. */
export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  const state = req.nextUrl.searchParams.get("state");
  const poging = state ? neemPoging(state) : null;
  if (!code || !poging) {
    return NextResponse.json({ fout: "inloggen-mislukt", melding: "Het inloggen is verlopen of ongeldig. Probeer het opnieuw." }, { status: 400 });
  }
  try {
    const { identiteit, accessToken } = await wisselCode(code, poging.verifier);
    const sleutel = maakSessie(identiteit, accessToken);
    const r = NextResponse.redirect(new URL(poging.terugNaar, config.oidc.basisUrl()));
    r.cookies.set(SESSIECOOKIE, sleutel, {
      httpOnly: true,
      secure: config.oidc.basisUrl().startsWith("https://"),
      sameSite: "lax",
      path: "/",
      maxAge: config.sessieUren * 3600,
    });
    return r;
  } catch (e) {
    console.error(e);
    return NextResponse.json({ fout: "inloggen-mislukt", melding: (e as Error).message }, { status: 401 });
  }
}
