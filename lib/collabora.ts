import { randomBytes, randomUUID, timingSafeEqual } from "node:crypto";
import { mkdir, readdir, readFile, rename, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { WieBenIk } from "@digitaalgemeengoed/oa-contract";
import { Weigering } from "./antwoord";

/**
 * Collabora Online als werkomgeving. De integratielaag is hier ook de
 * bestandsserver (WOPI-host) van Collabora: zoals de demo-tekstverwerker zijn
 * document in de browser bewaart en Word in OneDrive, bewaart deze
 * werkomgeving haar werkbestanden hier. De assistent bewaart niets; vastleggen
 * gaat zoals altijd naar het platform.
 *
 * Prototype: werkbestanden op schijf (een volume), toegangssleutels voor
 * Collabora in het geheugen.
 */

export const collaboraConfig = {
  /** Intern adres van Collabora, voor discovery en conversie. */
  intern: () => process.env.COLLABORA_INTERN ?? "",
  /** Adres waarop Collabora de WOPI-host bereikt (intern, zonder omweg via internet). */
  wopiBasis: () => (process.env.COLLABORA_WOPI_BASIS ?? "http://integratielaag:3000").replace(/\/$/, ""),
  map: () => process.env.WERKBESTANDEN_MAP ?? join(/*turbopackIgnore: true*/ process.cwd(), ".werkbestanden"),
  aan: () => !!process.env.COLLABORA_INTERN,
};

export function moetAanstaan(): void {
  if (!collaboraConfig.aan()) throw new Weigering(503, "collabora-uit", "Collabora Online staat in deze omgeving niet aan.");
}

// ---------------------------------------------------------------------------
// Werkbestanden
// ---------------------------------------------------------------------------

export interface Werkbestand {
  id: string;
  naam: string;
  gemeente: string;
  eigenaar: string;
  versie: number;
  gewijzigd: string;
  eigenschappen: Record<string, string>;
}

const ID = /^[0-9a-f-]{36}$/;
const pad = (id: string, ext: string) => {
  if (!ID.test(id)) throw new Weigering(404, "onbekend", "Dit werkbestand bestaat niet.");
  return join(/*turbopackIgnore: true*/ collaboraConfig.map(), `${id}.${ext}`);
};

async function schrijfVeilig(bestand: string, data: string | Uint8Array): Promise<void> {
  const tijdelijk = `${bestand}.${randomBytes(4).toString("hex")}.tmp`;
  await writeFile(tijdelijk, data, { mode: 0o600 });
  await rename(tijdelijk, bestand);
}

export async function leesWerkbestand(id: string): Promise<Werkbestand> {
  try {
    return JSON.parse(await readFile(pad(id, "json"), "utf8")) as Werkbestand;
  } catch (e) {
    if (e instanceof Weigering) throw e;
    throw new Weigering(404, "onbekend", "Dit werkbestand bestaat niet.");
  }
}

/** Alleen van de eigenaar, binnen de eigen gemeente. */
export async function eigenWerkbestand(id: string, wie: WieBenIk): Promise<Werkbestand> {
  const w = await leesWerkbestand(id);
  if (w.gemeente !== wie.gemeente || w.eigenaar !== wie.sub) throw new Weigering(404, "onbekend", "Dit werkbestand bestaat niet.");
  return w;
}

export async function bewaarMeta(w: Werkbestand): Promise<void> {
  await schrijfVeilig(pad(w.id, "json"), JSON.stringify(w, null, 2));
}

export async function leesInhoud(id: string): Promise<Buffer> {
  return readFile(pad(id, "docx"));
}

export async function schrijfInhoud(w: Werkbestand, data: Uint8Array): Promise<Werkbestand> {
  await schrijfVeilig(pad(w.id, "docx"), data);
  const nieuw = { ...w, versie: w.versie + 1, gewijzigd: new Date().toISOString() };
  await bewaarMeta(nieuw);
  return nieuw;
}

export async function maakWerkbestand(wie: WieBenIk, naam: string, docx: Uint8Array): Promise<Werkbestand> {
  await mkdir(/*turbopackIgnore: true*/ collaboraConfig.map(), { recursive: true, mode: 0o700 });
  const w: Werkbestand = { id: randomUUID(), naam, gemeente: wie.gemeente, eigenaar: wie.sub, versie: 0, gewijzigd: new Date().toISOString(), eigenschappen: {} };
  await bewaarMeta(w);
  return schrijfInhoud(w, docx);
}

export async function lijstWerkbestanden(wie: WieBenIk): Promise<Werkbestand[]> {
  let namen: string[] = [];
  try {
    namen = await readdir(/*turbopackIgnore: true*/ collaboraConfig.map());
  } catch {
    return [];
  }
  const alle = await Promise.all(namen.filter((n) => n.endsWith(".json")).map((n) => leesWerkbestand(n.slice(0, -5)).catch(() => null)));
  return alle
    .filter((w): w is Werkbestand => !!w && w.gemeente === wie.gemeente && w.eigenaar === wie.sub)
    .sort((a, b) => b.gewijzigd.localeCompare(a.gewijzigd));
}

// ---------------------------------------------------------------------------
// Toegangssleutels voor Collabora (WOPI access_token)
// ---------------------------------------------------------------------------

interface Toegang {
  werkbestand: string;
  sub: string;
  naam: string;
  verloopt: number;
}

const g = globalThis as unknown as { __oaWopi?: Map<string, Toegang> };
const toegang = (g.__oaWopi ??= new Map());
const GELDIG_MS = 10 * 3600_000;

export function geefToegang(w: Werkbestand, wie: WieBenIk): { token: string; verloopt: number } {
  const token = randomBytes(32).toString("base64url");
  const verloopt = Date.now() + GELDIG_MS;
  toegang.set(token, { werkbestand: w.id, sub: wie.sub, naam: wie.naam, verloopt });
  return { token, verloopt };
}

export function toetsToegang(token: string | null, id: string): Toegang {
  const t = token ? toegang.get(token) : undefined;
  if (!t || t.verloopt < Date.now() || !veiligGelijk(t.werkbestand, id)) {
    throw new Weigering(401, "geen-toegang", "Ongeldige toegang tot dit werkbestand.");
  }
  return t;
}

function veiligGelijk(a: string, b: string): boolean {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

// ---------------------------------------------------------------------------
// Collabora zelf: discovery en conversie
// ---------------------------------------------------------------------------

let ontdekt: { tijd: number; urlsrc: string } | null = null;

/** Het adres van de editor voor docx, uit /hosting/discovery. */
export async function editorAdres(): Promise<string> {
  if (ontdekt && Date.now() - ontdekt.tijd < 3600_000) return ontdekt.urlsrc;
  const r = await fetch(`${collaboraConfig.intern()}/hosting/discovery`, { signal: AbortSignal.timeout(10_000) }).catch(() => null);
  if (!r?.ok) throw new Weigering(503, "collabora-weg", "Collabora Online is nu niet bereikbaar.");
  const xml = await r.text();
  const app = /<app[^>]+name="application\/vnd\.openxmlformats-officedocument\.wordprocessingml\.document"[^>]*>([\s\S]*?)<\/app>/.exec(xml);
  const actie = app && /<action[^>]+name="edit"[^>]+urlsrc="([^"]+)"/.exec(app[1]);
  const urlsrc = actie?.[1] ?? /urlsrc="([^"]+)"/.exec(xml)?.[1];
  if (!urlsrc) throw new Weigering(503, "collabora-weg", "Collabora Online gaf geen editoradres.");
  ontdekt = { tijd: Date.now(), urlsrc: urlsrc.replace(/&amp;/g, "&") };
  return ontdekt.urlsrc;
}

