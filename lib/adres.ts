import type { NextRequest } from "next/server";

/**
 * Het publieke adres van de integratielaag. OA_BASIS_URL gaat voor; anders
 * het adres waarop de browser ons aanriep (via een reverse proxy de
 * x-forwarded-koppen). Nooit het interne adres van de server, anders komt
 * de sessiecookie op een ander adres terecht dan de pagina.
 */
export function eigenAdres(req: NextRequest): string {
  if (process.env.OA_BASIS_URL) return process.env.OA_BASIS_URL.replace(/\/$/, "");
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host") ?? "localhost:3000";
  const proto = req.headers.get("x-forwarded-proto") ?? (req.nextUrl.protocol.replace(":", "") || "http");
  return `${proto}://${host}`;
}
