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
  /** De querystring gaat mee naar het doel. */
  metQuery?: boolean;
}

const ID = "([0-9a-fA-F-]{36})";
const NAAM = "([a-z][a-z0-9-]{1,60})";

export const LEZEND: Route[] = [
  { methode: "GET", patroon: /^wie-ben-ik$/, doel: "zelf", pad: () => "" },
  { methode: "GET", patroon: /^objecttypen$/, doel: "platform", pad: () => "/objecttypen" },
  { methode: "GET", patroon: new RegExp(`^objecttypen/${NAAM}$`), doel: "platform", pad: (m) => `/objecttypen/${m[1]}` },
  { methode: "GET", patroon: new RegExp(`^objecten/${ID}$`), doel: "platform", pad: (m) => `/objecten/${m[1]}` },
  { methode: "GET", patroon: new RegExp(`^objecten/${ID}/gebeurtenissen$`), doel: "platform", pad: (m) => `/objecten/${m[1]}/gebeurtenissen` },
  { methode: "GET", patroon: new RegExp(`^objecten/${ID}/pii$`), doel: "platform", pad: (m) => `/objecten/${m[1]}/pii` },
  {
    methode: "GET",
    patroon: new RegExp(`^objecten/${ID}/versies/([0-9]{1,6})/inhoud$`),
    doel: "platform",
    pad: (m) => `/objecten/${m[1]}/versies/${m[2]}/inhoud`,
  },
  {
    methode: "GET",
    patroon: new RegExp(`^objecten/${ID}/versies/([0-9]{1,6})/weergaven/(html|tekst|pdf)$`),
    doel: "platform",
    pad: (m) => `/objecten/${m[1]}/versies/${m[2]}/weergaven/${m[3]}`,
    // ?soort=geanonimiseerd: de geanonimiseerde weergave
    metQuery: true,
  },
  { methode: "POST", patroon: /^toegankelijkheid$/, doel: "diensten", pad: () => "/toegankelijkheid" },
  { methode: "POST", patroon: /^anonimiseren$/, doel: "diensten", pad: () => "/anonimiseren" },
  { methode: "POST", patroon: /^anonimiseren\/toepassen$/, doel: "diensten", pad: () => "/anonimiseren/toepassen" },
  { methode: "GET", patroon: /^zoeken$/, doel: "platform", pad: () => "/zoeken", metQuery: true },
];

export const VASTLEGGEND: Route[] = [
  { methode: "POST", patroon: /^objecten$/, doel: "platform", pad: () => "/objecten" },
  { methode: "PUT", patroon: new RegExp(`^objecten/${ID}/metadata$`), doel: "platform", pad: (m) => `/objecten/${m[1]}/metadata` },
  { methode: "POST", patroon: new RegExp(`^objecten/${ID}/versies$`), doel: "platform", pad: (m) => `/objecten/${m[1]}/versies` },
  { methode: "PUT", patroon: new RegExp(`^objecten/${ID}/aard$`), doel: "platform", pad: (m) => `/objecten/${m[1]}/aard` },
  { methode: "POST", patroon: new RegExp(`^objecten/${ID}/pii$`), doel: "platform", pad: (m) => `/objecten/${m[1]}/pii` },
  // Inzien legt een gebeurtenis vast; daarom achter de vastleggende ingang.
  { methode: "POST", patroon: new RegExp(`^objecten/${ID}/pii/onthul$`), doel: "platform", pad: (m) => `/objecten/${m[1]}/pii/onthul` },
  { methode: "POST", patroon: new RegExp(`^objecten/${ID}/pii/vernietig$`), doel: "platform", pad: (m) => `/objecten/${m[1]}/pii/vernietig`, rol: "beheerder" },
  {
    methode: "POST",
    patroon: new RegExp(`^objecten/${ID}/versies/([0-9]{1,6})/anonimisering$`),
    doel: "platform",
    pad: (m) => `/objecten/${m[1]}/versies/${m[2]}/anonimisering`,
  },
  { methode: "POST", patroon: /^objecttypen$/, doel: "platform", pad: () => "/objecttypen", rol: "beheerder" },
  {
    methode: "POST",
    patroon: new RegExp(`^objecten/${ID}/onleesbaar$`),
    doel: "platform",
    pad: (m) => `/objecten/${m[1]}/onleesbaar`,
    rol: "beheerder",
  },
];

export function zoek(lijst: Route[], methode: string, pad: string): { route: Route; m: RegExpMatchArray } | null {
  for (const route of lijst) {
    if (route.methode !== methode) continue;
    const m = pad.match(route.patroon);
    if (m) return { route, m };
  }
  return null;
}
