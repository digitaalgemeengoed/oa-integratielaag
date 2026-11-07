function nodig(naam: string): string {
  const w = process.env[naam];
  if (!w) throw new Error(`Omgevingsvariabele ${naam} ontbreekt`);
  return w;
}

export const config = {
  /** "oidc" (Keycloak) of "dev" (alleen lokaal: vaste testgebruikers, geen inlog). */
  authModus: () => (process.env.OA_AUTH ?? "oidc") as "oidc" | "dev",
  oidc: {
    issuer: () => nodig("OIDC_ISSUER"),
    clientId: () => nodig("OIDC_CLIENT_ID"),
    clientSecret: () => nodig("OIDC_CLIENT_SECRET"),
    /** Publiek adres van de integratielaag, voor de terugkeer na inloggen. */
    basisUrl: () => nodig("OA_BASIS_URL"),
  },
  platformUrl: () => nodig("PLATFORM_URL"),
  platformSleutel: () => nodig("PLATFORM_DIENSTSLEUTEL"),
  dienstenUrl: () => nodig("DIENSTEN_URL"),
  dienstenSleutel: () => nodig("DIENSTEN_DIENSTSLEUTEL"),
  sessieUren: Number(process.env.OA_SESSIE_UREN ?? 8),
};
