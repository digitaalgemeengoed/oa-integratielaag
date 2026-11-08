import { NextResponse, type NextRequest } from "next/server";
import { behandel, Weigering } from "../../../../../../lib/antwoord";
import { bodyVan, eigenWerkbestand, leesInhoud, moetAanstaan, schrijfInhoud, zetOm } from "../../../../../../lib/collabora";
import { toetsDelegatie, toetsHerkomst, wieBeltEr } from "../../../../../../lib/identiteit";

export const dynamic = "force-dynamic";

/** De inhoud van het werkbestand als html (door Collabora omgezet), voor de assistent. */
export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  return behandel(async () => {
    moetAanstaan();
    const wie = wieBeltEr(req);
    toetsDelegatie(wie);
    const w = await eigenWerkbestand((await ctx.params).id, wie);
    const html = new TextDecoder().decode(await zetOm(await leesInhoud(w.id), w.naam, "html"));
    return NextResponse.json({ html: bodyVan(html), versie: w.versie }, { headers: { "cache-control": "no-store" } });
  });
}

/** Het hele werkbestand vervangen door html (de terugval als deelvervangen niet kan). */
export async function PUT(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  return behandel(async () => {
    moetAanstaan();
    toetsHerkomst(req);
    const wie = wieBeltEr(req);
    toetsDelegatie(wie);
    const w = await eigenWerkbestand((await ctx.params).id, wie);
    const { html } = (await req.json()) as { html?: string };
    if (typeof html !== "string" || html.length > 10 * 1024 * 1024) throw new Weigering(400, "verzoek-ongeldig", "Geen geldige html.");
    const pagina = `<!doctype html><html lang="nl"><head><meta charset="utf-8"></head><body>${html}</body></html>`;
    const docx = await zetOm(new TextEncoder().encode(pagina), "document.html", "docx");
    const nieuw = await schrijfInhoud(w, docx);
    return NextResponse.json({ versie: nieuw.versie });
  });
}
