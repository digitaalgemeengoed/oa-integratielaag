import { readFile } from "node:fs/promises";
import { join } from "node:path";
import type { NextRequest } from "next/server";
import { strToU8, unzipSync, zipSync } from "fflate";
import { eigenAdres } from "../../../lib/adres";

export const dynamic = "force-dynamic";

/**
 * /libreoffice/office-assistent.oxt: de LibreOffice-extensie, met het adres
 * van deze omgeving erin. De extensie opent het paneel op dat adres en
 * antwoordt alleen aan pagina's van dat adres.
 */
/** De versie uit description.xml in de extensie zelf. */
function versieVan(bestanden: Record<string, Uint8Array>): string {
  const d = bestanden["description.xml"];
  const v = d ? /<version value="([^"]+)"/.exec(new TextDecoder().decode(d))?.[1] : undefined;
  return v?.replace(/[^0-9.]/g, "") || "onbekend";
}

export async function GET(req: NextRequest) {
  let basis: Uint8Array;
  try {
    basis = await readFile(join(/*turbopackIgnore: true*/ process.cwd(), "public", "libreoffice", "office-assistent-basis.oxt"));
  } catch {
    return Response.json({ fout: "niet-gevonden", melding: "De extensie is niet meegebouwd." }, { status: 404 });
  }
  const bestanden = unzipSync(basis);
  bestanden["instellingen.json"] = strToU8(JSON.stringify({ basis: eigenAdres(req) }, null, 2));
  const oxt = zipSync(bestanden, { level: 9 });
  return new Response(new Uint8Array(oxt), {
    headers: {
      "content-type": "application/vnd.openofficeorg.extension",
      "content-disposition": `attachment; filename="office-assistent-${versieVan(bestanden)}.oxt"`,
      "cache-control": "no-store",
    },
  });
}
