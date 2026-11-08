import { NextResponse, type NextRequest } from "next/server";
import { behandel } from "../../../../../../lib/antwoord";
import { eigenWerkbestand, leesInhoud, moetAanstaan } from "../../../../../../lib/collabora";
import { toetsDelegatie, wieBeltEr } from "../../../../../../lib/identiteit";

export const dynamic = "force-dynamic";

/** Het werkbestand zelf (docx), als inhoud voor het platform: het origineel van de versie. */
export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  return behandel(async () => {
    moetAanstaan();
    const wie = wieBeltEr(req);
    toetsDelegatie(wie);
    const w = await eigenWerkbestand((await ctx.params).id, wie);
    return NextResponse.json(
      {
        formaat: "docx",
        mediaType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        codering: "base64",
        data: (await leesInhoud(w.id)).toString("base64"),
      },
      { headers: { "cache-control": "no-store" } },
    );
  });
}
