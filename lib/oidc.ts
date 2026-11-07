import { createHash } from "node:crypto";
import { createRemoteJWKSet, jwtVerify, type JWTPayload } from "jose";
import type { WieBenIk } from "@digitaalgemeengoed/oa-contract";
import { config } from "./config";
import { nieuweSleutel } from "./sessie";

/**
 * Inloggen bij Keycloak met de authorization code flow en PKCE. De
 * integratielaag is een vertrouwelijke client; het token komt nooit in de
 * browser.
 */
interface Ontdekking {
  authorization_endpoint: string;
  token_endpoint: string;
  end_session_endpoint?: string;
  jwks_uri: string;
  issuer: string;
}

let ontdekt: Promise<Ontdekking> | null = null;
let sleutels: ReturnType<typeof createRemoteJWKSet> | null = null;

async function ontdek(): Promise<Ontdekking> {
  ontdekt ??= fetch(`${config.oidc.issuer()}/.well-known/openid-configuration`).then((r) => {
    if (!r.ok) throw new Error(`OIDC-ontdekking mislukt: ${r.status}`);
    return r.json() as Promise<Ontdekking>;
  });
  return ontdekt;
}

export async function inlogAdres(state: string): Promise<{ adres: string; verifier: string }> {
  const o = await ontdek();
  const verifier = nieuweSleutel();
  const challenge = createHash("sha256").update(verifier).digest("base64url");
  const u = new URL(o.authorization_endpoint);
  u.searchParams.set("response_type", "code");
  u.searchParams.set("client_id", config.oidc.clientId());
  u.searchParams.set("redirect_uri", `${config.oidc.basisUrl()}/api/auth/terug`);
  u.searchParams.set("scope", "openid profile");
  u.searchParams.set("state", state);
  u.searchParams.set("code_challenge", challenge);
  u.searchParams.set("code_challenge_method", "S256");
  return { adres: u.toString(), verifier };
}

export async function wisselCode(code: string, verifier: string): Promise<{ identiteit: WieBenIk; accessToken: string }> {
  const o = await ontdek();
  const r = await fetch(o.token_endpoint, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: `${config.oidc.basisUrl()}/api/auth/terug`,
      client_id: config.oidc.clientId(),
      client_secret: config.oidc.clientSecret(),
      code_verifier: verifier,
    }),
  });
  if (!r.ok) throw new Error(`Tokenwissel mislukt: ${r.status}`);
  const tokens = (await r.json()) as { access_token: string; id_token: string };
  sleutels ??= createRemoteJWKSet(new URL(o.jwks_uri));
  const { payload } = await jwtVerify(tokens.access_token, sleutels, { issuer: o.issuer });
  return { identiteit: naarIdentiteit(payload), accessToken: tokens.access_token };
}

export async function uitlogAdres(): Promise<string | null> {
  const o = await ontdek();
  if (!o.end_session_endpoint) return null;
  const u = new URL(o.end_session_endpoint);
  u.searchParams.set("client_id", config.oidc.clientId());
  u.searchParams.set("post_logout_redirect_uri", `${config.oidc.basisUrl()}/`);
  return u.toString();
}

/**
 * Van token naar identiteit. De gemeente komt uit de claim "gemeente"
 * (een attribuut-mapper in Keycloak), de rollen uit de realm-rollen.
 * Een leverancier krijgt de claim "leverancier"; of die namens een gemeente
 * mag handelen, toetst de delegatie, niet het token.
 */
export function naarIdentiteit(p: JWTPayload): WieBenIk {
  const gemeente = String((p as Record<string, unknown>).gemeente ?? "");
  if (!/^[a-z0-9-]{2,40}$/.test(gemeente)) throw new Error("Het token heeft geen geldige claim 'gemeente'");
  const rollen = ((p as { realm_access?: { roles?: string[] } }).realm_access?.roles ?? []).filter((r) =>
    ["medewerker", "beheerder", "leverancier"].includes(r),
  );
  const leverancier = (p as Record<string, unknown>).leverancier;
  return {
    sub: String(p.sub),
    naam: String((p as Record<string, unknown>).name ?? (p as Record<string, unknown>).preferred_username ?? p.sub),
    gemeente,
    rollen,
    ...(leverancier ? { namens: String(leverancier) } : {}),
  };
}
