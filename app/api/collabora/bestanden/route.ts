import { NextResponse, type NextRequest } from "next/server";
import { behandel } from "../../../../lib/antwoord";
import { lijstWerkbestanden, maakWerkbestand, moetAanstaan, VOORBEELD_HTML, zetOm } from "../../../../lib/collabora";
import { toetsDelegatie, toetsHerkomst, wieBeltEr } from "../../../../lib/identiteit";

export const dynamic = "force-dynamic";

/** De werkbestanden van deze medewerker in Collabora. */
export async function GET(req: NextRequest) {
  return behandel(async () => {
    moetAanstaan();
    const wie = wieBeltEr(req);
    toetsDelegatie(wie);
    const lijst = await lijstWerkbestanden(wie);
    return NextResponse.json(lijst.map(({ id, naam, versie, gewijzigd }) => ({ id, naam, versie, gewijzigd })), { headers: { "cache-control": "no-store" } });
  });
}

/** Een nieuw werkbestand: het voorbeeld-raadsvoorstel, als docx. */
export async function POST(req: NextRequest) {
  return behandel(async () => {
    moetAanstaan();
    toetsHerkomst(req);
    const wie = wieBeltEr(req);
    toetsDelegatie(wie);
    const docx = await zetOm(new TextEncoder().encode(VOORBEELD_HTML), "voorbeeld.html", "docx");
    const w = await maakWerkbestand(wie, "Raadsvoorstel fietsenstalling.docx", docx);
    return NextResponse.json({ id: w.id, naam: w.naam }, { status: 201 });
  });
}
