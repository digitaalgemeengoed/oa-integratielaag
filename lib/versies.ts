import { config } from "./config";
import { MANIFEST_VERSIE } from "./word-manifest";

/** Wat bij het bouwen is meegenomen (zie next.config.mjs). */
const gebouwd: Record<string, string | undefined> = (() => {
  try {
    return JSON.parse(process.env.OA_VERSIES ?? "{}");
  } catch {
    return {};
  }
})();

export interface Onderdeel {
  naam: string;
  versie: string;
  /** Waar het draait of wat de medewerker ermee moet. */
  toelichting: string;
}

async function gezondheid(url: string): Promise<string> {
  try {
    const r = await fetch(`${url}/gezondheid`, { signal: AbortSignal.timeout(1500), cache: "no-store" });
    if (!r.ok) return "niet bereikbaar";
    return ((await r.json()) as { versie?: string }).versie ?? "onbekend (ouder dan 0.7.0)";
  } catch {
    return "niet bereikbaar";
  }
}

/** Wat je zelf installeert: alleen opnieuw als het nummer hoger is dan wat je hebt. */
export function installeerbaar(): Onderdeel[] {
  return [
    {
      naam: "Office-invoegtoepassing (manifest)",
      versie: MANIFEST_VERSIE,
      toelichting: "Word, Excel en PowerPoint. Alleen opnieuw uploaden als dit nummer hoger is dan bij jouw laatste upload; het paneel zelf komt altijd van de server.",
    },
    {
      naam: "LibreOffice-extensie",
      versie: gebouwd["libreoffice-extensie"] ?? "onbekend",
      toelichting: "Writer, Calc en Impress. Je ziet je eigen versie in LibreOffice bij Extra → Extensiebeheer; is die lager, installeer dan opnieuw.",
    },
  ];
}

/** Wat op de servers draait; dat werk je bij met bijwerken.sh. */
export async function opDeServer(): Promise<Onderdeel[]> {
  let platform = "niet ingesteld";
  let diensten = "niet ingesteld";
  try {
    [platform, diensten] = await Promise.all([gezondheid(config.platformUrl()), gezondheid(config.dienstenUrl())]);
  } catch {
    /* niet ingesteld */
  }
  return [
    { naam: "Paneel (oa-paneel)", versie: gebouwd["oa-paneel"] ?? "onbekend", toelichting: "VPS 1, met de integratielaag" },
    { naam: "Adapters (oa-adapters)", versie: gebouwd["oa-adapters"] ?? "onbekend", toelichting: "VPS 1: demo, Word, Collabora, LibreOffice" },
    { naam: "Kern (oa-kern)", versie: gebouwd["oa-kern"] ?? "onbekend", toelichting: "VPS 1, in het paneel" },
    { naam: "Contract (oa-contract)", versie: gebouwd["oa-contract"] ?? "onbekend", toelichting: "VPS 1; platform en diensten noemen hun eigen versie" },
    { naam: "Integratielaag", versie: gebouwd["oa-integratielaag"] ?? "onbekend", toelichting: "VPS 1" },
    { naam: "Platform (opendop-mini)", versie: platform, toelichting: "VPS 2" },
    { naam: "Assistent-services", versie: diensten, toelichting: "VPS 3" },
  ];
}
