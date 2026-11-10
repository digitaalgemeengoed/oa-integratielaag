import { config } from "../lib/config";
import { installeerbaar, opDeServer, type Onderdeel } from "../lib/versies";

export const dynamic = "force-dynamic";

function Tabel({ rijen }: { rijen: Onderdeel[] }) {
  return (
    <table style={{ borderCollapse: "collapse", width: "100%", fontSize: 15 }}>
      <thead>
        <tr>
          <th style={{ textAlign: "left", padding: "4px 8px 4px 0", borderBottom: "1px solid #ccc" }}>Onderdeel</th>
          <th style={{ textAlign: "left", padding: "4px 8px", borderBottom: "1px solid #ccc" }}>Versie</th>
          <th style={{ textAlign: "left", padding: "4px 0 4px 8px", borderBottom: "1px solid #ccc" }}>Toelichting</th>
        </tr>
      </thead>
      <tbody>
        {rijen.map((r) => (
          <tr key={r.naam}>
            <td style={{ padding: "4px 8px 4px 0", verticalAlign: "top", borderBottom: "1px solid #eee" }}>{r.naam}</td>
            <td style={{ padding: "4px 8px", verticalAlign: "top", borderBottom: "1px solid #eee", whiteSpace: "nowrap" }}>
              <code>{r.versie}</code>
            </td>
            <td style={{ padding: "4px 0 4px 8px", verticalAlign: "top", borderBottom: "1px solid #eee", color: "#444" }}>{r.toelichting}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export default async function Start() {
  const dev = config.authModus() === "dev";
  const [zelf, server] = [installeerbaar(), await opDeServer()];
  const manifest = zelf[0]!.versie;
  const extensie = zelf[1]!.versie;
  return (
    <main style={{ maxWidth: 640, margin: "48px auto", padding: "0 16px", lineHeight: 1.5 }}>
      <h1 style={{ fontSize: 28 }}>Office Assistent</h1>
      <p>
        Werkend prototype van de assistent uit <em>XENA Deel II</em>. Een prototype, geen product: gebruik alleen testgegevens.
      </p>
      <h2 style={{ fontSize: 20 }}>Proberen</h2>
      <ul>
        <li>
          <a href="/werkomgeving/">Demo-werkomgeving</a>: een eenvoudige tekstverwerker met het paneel van de assistent ernaast.
        </li>
        <li>
          <strong>Microsoft Word, Excel en PowerPoint</strong> (ook voor het web): download het <a href="/word/manifest.xml">manifest</a> en kies in het programma{" "}
          <em>Invoegtoepassingen → Mijn invoegtoepassingen → Mijn invoegtoepassing uploaden</em>. De knop <em>Assistent</em> staat daarna op het tabblad Start. Excel en PowerPoint zijn nog niet getest. Manifest: versie{" "}
          <code>{manifest}</code>.
        </li>
        <li>
          <a href="/collabora">Collabora Online</a>: LibreOffice in de browser, met het paneel ernaast (als Collabora in deze omgeving aanstaat).
        </li>
        <li>
          <a href="/libreoffice">LibreOffice op je eigen computer</a>: installeer de extensie; de assistent staat in de zijbalk van Writer, Calc en Impress. Extensie: versie <code>{extensie}</code>.
        </li>
        <li>
          <a href="/zoeken">Zoeken</a> in de stukken van je gemeente (als de zoekindex aanstaat).
        </li>
        <li>
          <a href="/api/lees/wie-ben-ik">Wie ben ik?</a> laat zien als wie je bent aangemeld.
        </li>
      </ul>
      <h2 style={{ fontSize: 20 }}>Versies</h2>
      <p>Zelf installeren: alleen opnieuw als het nummer hier hoger is dan wat je hebt.</p>
      <Tabel rijen={zelf} />
      <p style={{ marginTop: 16 }}>Op de servers (bijwerken in de volgorde VPS 3, 2, 1; staat een server op een oudere versie, dan is die nog niet bijgewerkt):</p>
      <Tabel rijen={server} />
      {dev ? (
        <>
          <h2 style={{ fontSize: 20 }}>Testgebruiker kiezen</h2>
          <p>Deze omgeving draait zonder echte inlog (OA_AUTH=dev).</p>
          <ul>
            <li><a href="/api/auth/login?gebruiker=haarlem-medewerker&terug=/werkomgeving/">Medewerker, Haarlem</a></li>
            <li><a href="/api/auth/login?gebruiker=haarlem-beheerder&terug=/werkomgeving/">Beheerder en vrijgever, Haarlem</a></li>
            <li><a href="/api/auth/login?gebruiker=zandvoort-medewerker&terug=/werkomgeving/">Medewerker, Zandvoort</a></li>
          </ul>
        </>
      ) : (
        <p>
          <a href="/api/auth/login?terug=/werkomgeving/">Inloggen</a> · <a href="/api/auth/uit">Uitloggen</a>
        </p>
      )}
    </main>
  );
}