/** Zet een bestand om met Collabora (convert-to). */
export async function zetOm(data: Uint8Array, bestandsnaam: string, naar: "docx" | "html"): Promise<Uint8Array> {
  const form = new FormData();
  form.append("data", new Blob([new Uint8Array(data)]), bestandsnaam);
  const r = await fetch(`${collaboraConfig.intern()}/cool/convert-to/${naar}`, { method: "POST", body: form, signal: AbortSignal.timeout(60_000) }).catch(() => null);
  if (!r?.ok) throw new Weigering(502, "omzetten-mislukt", `Collabora kon het document niet omzetten naar ${naar}${r ? ` (${r.status})` : ""}.`);
  return new Uint8Array(await r.arrayBuffer());
}

/** Alleen de inhoud van <body>, zonder stijlblokken: dat is wat de assistent beoordeelt. */
export function bodyVan(html: string): string {
  const m = /<body[^>]*>([\s\S]*)<\/body>/i.exec(html);
  return (m ? m[1] : html).replace(/<style[\s\S]*?<\/style>/gi, "").trim();
}

export const VOORBEELD_HTML = `<!doctype html><html lang="nl"><head><meta charset="utf-8"><title>Raadsvoorstel fietsenstalling</title></head><body>
<p><b>Raadsvoorstel fietsenstalling Stationsplein</b></p>
<h2>Aanleiding</h2>
<p>Bij het station staan dagelijks honderden fietsen buiten de rekken. Het college stelt voor een overdekte stalling te bouwen voor 1.200 fietsen.</p>
<h4>Kosten</h4>
<p>De kosten staan in de begroting; <a href="https://www.haarlem.nl/">klik hier</a> voor de cijfers.</p>
<table><tr><td>Post</td><td>Bedrag</td></tr><tr><td>Bouw</td><td>€ 1.250.000</td></tr><tr><td>Beheer per jaar</td><td>€ 45.000</td></tr></table>
<p>- Eerste fase: ontwerp en vergunning<br>- Tweede fase: bouw</p>
<h2>Besluit</h2>
<p>De raad wordt gevraagd in te stemmen met het krediet.</p>
</body></html>`;
