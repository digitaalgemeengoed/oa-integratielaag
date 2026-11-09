import { veiligTerug, type Reden } from "../../lib/inloggen";

export const dynamic = "force-dynamic";
export const metadata = { title: "Inloggen — Office Assistent" };

const UITLEG: Record<Reden, { kop: string; tekst: string }> = {
  verlopen: {
    kop: "Het inloggen is verlopen",
    tekst: "Het inlogscherm stond te lang open, of de inloglink is al gebruikt (bijvoorbeeld via de terugknop). Log opnieuw in; je werk is niet verloren.",
  },
  geweigerd: {
    kop: "Inloggen is afgebroken",
    tekst: "Het inloggen is geannuleerd of je account heeft geen toegang. Log opnieuw in, of vraag de beheerder om toegang.",
  },
  dienst: {
    kop: "De inlogdienst is nu niet bereikbaar",
    tekst: "Inloggen lukt even niet aan de kant van de server. Probeer het over een paar minuten opnieuw. Blijft het zo, meld het dan bij de beheerder.",
  },
  onbekend: {
    kop: "Inloggen is niet gelukt",
    tekst: "Er ging iets mis bij het inloggen. Probeer het opnieuw. Blijft het zo, meld het dan bij de beheerder, met het tijdstip.",
  },
};

export default async function Inloggen({ searchParams }: { searchParams: Promise<{ reden?: string; terug?: string }> }) {
  const p = await searchParams;
  const reden: Reden = p.reden && p.reden in UITLEG ? (p.reden as Reden) : "onbekend";
  const terug = veiligTerug(p.terug);
  const { kop, tekst } = UITLEG[reden];
  return (
    <main style={{ maxWidth: 480, margin: "32px auto", padding: "0 16px", lineHeight: 1.5 }}>
      <h1 style={{ fontSize: 20, margin: "0 0 8px" }}>{kop}</h1>
      <p style={{ margin: "0 0 20px" }}>{tekst}</p>
      <p style={{ margin: "0 0 12px" }}>
        <a
          href={`/api/auth/login?terug=${encodeURIComponent(terug)}`}
          style={{ display: "inline-block", padding: "8px 16px", background: "#1d5a8c", color: "#fff", borderRadius: 6, textDecoration: "none", fontWeight: 600 }}
        >
          Opnieuw inloggen
        </a>
      </p>
      <p style={{ margin: 0, fontSize: 14, color: "#555" }}>
        <a href="/" style={{ color: "#1d5a8c" }}>
          Naar de startpagina
        </a>
      </p>
    </main>
  );
}
