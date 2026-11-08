import { NextResponse, type NextRequest } from "next/server";
import { behandel, Weigering } from "../../../../../../lib/antwoord";
import { bewaarMeta, eigenWerkbestand, moetAanstaan } from "../../../../../../lib/collabora";
import { toetsDelegatie, toetsHerkomst, wieBeltEr } from "../../../../../../lib/identiteit";

export const dynamic = "force-dynamic";

const NAAM = /^[a-z][a-z0-9-]{0,40}$/;

/** Eigenschappen van het werkbestand (zoals de afdruk van de assistent). */
export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  return behandel(async () => {
    moetAanstaan();
    const wie = wieBeltEr(req);
    toetsDelegatie(wie);
    const w = await eigenWerkbestand((await ctx.params).id, wie);
    const naam = req.nextUrl.searchParams.get("naam") ?? "";
    return NextResponse.json({ waarde: w.eigenschappen[naam] ?? null }, { headers: { "cache-control": "no-store" } });
  });
}

export async function PUT(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  return behandel(async () => {
    moetAanstaan();
    toetsHerkomst(req);
    const wie = wieBeltEr(req);
    toetsDelegatie(wie);
    const w = await eigenWerkbestand((await ctx.params).id, wie);
    const { naam, waarde } = (await req.json()) as { naam?: string; waarde?: string };
    if (!naam || !NAAM.test(naam) || typeof waarde !== "string" || waarde.length > 2000) throw new Weigering(400, "verzoek-ongeldig", "Ongeldige eigenschap.");
    await bewaarMeta({ ...w, eigenschappen: { ...w.eigenschappen, [naam]: waarde } });
    return NextResponse.json({});
  });
}
