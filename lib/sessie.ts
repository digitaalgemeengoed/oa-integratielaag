import { randomBytes } from "node:crypto";
import type { WieBenIk } from "@digitaalgemeengoed/oa-contract";
import { config } from "./config";

/**
 * Sessies aan de serverkant. De browser krijgt alleen een willekeurige
 * sessiesleutel in een httpOnly-cookie; tokens blijven hier. Zo staan er in
 * de werkomgeving geen tokens.
 *
 * Prototype: in het geheugen van één proces. Voor meer instanties of
 * herstarts zonder uitloggen hoort hier Redis of PostgreSQL.
 */
export interface Sessie {
  identiteit: WieBenIk;
  accessToken?: string;
  verloopt: number;
}

export interface Inlogpoging {
  verifier: string;
  terugNaar: string;
  verloopt: number;
}

const g = globalThis as unknown as { __oaSessies?: Map<string, Sessie>; __oaPogingen?: Map<string, Inlogpoging> };
const sessies = (g.__oaSessies ??= new Map());
const pogingen = (g.__oaPogingen ??= new Map());

export const SESSIECOOKIE = "oa_sessie";

/** Zo lang mag het inlogscherm open staan; gelijk aan de standaard van Keycloak (30 minuten). */
export const POGING_MINUTEN = 30;

/** Verlopen sessies en pogingen weghalen, zodat het geheugen niet volloopt. */
function ruimOp(): void {
  const nu = Date.now();
  for (const [k, s] of sessies) if (s.verloopt < nu) sessies.delete(k);
  for (const [k, p] of pogingen) if (p.verloopt < nu) pogingen.delete(k);
}

export function nieuweSleutel(): string {
  return randomBytes(32).toString("base64url");
}

export function maakSessie(identiteit: WieBenIk, accessToken?: string): string {
  ruimOp();
  const sleutel = nieuweSleutel();
  sessies.set(sleutel, { identiteit, accessToken, verloopt: Date.now() + config.sessieUren * 3600_000 });
  return sleutel;
}

export function leesSessie(sleutel: string | undefined): Sessie | null {
  if (!sleutel) return null;
  const s = sessies.get(sleutel);
  if (!s) return null;
  if (s.verloopt < Date.now()) {
    sessies.delete(sleutel);
    return null;
  }
  return s;
}

/**
 * Een tweede sessie voor dezelfde persoon, voor een werkomgeving die geen
 * cookie kan gebruiken. Eigen sleutel, zelfde identiteit en verlooptijd:
 * uitloggen in de browser trekt deze niet in, verlopen wel.
 */
export function koppelSessie(bron: Sessie): string {
  const sleutel = nieuweSleutel();
  sessies.set(sleutel, { ...bron });
  return sleutel;
}

export function beeindigSessie(sleutel: string | undefined): void {
  if (sleutel) sessies.delete(sleutel);
}

export function bewaarPoging(state: string, p: Inlogpoging): void {
  ruimOp();
  pogingen.set(state, p);
}

export function neemPoging(state: string): Inlogpoging | null {
  const p = pogingen.get(state);
  pogingen.delete(state);
  if (!p || p.verloopt < Date.now()) return null;
  return p;
}
