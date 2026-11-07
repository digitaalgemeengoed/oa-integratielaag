import { NextResponse, type NextRequest } from "next/server";
import { behandel, Weigering } from "./antwoord";
import { naarDiensten, naarPlatform } from "./doorgeven";
import { toetsDelegatie, toetsHerkomst, wieBeltEr } from "./identiteit";
import { LEZEND, VASTLEGGEND, zoek } from "./routes";

/** Eén afhandeling voor beide ingangen; de witte lijst bepaalt wat kan. */
export function ingang(soort: "lezend" | "vastleggend") {
  return async (req: NextRequest, ctx: { params: Promise<{ pad: string[] }> }): Promise<Response> =>
    behandel(async () => {
      const { pad } = await ctx.params;
      const gevonden = zoek(soort === "lezend" ? LEZEND : VASTLEGGEND, req.method, pad.join("/"));
      if (!gevonden) throw new Weigering(404, "onbekend", "Deze aanroep bestaat niet.");

      const wie = wieBeltEr(req);
      toetsDelegatie(wie);
      if (req.method !== "GET") toetsHerkomst(req);
      if (gevonden.route.rol && !wie.rollen.includes(gevonden.route.rol)) {
        throw new Weigering(403, "geen-rol", `Hiervoor is de rol ${gevonden.route.rol} nodig.`);
      }

      const doelpad = gevonden.route.pad(gevonden.m) + (gevonden.route.metQuery ? req.nextUrl.search : "");
      switch (gevonden.route.doel) {
        case "zelf":
          return NextResponse.json(wie, { headers: { "cache-control": "no-store" } });
        case "diensten":
          return naarDiensten(req, wie, doelpad);
        case "platform":
          return naarPlatform(req, wie, doelpad);
      }
    });
}
