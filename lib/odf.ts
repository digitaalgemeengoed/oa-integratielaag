import { strFromU8, strToU8, unzipSync, zipSync, type Zippable } from "fflate";
import { DOMParser, XMLSerializer, type Document as XDocument, type Element as XElement } from "@xmldom/xmldom";
import { Weigering } from "./antwoord";

/**
 * Rekenbladen (.ods) en presentaties (.odp) in Collabora Online.
 *
 * Collabora kan via postMessage geen deel van een document vervangen. Voor
 * tekst valt de assistent daarom terug op het hele document. Voor een
 * rekenblad of presentatie is dat geen zinnige terugval; daar leest en
 * wijzigt de integratielaag het OpenDocument-bestand zelf (content.xml) en
 * laadt Collabora het daarna opnieuw.
 *
 * De html is dezelfde als die van de andere adapters (oa-adapters,
 * oa_bladen.py en de Office-adapters): per blad <section data-oa="blad"> met
 * de naam als <h2>, per dia <section data-oa="dia"> met de titel als <h2>.
 * Zo gelden dezelfde regels van de assistent-services.
 */

export type OdfSoort = "rekenblad" | "presentatie";

const NS = {
  office: "urn:oasis:names:tc:opendocument:xmlns:office:1.0",
  table: "urn:oasis:names:tc:opendocument:xmlns:table:1.0",
  text: "urn:oasis:names:tc:opendocument:xmlns:text:1.0",
  draw: "urn:oasis:names:tc:opendocument:xmlns:drawing:1.0",
  svg: "urn:oasis:names:tc:opendocument:xmlns:svg-compatible:1.0",
  presentation: "urn:oasis:names:tc:opendocument:xmlns:presentation:1.0",
  xlink: "http://www.w3.org/1999/xlink",
};

const MAX_RIJEN = 200;
const MAX_KOLOMMEN = 30;

export const ODF_MEDIATYPE: Record<"ods" | "odp", string> = {
  ods: "application/vnd.oasis.opendocument.spreadsheet",
  odp: "application/vnd.oasis.opendocument.presentation",
};

// ---------------------------------------------------------------------------
// Hulp bij XML
// ---------------------------------------------------------------------------

function kinderen(e: XElement, ns?: string, naam?: string): XElement[] {
  const uit: XElement[] = [];
  for (let n = e.firstChild; n; n = n.nextSibling) {
    if (n.nodeType !== 1) continue;
    const k = n as XElement;
    if ((!ns || k.namespaceURI === ns) && (!naam || k.localName === naam)) uit.push(k);
  }
  return uit;
}

function nakomelingen(e: XElement, ns: string, naam: string): XElement[] {
  return Array.from(e.getElementsByTagNameNS(ns, naam) as unknown as ArrayLike<XElement>);
}

