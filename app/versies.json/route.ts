import { installeerbaar, opDeServer } from "../../lib/versies";

export const dynamic = "force-dynamic";

/**
 * /versies.json: welke versies bij deze omgeving horen. Openbaar (er staat
 * niets geheims in): de downloadpagina op office.<domein> toont ze.
 */
export async function GET() {
  const [manifest, extensie] = installeerbaar();
  return Response.json(
    { manifest: manifest!.versie, extensie: extensie!.versie, installeerbaar: installeerbaar(), server: await opDeServer() },
    { headers: { "access-control-allow-origin": "*", "cache-control": "no-store" } },
  );
}
