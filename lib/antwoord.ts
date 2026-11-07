import { NextResponse } from "next/server";

export class Weigering extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    melding: string,
  ) {
    super(melding);
  }
}

/** Voert een handler uit en zet een weigering of fout om in een nette fout. */
export async function behandel(werk: () => Promise<Response>): Promise<Response> {
  try {
    return await werk();
  } catch (e) {
    if (e instanceof Weigering) {
      return NextResponse.json({ fout: e.code, melding: e.message }, { status: e.status });
    }
    console.error(e);
    return NextResponse.json(
      { fout: "niet-bereikbaar", melding: "Het platform of de dienst is nu niet bereikbaar. Je werk is niet geblokkeerd; probeer het zo opnieuw." },
      { status: 503 },
    );
  }
}
