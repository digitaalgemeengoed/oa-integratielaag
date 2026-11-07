import { ingang } from "../../../../lib/ingang";

export const dynamic = "force-dynamic";

/** De ingang voor vastleggen. Elke aanroep levert een gebeurtenis op. */
const h = ingang("vastleggend");
export { h as POST, h as PUT };
