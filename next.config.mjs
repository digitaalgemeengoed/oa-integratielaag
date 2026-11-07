import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const hier = dirname(fileURLToPath(import.meta.url));

/**
 * Bouwwortel. Staat deze repository in een werkplaats naast de andere
 * repositories (zie oa-uitrol/haal-op.sh), dan is de werkplaats de wortel:
 * daar staan de gedeelde node_modules. Anders deze map zelf.
 */
function bouwwortel() {
  const ouder = resolve(hier, "..");
  const pakket = join(ouder, "package.json");
  if (existsSync(pakket)) {
    try {
      const p = JSON.parse(readFileSync(pakket, "utf8"));
      if (Array.isArray(p.workspaces) && p.workspaces.includes("oa-integratielaag")) return ouder;
    } catch {
      /* geen werkplaats */
    }
  }
  return hier;
}

const wortel = bouwwortel();

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  poweredByHeader: false,
  transpilePackages: ["@digitaalgemeengoed/oa-contract"],
  turbopack: { root: wortel },
  outputFileTracingRoot: wortel,
  async rewrites() {
    // De gebouwde demo-werkomgeving staat in public/werkomgeving.
    return [{ source: "/werkomgeving", destination: "/werkomgeving/index.html" }];
  },
  async headers() {
    return [
      {
        source: "/:pad*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "same-origin" },
        ],
      },
    ];
  },
};

export default nextConfig;