function tekstVan(e: XElement): string {
  // Elke text:p is een regel; text:s en text:tab zijn spaties.
  const regels = nakomelingen(e, NS.text, "p").concat(nakomelingen(e, NS.text, "h"));
  const lees = (n: XElement): string => {
    let s = "";
    for (let k = n.firstChild; k; k = k.nextSibling) {
      if (k.nodeType === 3) s += k.nodeValue ?? "";
      else if (k.nodeType === 1) {
        const el = k as XElement;
        if (el.namespaceURI === NS.text && (el.localName === "s" || el.localName === "tab")) s += " ";
        else if (el.namespaceURI === NS.text && el.localName === "line-break") s += "\n";
        else s += lees(el);
      }
    }
    return s;
  };
  return (regels.length ? regels.map(lees) : [lees(e)]).join("\n");
}

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function escAttr(s: string): string {
  return esc(s).replace(/"/g, "&quot;");
}

function altVan(frame: XElement): string {
  const t = kinderen(frame, NS.svg, "title")[0];
  const d = kinderen(frame, NS.svg, "desc")[0];
  return (t?.textContent || d?.textContent || "").trim();
}

function isBeeld(frame: XElement): { beeld: boolean; grafiek: boolean } {
  const img = kinderen(frame, NS.draw, "image").length > 0;
  const obj = kinderen(frame, NS.draw, "object")[0];
  const grafiek = !!obj; // een ingebed object in een blad of dia is bijna altijd een grafiek
  return { beeld: img || !!obj, grafiek };
}

function imgHtml(frame: XElement, grafiek: boolean): string {
  const alt = altVan(frame);
  const extra = grafiek ? ' data-oa="grafiek"' : "";
  return alt ? `<img${extra} alt="${escAttr(alt)}">` : `<img${extra}>`;
}

// ---------------------------------------------------------------------------
// Lezen: html en een kaart van wat waar staat
// ---------------------------------------------------------------------------

type Onderdeel = { soort: "naam" | "tabel" | "titel" | "tekst" | "beeld"; el: XElement };
interface Pagina {
  el: XElement;
  onderdelen: Onderdeel[];
  html: string;
}

function leesXml(bestand: Uint8Array): { zip: Record<string, Uint8Array>; doc: XDocument } {
  let zip: Record<string, Uint8Array>;
  try {
    zip = unzipSync(bestand);
  } catch {
    throw new Weigering(422, "geen-odf", "Dit werkbestand is geen OpenDocument-bestand.");
  }
  if (!zip["content.xml"]) throw new Weigering(422, "geen-odf", "Dit werkbestand heeft geen content.xml.");
  const doc = new DOMParser().parseFromString(strFromU8(zip["content.xml"]), "text/xml");
  return { zip, doc };
}

function bladen(doc: XDocument): Pagina[] {
  const blad = nakomelingen(doc.documentElement as XElement, NS.office, "spreadsheet")[0];
  if (!blad) throw new Weigering(422, "geen-rekenblad", "Dit is geen rekenblad.");
  return kinderen(blad, NS.table, "table").map((t) => {
    const onderdelen: Onderdeel[] = [{ soort: "naam", el: t }];
    const delen = [`<h2>${esc(t.getAttributeNS(NS.table, "name") ?? "")}</h2>`];
    // Cellen: herhaalde rijen en kolommen uitgeschreven, lege randen weg.
    const rijen: string[][] = [];
    for (const rij of nakomelingen(t, NS.table, "table-row")) {
      const herhaal = Math.min(Number(rij.getAttributeNS(NS.table, "number-rows-repeated") || 1), MAX_RIJEN);
      const cellen: string[] = [];
      for (const cel of kinderen(rij).filter((c) => c.namespaceURI === NS.table && (c.localName === "table-cell" || c.localName === "covered-table-cell"))) {
        const n = Math.min(Number(cel.getAttributeNS(NS.table, "number-columns-repeated") || 1), MAX_KOLOMMEN);
        const w = kinderen(cel, NS.text, "p").map((p) => tekstVan(p)).join(" ");
        for (let i = 0; i < n && cellen.length < MAX_KOLOMMEN; i++) cellen.push(w);
      }
      for (let i = 0; i < herhaal && rijen.length < MAX_RIJEN; i++) rijen.push(cellen);
    }
    while (rijen.length && rijen[rijen.length - 1].every((c) => !c)) rijen.pop();
    const breedte = Math.max(0, ...rijen.map((r) => r.reduce((m, c, i) => (c ? i + 1 : m), 0)));
    if (rijen.length && breedte) {
      delen.push(`<table><tbody>${rijen.map((r) => `<tr>${r.slice(0, breedte).concat(Array(Math.max(0, breedte - r.length)).fill("")).map((c) => `<td>${esc(c)}</td>`).join("")}</tr>`).join("")}</tbody></table>`);
      onderdelen.push({ soort: "tabel", el: t });
    }
    for (const frame of nakomelingen(t, NS.draw, "frame")) {
      const b = isBeeld(frame);
      if (!b.beeld) continue;
      delen.push(imgHtml(frame, b.grafiek));
      onderdelen.push({ soort: "beeld", el: frame });
    }
    return { el: t, onderdelen, html: `<section data-oa="blad">${delen.join("")}</section>` };
  });
}

function titelVan(dia: XElement): XElement | null {
  return kinderen(dia, NS.draw, "frame").find((f) => f.getAttributeNS(NS.presentation, "class") === "title") ?? null;
}

function dias(doc: XDocument): Pagina[] {
  const pres = nakomelingen(doc.documentElement as XElement, NS.office, "presentation")[0];
  if (!pres) throw new Weigering(422, "geen-presentatie", "Dit is geen presentatie.");
  return kinderen(pres, NS.draw, "page").map((dia) => {
    const onderdelen: Onderdeel[] = [];
    const delen: string[] = [];
    const titel = titelVan(dia);
    const titeltekst = titel ? tekstVan(titel).replace(/\s+/g, " ").trim() : "";
    if (titel && titeltekst) {
      delen.push(`<h2>${esc(titeltekst)}</h2>`);
      onderdelen.push({ soort: "titel", el: titel });
    }
    for (const frame of kinderen(dia, NS.draw, "frame")) {
      if (frame === titel) continue;
      const b = isBeeld(frame);
      if (b.beeld) {
        delen.push(imgHtml(frame, b.grafiek));
        onderdelen.push({ soort: "beeld", el: frame });
        continue;
      }
      const klasse = frame.getAttributeNS(NS.presentation, "class");
      const regels = tekstVan(frame).split("\n").map((r) => r.trim()).filter(Boolean);
      if (!regels.length) continue;
      delen.push(klasse === "outline" ? `<ul>${regels.map((r) => `<li>${esc(r)}</li>`).join("")}</ul>` : `<p>${esc(regels.join(" "))}</p>`);
      onderdelen.push({ soort: "tekst", el: frame });
    }
    return { el: dia, onderdelen, html: `<section data-oa="dia">${delen.join("")}</section>` };
  });
}

function paginas(doc: XDocument, soort: OdfSoort): Pagina[] {
  return soort === "rekenblad" ? bladen(doc) : dias(doc);
}

export function odfNaarHtml(bestand: Uint8Array, soort: OdfSoort): string {
  return paginas(leesXml(bestand).doc, soort)
    .map((p) => p.html)
    .join("\n");
}

// ---------------------------------------------------------------------------
// Herstellen op een plek
// ---------------------------------------------------------------------------

/** Het eerste element van een stukje html: tag, attributen en tekst. Genoeg voor de herstellingen hier. */
export function eersteElement(html: string): { tag: string; attrs: Record<string, string>; tekst: string } | null {
  const m = /^\s*<([a-z][a-z0-9]*)([^>]*)>/i.exec(html);
  if (!m) return null;
  const attrs: Record<string, string> = {};
  for (const a of m[2].matchAll(/([a-z-]+)\s*=\s*"([^"]*)"/gi)) attrs[a[1].toLowerCase()] = ontsnap(a[2]);
  const binnen = html.slice(m[0].length).replace(new RegExp(`</${m[1]}>\\s*$`, "i"), "");
  return { tag: m[1].toLowerCase(), attrs, tekst: ontsnap(binnen.replace(/<[^>]+>/g, "")).trim() };
}

function ontsnap(s: string): string {
  return s.replace(/&quot;/g, '"').replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&#39;/g, "'").replace(/&amp;/g, "&");
}

export class NietUitvoerbaar extends Weigering {
  constructor(melding: string) {
    super(422, "niet-uitvoerbaar", melding);
  }
}

const HANDMATIG = "Deze wijziging kan in Collabora nog niet automatisch. Pas het met de hand aan.";
const WEG = "Dit deel van het document is niet meer gevonden. Beoordeel opnieuw.";

function zetAlt(doc: XDocument, frame: XElement, alt: string): void {
  for (const naam of ["title", "desc"]) {
    let e = kinderen(frame, NS.svg, naam)[0];
    if (!alt) {
      if (e) frame.removeChild(e);
      continue;
    }
    if (!e) {
      e = doc.createElementNS(NS.svg, `svg:${naam}`);
      frame.appendChild(e);
    }
    while (e.firstChild) e.removeChild(e.firstChild);
    e.appendChild(doc.createTextNode(alt));
  }
}

function zetTitel(doc: XDocument, dia: XElement, titel: string): void {
  if (!titel) throw new NietUitvoerbaar("Vul eerst een titel in.");
  let frame = titelVan(dia);
  if (!frame) {
    // Geen titelvak: een titelvak bovenaan de dia, als eerste vorm (leesvolgorde).
    frame = doc.createElementNS(NS.draw, "draw:frame");
    frame.setAttributeNS(NS.presentation, "presentation:class", "title");
    frame.setAttributeNS(NS.svg, "svg:x", "1.4cm");
    frame.setAttributeNS(NS.svg, "svg:y", "0.8cm");
    frame.setAttributeNS(NS.svg, "svg:width", "25.2cm");
    frame.setAttributeNS(NS.svg, "svg:height", "2.5cm");
    frame.appendChild(doc.createElementNS(NS.draw, "draw:text-box"));
    const eerste = kinderen(dia)[0];
    dia.insertBefore(frame, eerste ?? null);
  }
  const vak = kinderen(frame, NS.draw, "text-box")[0] ?? frame.appendChild(doc.createElementNS(NS.draw, "draw:text-box"));
  while (vak.firstChild) vak.removeChild(vak.firstChild);
  const p = doc.createElementNS(NS.text, "text:p");
  p.appendChild(doc.createTextNode(titel));
  vak.appendChild(p);
}

/**
 * Voert de herstelling uit die het nieuwe element op `pad` beschrijft, en
 * geeft het gewijzigde bestand terug. Hetzelfde als oa_bladen.vervang_segment
 * in LibreOffice: blad hernoemen, titel van een dia, alternatieve tekst.
 */
export function pasOdfAan(bestand: Uint8Array, soort: OdfSoort, pad: string, html: string): Uint8Array {
  const { zip, doc } = leesXml(bestand);
  const delen = pad.split("/");
  if (delen[0] !== "body") throw new NietUitvoerbaar(WEG);
  const [i, j] = delen.slice(1).map(Number);
  const lijst = paginas(doc, soort);
  const pagina = lijst[i];
  if (!pagina) throw new NietUitvoerbaar(WEG);
  const el = eersteElement(html);
  if (!el) throw new NietUitvoerbaar("De wijziging is leeg.");

  if (j === undefined) {
    if (soort === "presentatie" && el.tag === "section" && el.attrs.titel !== undefined) zetTitel(doc, pagina.el, el.attrs.titel.trim());
    else throw new NietUitvoerbaar(HANDMATIG);
  } else {
    const onderdeel = pagina.onderdelen[j];
    if (!onderdeel) throw new NietUitvoerbaar(WEG);
    if (onderdeel.soort === "beeld" && el.tag === "img") zetAlt(doc, onderdeel.el, el.attrs.alt ?? "");
    else if (onderdeel.soort === "naam" && /^h[1-6]$/.test(el.tag)) {
      const naam = el.tekst;
      if (!naam || naam.length > 31 || /[[\]*?:/\\]/.test(naam)) throw new NietUitvoerbaar("Een bladnaam is 1 tot 31 tekens, zonder [ ] * ? : / of \\.");
      if (lijst.some((p, k) => k !== i && p.el.getAttributeNS(NS.table, "name") === naam)) throw new NietUitvoerbaar(`Er is al een blad met de naam ${naam}.`);
      onderdeel.el.setAttributeNS(NS.table, "table:name", naam);
    } else if (onderdeel.soort === "titel" && /^h[1-6]$/.test(el.tag)) zetTitel(doc, pagina.el, el.tekst);
    else throw new NietUitvoerbaar(HANDMATIG);
  }
  zip["content.xml"] = strToU8(new XMLSerializer().serializeToString(doc));
  return pakIn(zip);
}

/** Weer inpakken; "mimetype" eerst en ongecomprimeerd, zoals ODF vraagt. */
function pakIn(bestanden: Record<string, Uint8Array>): Uint8Array {
  const z: Zippable = {};
  if (bestanden.mimetype) z.mimetype = [bestanden.mimetype, { level: 0 }];
  for (const [naam, data] of Object.entries(bestanden)) if (naam !== "mimetype") z[naam] = [data, { level: 6 }];
  return zipSync(z);
}

// ---------------------------------------------------------------------------
// Voorbeelden voor de demo
// ---------------------------------------------------------------------------

const KOP = `xmlns:office="${NS.office}" xmlns:table="${NS.table}" xmlns:text="${NS.text}" xmlns:draw="${NS.draw}" xmlns:svg="${NS.svg}" xmlns:presentation="${NS.presentation}" xmlns:xlink="${NS.xlink}" office:version="1.3"`;

function maakOdf(mediatype: string, inhoud: string, beeld?: Uint8Array): Uint8Array {
  const manifest = `<?xml version="1.0" encoding="UTF-8"?>
<manifest:manifest xmlns:manifest="urn:oasis:names:tc:opendocument:xmlns:manifest:1.0" manifest:version="1.3">
 <manifest:file-entry manifest:full-path="/" manifest:media-type="${mediatype}"/>
 <manifest:file-entry manifest:full-path="content.xml" manifest:media-type="text/xml"/>${beeld ? '\n <manifest:file-entry manifest:full-path="Pictures/plattegrond.png" manifest:media-type="image/png"/>' : ""}
</manifest:manifest>`;
  const z: Record<string, Uint8Array> = {
    mimetype: strToU8(mediatype),
    "META-INF/manifest.xml": strToU8(manifest),
    "content.xml": strToU8(`<?xml version="1.0" encoding="UTF-8"?>\n${inhoud}`),
  };
  if (beeld) z["Pictures/plattegrond.png"] = beeld;
  return pakIn(z);
}

function cel(w: string | number): string {
  return typeof w === "number"
    ? `<table:table-cell office:value-type="float" office:value="${w}"><text:p>${w}</text:p></table:table-cell>`
    : `<table:table-cell office:value-type="string"><text:p>${esc(w)}</text:p></table:table-cell>`;
}

/** Een begroting met een blad dat nog Blad1 heet en een afbeelding zonder alternatieve tekst. */
export function voorbeeldRekenblad(beeld: Uint8Array): Uint8Array {
  const rijen: (string | number)[][] = [["Post", "Bedrag"], ["Bouw", 1250000], ["Beheer per jaar", 45000], ["Onvoorzien", 60000]];
  const inhoud = `<office:document-content ${KOP}><office:body><office:spreadsheet>
<table:table table:name="Blad1"><table:shapes><draw:frame svg:x="5cm" svg:y="0.2cm" svg:width="6cm" svg:height="3.75cm"><draw:image xlink:href="Pictures/plattegrond.png" xlink:type="simple" xlink:show="embed" xlink:actuate="onLoad"/></draw:frame></table:shapes>
<table:table-column table:number-columns-repeated="2"/>
${rijen.map((r) => `<table:table-row>${r.map(cel).join("")}</table:table-row>`).join("\n")}
</table:table>
<table:table table:name="Toelichting"><table:table-column/><table:table-row>${cel("De bedragen zijn inclusief btw.")}</table:table-row></table:table>
</office:spreadsheet></office:body></office:document-content>`;
  return maakOdf(ODF_MEDIATYPE.ods, inhoud, beeld);
}

function tekstvak(klasse: string, y: string, regels: string[]): string {
  return `<draw:frame presentation:class="${klasse}" svg:x="1.4cm" svg:y="${y}" svg:width="25.2cm" svg:height="${klasse === "title" ? "2.5cm" : "10cm"}"><draw:text-box>${regels.map((r) => `<text:p>${esc(r)}</text:p>`).join("")}</draw:text-box></draw:frame>`;
}

/** Drie dia's: één goed, één zonder titel met een afbeelding zonder alternatieve tekst, één met dezelfde titel als de eerste. */
export function voorbeeldPresentatie(beeld: Uint8Array): Uint8Array {
  const inhoud = `<office:document-content ${KOP}><office:body><office:presentation>
<draw:page draw:name="dia1">${tekstvak("title", "0.8cm", ["Fietsenstalling Stationsplein"])}${tekstvak("outline", "4cm", ["Waarom een stalling", "Wat het kost", "Planning"])}</draw:page>
<draw:page draw:name="dia2"><draw:frame svg:x="5cm" svg:y="3cm" svg:width="16cm" svg:height="10cm"><draw:image xlink:href="Pictures/plattegrond.png" xlink:type="simple" xlink:show="embed" xlink:actuate="onLoad"/></draw:frame></draw:page>
<draw:page draw:name="dia3">${tekstvak("title", "0.8cm", ["Fietsenstalling Stationsplein"])}${tekstvak("outline", "4cm", ["Eerste fase: ontwerp", "Tweede fase: bouw"])}</draw:page>
</office:presentation></office:body></office:document-content>`;
  return maakOdf(ODF_MEDIATYPE.odp, inhoud, beeld);
}
