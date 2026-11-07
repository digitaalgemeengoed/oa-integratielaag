/**
 * De twee ingangen, als witte lijst. Wat hier niet staat, bestaat niet.
 *
 * Lezend: committen nooit. Gaat naar de Object Service (alleen GET) of naar
 * de assistent-services.
 * Vastleggen: elke aanroep levert in het platform een gebeurtenis op.
 */
export interface Route {
  methode: "GET" | "POST" | "PUT";
  patroon: RegExp;
  doel: "platform" | "diensten" | "zelf";
  /** Pad bij het doel, uit de delen van het patroon. */
  pad: (m: RegExpMatchArray) => string;
  rol?: "medewerker" | "beheerder";
}

const ID = "([0-9a-fA-F-]{36})";
const NAAM = "([a-z][a-z0-9-]{1,60})";

export const LEZEND: Route[] = [
  { methode: "GET", patroon: /^wie-ben-ik$/, doel: "zelf", pad: () => "" },
  { methode: "GET", patroon: /^objecttypen$/, doel: "platform", pad: () => "/objecttypen" },
  { methode: "GET", patroon: new RegExp(`^objecttypen/${NAAM}$`), doel: "platform", pad: (m) => `/objecttypen/${m[1]}` },
  { methode: "GET", patroon: new RegExp(`^objecten/${ID}$`), doel: "platform", pad: (m) => `/objecten/${m[1]}` },
  { methode: "GET", patroon: new RegExp(`^objecten/${ID}/gebeurtenissen$`), doel: "platform", pad: (m) => `/objecten/${m[1]}/gebeurtenissen` },
  {
    methode: "GET",
    patroon: new RegExp(`^objecten/${ID}/versies/([0-9]{1,6})/inhoud$`),
    doel: "platform",
    pad: (m) => `/objecten/${m[1]}/versies/${m[2]}/inhoud`,
  },
  { methode: "POST", patroon: /^toegankelijkheid$/, doel: "diensten", pad: () => "/toegankelijkheid" },
];

export const VASTLEGGEND: Route[] = [
  { methode: "POST", patroon: /^objecten$/, doel: "platform", pad: () => "/objecten" },
  { methode: "PUT", patroon: new RegExp(`^objecten/${ID}/metadata$`), doel: "platform", pad: (m) => `/objecten/${m[1]}/metadata` },
  { methode: "POST", patroon: new RegExp(`^objecten/${ID}/versies$`), doel: "platform", pad: (m) => `/objecten/${m[1]}/versies` },
  { methode: "POST", patroon: /^objecttypen$/, doel: "platform", pad: () => "/objecttypen", rol: "beheerder" },
];

export function zoek(lijst: Route[], methode: string, pad: string): { route: Route; m: RegExpMatchArray } | null {
  for (const route of lijst) {
    if (route.methode !== methode) continue;
    const m = pad.match(route.patroon);
    if (m) return { route, m };
  }
  return null;
}
