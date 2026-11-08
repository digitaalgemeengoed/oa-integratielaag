// Kopieert de gebouwde pagina's van oa-adapters (demo-werkomgeving, Word,
// Collabora, LibreOffice) naar public/, zodat de integratielaag ze uitlevert
// op hetzelfde adres als de API. Moet vóór `next build`.
// Gebruik: node scripts/werkomgeving.mjs <pad naar oa-adapters/dist/web>
import { cp, rm, access, readdir } from "node:fs/promises";
import { join, resolve } from "node:path";

const bron = resolve(process.argv[2] ?? "../oa-adapters/dist/web");
const doel = resolve("public");
try {
  await access(join(bron, "werkomgeving", "index.html"));
} catch {
  console.error(`Geen gebouwde pagina's gevonden in ${bron}. Bouw eerst oa-adapters.`);
  process.exit(1);
}
for (const naam of await readdir(bron)) {
  await rm(join(doel, naam), { recursive: true, force: true });
  await cp(join(bron, naam), join(doel, naam), { recursive: true });
}
console.log(`pagina's gekopieerd naar ${doel}: ${(await readdir(bron)).join(", ")}`);
