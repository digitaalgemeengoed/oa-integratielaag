import { NextResponse, type NextRequest } from "next/server";
import { behandel } from "../../../../../../lib/antwoord";
import { collaboraConfig, editorAdres, eigenWerkbestand, formaatVan, geefToegang, moetAanstaan } from "../../../../../../lib/collabora";
import { toetsDelegatie, toetsHerkomst, wieBeltEr } from "../../../../../../lib/identiteit";

export const dynamic = "force-dynamic";

/** Alles om dit werkbestand in Collabora te openen: editoradres, WOPISrc en een toegangssleutel. */
export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  return behandel(async () => {
    moetAanstaan();
    toetsHerkomst(req);
    const wie = wieBeltEr(req);
    toetsDelegatie(wie);
    const w = await eigenWerkbestand((await ctx.params).id, wie);
    const { token, verloopt } = geefToegang(w, wie);
    return NextResponse.json(
      { editor: await editorAdres(formaatVan(w)), formaat: formaatVan(w), wopiSrc: `${collaboraConfig.wopiBasis()}/wopi/files/${w.id}`, token, ttl: verloopt, naam: w.naam },
      { headers: { "cache-control": "no-store" } },
    );
  });
}
