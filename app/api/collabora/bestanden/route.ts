import { NextResponse, type NextRequest } from "next/server";
import { behandel } from "../../../../lib/antwoord";
import { formaatVan, lijstWerkbestanden, maakWerkbestand, moetAanstaan, VOORBEELD_HTML, zetOm } from "../../../../lib/collabora";
import { voorbeeldPresentatie, voorbeeldRekenblad } from "../../../../lib/odf";
import { PLATTEGROND_PNG } from "../../../../lib/plattegrond";
import { toetsDelegatie, toetsHerkomst, wieBeltEr } from "../../../../lib/identiteit";

export const dynamic = "force-dynamic";

/** De werkbestanden van deze medewerker in Collabora. */
export async function GET(req: NextRequest) {
  return behandel(async () => {
    moetAanstaan();
    const wie = wieBeltEr(req);
    toetsDelegatie(wie);
    const lijst = await lijstWerkbestanden(wie);
    return NextResponse.json(lijst.map((w) => ({ id: w.id, naam: w.naam, versie: w.versie, gewijzigd: w.gewijzigd, formaat: formaatVan(w) })), { headers: { "cache-control": "no-store" } });
  });
}

/**
 * Een nieuw werkbestand met een voorbeeld: het raadsvoorstel (docx), een
 * begroting (ods) of een presentatie (odp), elk met iets voor de assistent.
 */
export async function POST(req: NextRequest) {
  return behandel(async () => {
    moetAanstaan();
    toetsHerkomst(req);
    const wie = wieBeltEr(req);
    toetsDelegatie(wie);
    const { soort } = ((await req.json().catch(() => ({}))) ?? {}) as { soort?: string };
    let w;
    if (soort === "rekenblad") w = await maakWerkbestand(wie, "Begroting fietsenstalling.ods", voorbeeldRekenblad(PLATTEGROND_PNG), "ods");
    else if (soort === "presentatie") w = await maakWerkbestand(wie, "Fietsenstalling Stationsplein.odp", voorbeeldPresentatie(PLATTEGROND_PNG), "odp");
    else {
      const docx = await zetOm(new TextEncoder().encode(VOORBEELD_HTML), "voorbeeld.html", "docx");
      w = await maakWerkbestand(wie, "Raadsvoorstel fietsenstalling.docx", docx);
    }
    return NextResponse.json({ id: w.id, naam: w.naam, formaat: formaatVan(w) }, { status: 201 });
  });
}
