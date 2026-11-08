import type { NextRequest } from "next/server";
import { eigenAdres } from "../../../lib/adres";
import { manifest } from "../../../lib/word-manifest";

export const dynamic = "force-dynamic";

/** /word/manifest.xml: het manifest om in Word te uploaden. */
export async function GET(req: NextRequest) {
  return new Response(manifest(eigenAdres(req)), {
    headers: {
      "content-type": "application/xml; charset=utf-8",
      "content-disposition": 'attachment; filename="office-assistent-manifest.xml"',
      "cache-control": "no-store",
    },
  });
}
