import type { NextRequest } from "next/server";
import type { WieBenIk } from "@oa/contract";
import { config } from "./config";
import { naarActor } from "./identiteit";

const MAX_BODY = 30 * 1024 * 1024;

async function body(req: NextRequest): Promise<string | undefined> {
  if (req.method === "GET" || req.method === "HEAD") return undefined;
  const lengte = Number(req.headers.get("content-length") ?? 0);
  if (lengte > MAX_BODY) throw new Error("verzoek te groot");
  return await req.text();
}

function kopregels(w: WieBenIk, sleutel: string): Record<string, string> {
  return {
    "content-type": "application/json",
    "x-oa-dienstsleutel": sleutel,
    "x-oa-gemeente": w.gemeente,
    "x-oa-actor": Buffer.from(JSON.stringify(naarActor(w))).toString("base64url"),
  };
}

function doorsturen(r: Response): Response {
  const h = new Headers();
  for (const k of ["content-type", "x-oa-formaat"]) {
    const v = r.headers.get(k);
    if (v) h.set(k, v);
  }
  h.set("cache-control", "no-store");
  return new Response(r.body, { status: r.status, headers: h });
}

/** Naar de Object Service van het platform. */
export async function naarPlatform(req: NextRequest, w: WieBenIk, pad: string, methode = req.method): Promise<Response> {
  const r = await fetch(`${config.platformUrl()}${pad}`, {
    method: methode,
    headers: kopregels(w, config.platformSleutel()),
    body: await body(req),
  });
  return doorsturen(r);
}

/** Naar de assistent-services (lezende ingang). */
export async function naarDiensten(req: NextRequest, w: WieBenIk, pad: string): Promise<Response> {
  const r = await fetch(`${config.dienstenUrl()}${pad}`, {
    method: "POST",
    headers: kopregels(w, config.dienstenSleutel()),
    body: await body(req),
  });
  return doorsturen(r);
}
