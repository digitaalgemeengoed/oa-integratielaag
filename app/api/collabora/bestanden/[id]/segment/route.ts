import { NextResponse, type NextRequest } from "next/server";
import { behandel, Weigering } from "../../../../../../lib/antwoord";
import { eigenWerkbestand, formaatVan, leesInhoud, moetAanstaan, schrijfInhoud } from "../../../../../../lib/collabora";
import { toetsDelegatie, toetsHerkomst, wieBeltEr } from "../../../../../../lib/identiteit";
import { pasOdfAan } from "../../../../../../lib/odf";

export const dynamic = "force-dynamic";

/**
 * Eén herstelling in een rekenblad of presentatie: het nieuwe element op een
 * plek (blad hernoemen, titel van een dia, alternatieve tekst). De
 * integratielaag past het ODF aan; de pagina laadt Collabora daarna opnieuw.
 */
export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  return behandel(async () => {
    moetAanstaan();
    toetsHerkomst(req);
    const wie = wieBeltEr(req);
    toetsDelegatie(wie);
    const w = await eigenWerkbestand((await ctx.params).id, wie);
    const formaat = formaatVan(w);
    if (formaat === "docx") throw new Weigering(422, "niet-uitvoerbaar", "Voor tekst vervangt de assistent het hele document.");
    const { pad, html } = (await req.json()) as { pad?: string; html?: string };
    if (typeof pad !== "string" || !/^body(\/\d+){1,3}$/.test(pad) || typeof html !== "string" || html.length > 100_000) {
      throw new Weigering(400, "verzoek-ongeldig", "Geen geldige plek of wijziging.");
    }
    const nieuw = pasOdfAan(await leesInhoud(w.id), formaat === "ods" ? "rekenblad" : "presentatie", pad, html);
    const bijgewerkt = await schrijfInhoud(w, nieuw);
    return NextResponse.json({ versie: bijgewerkt.versie });
  });
}
