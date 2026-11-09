import { niveauUitRollen } from "./identiteit";
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

/**
 * Wat er bij de inlogdienst misging. "code-ongeldig": de code is verlopen of
 * al gebruikt (opnieuw inloggen helpt); "dienst": Keycloak niet bereikbaar of
 * een fout aan zijn kant; "token": het token klopt niet.
 */
export class InlogFout extends Error {
  constructor(
    readonly soort: "code-ongeldig" | "dienst" | "token",
    melding: string,
  ) {
    super(melding);
  }
}

let ontdekt: Promise<Ontdekking> | null = null;
let sleutels: ReturnType<typeof createRemoteJWKSet> | null = null;

async function ontdek(): Promise<Ontdekking> {
  ontdekt ??= fetch(`${config.oidc.issuer()}/.well-known/openid-configuration`)
    .catch((e: Error) => {
      throw new InlogFout("dienst", `Inlogdienst niet bereikbaar: ${e.message}`);
    })
    .then((r) => {
      if (!r.ok) throw new InlogFout("dienst", `OIDC-ontdekking mislukt: ${r.status}`);
      return r.json() as Promise<Ontdekking>;
    });
  // Mislukt de ontdekking, dan niet onthouden: anders blijft inloggen stuk tot een herstart, ook als Keycloak terug is.
  ontdekt.catch(() => {
    ontdekt = null;
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
  }).catch((e: Error) => {
    throw new InlogFout("dienst", `Inlogdienst niet bereikbaar: ${e.message}`);
  });
  if (!r.ok) {
    const f = (await r.json().catch(() => ({}))) as { error?: string; error_description?: string };
    // invalid_grant: code verlopen of al gebruikt (terugknop, te lang gewacht). Opnieuw inloggen helpt.
    if (r.status === 400 && f.error === "invalid_grant") throw new InlogFout("code-ongeldig", `Code ongeldig: ${f.error_description ?? f.error}`);
    throw new InlogFout(r.status >= 500 ? "dienst" : "token", `Tokenwissel mislukt: ${r.status} ${f.error ?? ""}`.trim());
  }
  const tokens = (await r.json()) as { access_token: string; id_token: string };
  sleutels ??= createRemoteJWKSet(new URL(o.jwks_uri));
  let payload: JWTPayload;
  try {
    ({ payload } = await jwtVerify(tokens.access_token, sleutels, { issuer: o.issuer }));
  } catch (e) {
    throw new InlogFout("token", `Token niet geldig: ${(e as Error).message}`);
  }
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
  const rollen = ((p as { realm_access?: { roles?: string[] } }).realm_access?.roles ?? []).filter(
    (r) => ["medewerker", "beheerder", "leverancier"].includes(r) || /^ppl-[123]$/.test(r),
  );
  const leverancier = (p as Record<string, unknown>).leverancier;
  return {
    sub: String(p.sub),
    naam: String((p as Record<string, unknown>).name ?? (p as Record<string, unknown>).preferred_username ?? p.sub),
    gemeente,
    rollen,
    niveau: niveauUitRollen(rollen),
    ...(leverancier ? { namens: String(leverancier) } : {}),
  };
}
