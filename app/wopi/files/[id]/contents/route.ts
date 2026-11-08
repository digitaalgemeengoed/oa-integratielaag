import { NextResponse, type NextRequest } from "next/server";
import { behandel } from "../../../../../lib/antwoord";
import { leesInhoud, leesWerkbestand, moetAanstaan, schrijfInhoud, toetsToegang } from "../../../../../lib/collabora";

export const dynamic = "force-dynamic";

/** WOPI GetFile. */
export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  return behandel(async () => {
    moetAanstaan();
    const id = (await ctx.params).id;
    toetsToegang(req.nextUrl.searchParams.get("access_token"), id);
    const w = await leesWerkbestand(id);
    return new Response(new Uint8Array(await leesInhoud(id)), {
      headers: { "content-type": "application/octet-stream", "x-wopi-itemversion": String(w.versie), "cache-control": "no-store" },
    });
  });
}

/** WOPI PutFile: Collabora slaat het document op. */
export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  return behandel(async () => {
    moetAanstaan();
    const id = (await ctx.params).id;
    toetsToegang(req.nextUrl.searchParams.get("access_token"), id);
    const w = await leesWerkbestand(id);
    // Is het bestand intussen buiten Collabora om gewijzigd (bijvoorbeeld door
    // de assistent)? Dan niet overschrijven; Collabora vraagt de medewerker wat te doen.
    const verwacht = req.headers.get("x-cool-wopi-timestamp") ?? req.headers.get("x-lool-wopi-timestamp");
    if (verwacht && verwacht !== w.gewijzigd) {
      return NextResponse.json({ COOLStatusCode: 1010, LOOLStatusCode: 1010 }, { status: 409 });
    }
    const data = new Uint8Array(await req.arrayBuffer());
    const nieuw = await schrijfInhoud(w, data);
    return NextResponse.json({ LastModifiedTime: nieuw.gewijzigd }, { headers: { "x-wopi-itemversion": String(nieuw.versie) } });
  });
}
