import { NextResponse, type NextRequest } from "next/server";
import { eigenAdres } from "../../../../lib/adres";
import { config } from "../../../../lib/config";
import { uitlogAdres } from "../../../../lib/oidc";
import { beeindigSessie, SESSIECOOKIE } from "../../../../lib/sessie";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  beeindigSessie(req.cookies.get(SESSIECOOKIE)?.value);
  const naar = config.authModus() === "oidc" ? ((await uitlogAdres()) ?? "/") : "/";
  const r = NextResponse.redirect(new URL(naar, eigenAdres(req)));
  r.cookies.delete(SESSIECOOKIE);
  r.cookies.delete("oa_dev_gebruiker");
  return r;
}
