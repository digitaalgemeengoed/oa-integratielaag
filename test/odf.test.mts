// Rekenbladen en presentaties in Collabora: lezen, beoordelen met de echte
// regels van oa-services, herstellen. Met LibreOffice (als dat er is) wordt
// gecontroleerd dat de bestanden ook echt te openen zijn.
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { odfNaarHtml, pasOdfAan, voorbeeldPresentatie, voorbeeldRekenblad } from "../lib/odf.ts";
import { PLATTEGROND_PNG } from "../lib/plattegrond.ts";
import { beoordeelHtml } from "../../oa-services/dist/toegankelijkheid.js";

const regels = (html: string) => beoordeelHtml(html).map((b) => `${b.regel}|${b.plek?.pad}|${b.voorstel?.vraag?.veld ?? "-"}`).sort();

test("rekenblad: lezen, beoordelen, hernoemen en alternatieve tekst", () => {
  let ods = voorbeeldRekenblad(PLATTEGROND_PNG);
  const html = odfNaarHtml(ods, "rekenblad");
  assert.match(html, /^<section data-oa="blad"><h2>Blad1<\/h2><table><tbody><tr><td>Post<\/td><td>Bedrag<\/td><\/tr><tr><td>Bouw<\/td><td>1250000<\/td><\/tr>/);
  assert.match(html, /<section data-oa="blad"><h2>Toelichting<\/h2><table>/);
  assert.deepEqual(regels(html), ["WCAG 2.2 1.1.1|body/0/2|alt", "WCAG 2.2 2.4.6|body/0/0|tekst"]);
  ods = pasOdfAan(ods, "rekenblad", "body/0/0", "<h2>Begroting 2027</h2>");
  assert.throws(() => pasOdfAan(ods, "rekenblad", "body/0/0", "<h2>Toelichting</h2>"), /al een blad/);
  assert.throws(() => pasOdfAan(ods, "rekenblad", "body/0/0", "<h2>a:b</h2>"), /bladnaam/);
  ods = pasOdfAan(ods, "rekenblad", "body/0/2", '<img alt="Plattegrond &amp; stalling">');
  const na = odfNaarHtml(ods, "rekenblad");
  assert.match(na, /<h2>Begroting 2027<\/h2>/);
  assert.match(na, /<img alt="Plattegrond &amp; stalling">/);
  assert.deepEqual(regels(na), []);
  controleerMetLibreOffice(ods, "ods");
});

test("presentatie: dia zonder titel, dubbele titel, alternatieve tekst", () => {
  let odp = voorbeeldPresentatie(PLATTEGROND_PNG);
  const html = odfNaarHtml(odp, "presentatie");
  assert.match(html, /^<section data-oa="dia"><h2>Fietsenstalling Stationsplein<\/h2><ul><li>Waarom een stalling<\/li>/);
  assert.deepEqual(regels(html), ["WCAG 2.2 1.1.1|body/1/0|alt", "WCAG 2.2 2.4.2|body/1|titel", "WCAG 2.2 2.4.6|body/2/0|tekst"]);
  // Zoals in het paneel: de vraag "titel" wordt een attribuut op de sectie.
  odp = pasOdfAan(odp, "presentatie", "body/1", '<section data-oa="dia" titel="Situatie ter plaatse"><img></section>');
  odp = pasOdfAan(odp, "presentatie", "body/2/0", "<h2>Fietsenstalling: planning</h2>");
  // De titel staat nu vooraan; de afbeelding is element 1 van de dia.
  odp = pasOdfAan(odp, "presentatie", "body/1/1", '<img alt="Plattegrond van het plein">');
  const na = odfNaarHtml(odp, "presentatie");
  assert.match(na, /<section data-oa="dia"><h2>Situatie ter plaatse<\/h2><img alt="Plattegrond van het plein"><\/section>/);
  assert.deepEqual(regels(na), []);
  controleerMetLibreOffice(odp, "odp");
});

function controleerMetLibreOffice(data: Uint8Array, ext: string) {
  const soffice = ["/usr/bin/soffice", "/usr/local/bin/soffice"].find(existsSync);
  if (!soffice) return;
  const map = mkdtempSync(join(tmpdir(), "odf-"));
  writeFileSync(join(map, `proef.${ext}`), data);
  execFileSync(soffice, [`-env:UserInstallation=file://${map}/profiel`, "--headless", "--convert-to", "pdf", "--outdir", map, join(map, `proef.${ext}`)], { stdio: "ignore", timeout: 120_000 });
  assert.ok(readFileSync(join(map, "proef.pdf")).length > 1000, `LibreOffice kon het ${ext}-bestand niet openen`);
}
