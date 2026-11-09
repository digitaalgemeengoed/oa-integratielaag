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

/** Versies van de onderdelen die in deze integratielaag zijn meegebouwd (voor de overzichtspagina). */
function versies() {
  const uit = {};
  for (const naam of ["oa-contract", "oa-kern", "oa-paneel", "oa-adapters", "oa-integratielaag"]) {
    for (const map of [join(wortel, naam), join(wortel, "node_modules", "@digitaalgemeengoed", naam)]) {
      try {
        uit[naam] = JSON.parse(readFileSync(join(map, "package.json"), "utf8")).version;
        break;
      } catch {
        /* volgende plek */
      }
    }
  }
  try {
    const d = readFileSync(join(wortel, "oa-adapters", "libreoffice-extensie", "description.xml"), "utf8");
    uit["libreoffice-extensie"] = /<version value="([^"]+)"/.exec(d)?.[1];
  } catch {
    /* niet in deze werkplaats */
  }
  return uit;
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  env: { OA_VERSIES: JSON.stringify(versies()) },
  poweredByHeader: false,
  transpilePackages: ["@digitaalgemeengoed/oa-contract"],
  turbopack: { root: wortel },
  outputFileTracingRoot: wortel,
  async rewrites() {
    // De gebouwde pagina's van oa-adapters staan in public/.
    return [
      { source: "/werkomgeving", destination: "/werkomgeving/index.html" },
      { source: "/collabora", destination: "/collabora/index.html" },
      { source: "/libreoffice", destination: "/libreoffice/index.html" },
    ];
  },
  async headers() {
    return [
      {
        source: "/:pad*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "same-origin" },
          // Niemand mag deze pagina's in een iframe zetten, behalve wij zelf...
          { key: "Content-Security-Policy", value: "frame-ancestors 'self'" },
        ],
      },
      {
        // ...en Word voor het web: dat toont het takenvenster in een iframe.
        source: "/word/:pad*",
        headers: [
          {
            key: "Content-Security-Policy",
            value:
              "frame-ancestors 'self' https://*.officeapps.live.com https://*.office.com https://*.office365.com https://*.microsoft365.com https://*.cloud.microsoft https://*.sharepoint.com https://*.officeppe.com",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
