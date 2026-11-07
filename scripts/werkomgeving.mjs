// Kopieert de gebouwde demo-werkomgeving naar public/werkomgeving, zodat de
// integratielaag haar uitlevert op hetzelfde adres als de API.
// Gebruik: node scripts/werkomgeving.mjs <pad naar oa-adapters/dist/werkomgeving>
import { cp, rm, access } from "node:fs/promises";
import { resolve } from "node:path";

const bron = resolve(process.argv[2] ?? "../oa-adapters/dist/werkomgeving");
const doel = resolve("public/werkomgeving");
try {
  await access(bron);
} catch {
  console.error(`Geen gebouwde werkomgeving gevonden in ${bron}. Bouw eerst oa-adapters.`);
  process.exit(1);
}
await rm(doel, { recursive: true, force: true });
await cp(bron, doel, { recursive: true });
console.log(`werkomgeving gekopieerd naar ${doel}`);
