import { ingang } from "../../../../lib/ingang";

export const dynamic = "force-dynamic";

/** De ingang voor snelle, lezende vragen. Commit nooit. */
const h = ingang("lezend");
export { h as GET, h as POST };
