"use client";

import { useState, type FormEvent } from "react";
import { LEES, VERTROUWELIJKHEID, WOO_INFORMATIECATEGORIEEN, type Zoekantwoord } from "@digitaalgemeengoed/oa-contract";

/** Alleen <mark> blijft over; al het andere in een fragment is al als tekst gecodeerd. */
function veiligFragment(f: string): string {
  return f.replace(/<(?!\/?mark>)[^>]*>/g, "");
}

const veld: React.CSSProperties = { font: "inherit", padding: "6px 8px", border: "1px solid #8a8a85", borderRadius: 4 };

/**
 * Zoeken in de stukken van de eigen gemeente. De resultaten komen uit de
 * zoekindex, maar zijn elk in het register bevestigd; de metadata komt uit
 * het register (OA-ADR-007).
 */
export default function Zoeken() {
  const [tekst, setTekst] = useState("");
  const [categorie, setCategorie] = useState("");
  const [vertrouwelijkheid, setVertrouwelijkheid] = useState("");
  const [antwoord, setAntwoord] = useState<Zoekantwoord | null>(null);
  const [melding, setMelding] = useState<string | null>(null);
  const [bezig, setBezig] = useState(false);

  async function zoek(e: FormEvent) {
    e.preventDefault();
    if (tekst.trim().length < 2) return;
    setBezig(true);
    setMelding(null);
    try {
      const r = await fetch(LEES.zoeken({ tekst: tekst.trim(), informatiecategorie: categorie || undefined, vertrouwelijkheid: vertrouwelijkheid || undefined }), {
        credentials: "same-origin",
      });
      const j = await r.json();
      if (!r.ok) {
        setAntwoord(null);
        setMelding(j.melding ?? `Fout ${r.status}`);
      } else setAntwoord(j);
    } catch {
      setMelding("De server is nu niet bereikbaar.");
    } finally {
      setBezig(false);
    }
  }

  return (
    <main style={{ maxWidth: 760, margin: "32px auto", padding: "0 16px", lineHeight: 1.5 }}>
      <p>
        <a href="/">Startpagina</a> · <a href="/werkomgeving">Demo-werkomgeving</a>
      </p>
      <h1 style={{ fontSize: 26 }}>Zoeken</h1>
      <p style={{ color: "#555" }}>In de stukken van je eigen gemeente. Elk resultaat is in het register bevestigd; de gegevens komen uit het register, niet uit de zoekindex.</p>
      <form onSubmit={zoek} style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "end" }}>
        <label style={{ display: "flex", flexDirection: "column", flex: "1 1 240px" }}>
          Zoekterm
          <input style={veld} value={tekst} onChange={(e) => setTekst(e.target.value)} minLength={2} maxLength={200} required />
        </label>
        <label style={{ display: "flex", flexDirection: "column", flex: "1 1 200px" }}>
          Informatiecategorie
          <select style={veld} value={categorie} onChange={(e) => setCategorie(e.target.value)}>
            <option value="">Alle</option>
            {WOO_INFORMATIECATEGORIEEN.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </label>
        <label style={{ display: "flex", flexDirection: "column", flex: "0 1 160px" }}>
          Vertrouwelijkheid
          <select style={veld} value={vertrouwelijkheid} onChange={(e) => setVertrouwelijkheid(e.target.value)}>
            <option value="">Alle</option>
            {VERTROUWELIJKHEID.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </label>
        <button type="submit" disabled={bezig} style={{ ...veld, background: "#2b4b6f", color: "#fff", border: 0, padding: "8px 16px", cursor: "pointer" }}>
          {bezig ? "Zoeken…" : "Zoeken"}
        </button>
      </form>

      {melding && (
        <p role="status" style={{ background: "#fff4d6", padding: "8px 12px", borderLeft: "4px solid #c47a00" }}>
          {melding}
        </p>
      )}

      {antwoord && (
        <section aria-live="polite" style={{ marginTop: 24 }}>
          <p>
            {antwoord.resultaten.length === 0 ? "Geen resultaten." : `${antwoord.resultaten.length} resultaat${antwoord.resultaten.length === 1 ? "" : "en"}.`}
            {antwoord.nietBevestigd > 0 && ` ${antwoord.nietBevestigd} treffer(s) in de index niet getoond: het register bevestigde ze niet.`}
          </p>
          <ol style={{ listStyle: "none", padding: 0, display: "flex", flexDirection: "column", gap: 16 }}>
            {antwoord.resultaten.map((r) => (
              <li key={r.identificatie} style={{ background: "#fff", padding: "12px 16px", borderRadius: 6, boxShadow: "0 1px 3px rgba(0,0,0,.12)" }}>
                <strong>{String(r.kern?.titel ?? r.metadata.naam ?? "Zonder naam")}</strong>
                <div style={{ fontSize: 13, color: "#555" }}>
                  {[r.kern?.informatiecategorie ?? r.metadata.informatiecategorie, r.kern?.vertrouwelijkheid ?? r.metadata.vertrouwelijkheid, r.versie ? `versie ${r.versie}` : null].filter(Boolean).join(" · ")}
                </div>
                {r.fragmenten.map((f, i) => (
                  <p key={i} style={{ margin: "6px 0", fontSize: 14 }} dangerouslySetInnerHTML={{ __html: `…${veiligFragment(f)}…` }} />
                ))}
                {r.versie && (
                  <a href={`/api/lees/objecten/${r.identificatie}/versies/${r.versie}/inhoud`} target="_blank" rel="noopener">
                    Openen
                  </a>
                )}
              </li>
            ))}
          </ol>
        </section>
      )}
    </main>
  );
}
