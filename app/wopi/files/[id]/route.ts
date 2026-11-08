import { NextResponse, type NextRequest } from "next/server";
import { behandel } from "../../../../lib/antwoord";
import { leesInhoud, leesWerkbestand, moetAanstaan, toetsToegang } from "../../../../lib/collabora";
import { eigenAdres } from "../../../../lib/adres";

export const dynamic = "force-dynamic";

/**
 * WOPI CheckFileInfo. Alleen Collabora roept dit aan, met de toegangssleutel
 * die de integratielaag voor deze medewerker en dit werkbestand gaf.
 */
export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  return behandel(async () => {
    moetAanstaan();
    const id = (await ctx.params).id;
    const t = toetsToegang(req.nextUrl.searchParams.get("access_token"), id);
    const w = await leesWerkbestand(id);
    const grootte = (await leesInhoud(id)).length;
    return NextResponse.json({
      BaseFileName: w.naam,
      Size: grootte,
      Version: String(w.versie),
      LastModifiedTime: w.gewijzigd,
      OwnerId: w.eigenaar,
      UserId: t.sub,
      UserFriendlyName: t.naam,
      UserCanWrite: true,
      UserCanNotWriteRelative: true,
      SupportsUpdate: true,
      SupportsLocks: false,
      PostMessageOrigin: eigenAdres(req),
      EnableOwnerTermination: false,
      HideExportOption: true,
    });
  });
}

/** Vergrendelen en dergelijke ondersteunt deze bestandsserver niet. */
export async function POST() {
  return new Response(null, { status: 501 });
}
