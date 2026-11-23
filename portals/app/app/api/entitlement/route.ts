import { NextResponse } from "next/server";
import type { AccessState } from "../../access/types";
import { GET as readAccess } from "../access/route";

// GET /api/entitlement (C2 verification channel): resolve the current session's
// workspace entitlement and expose the gate outcomes. Read-only; never returns
// a platform credential or a fabricated commercial entitlement.
export const dynamic = "force-dynamic";

export async function GET(): Promise<Response> {
  const access = await readAccess();
  const decision = await access.json() as AccessState;
  const headers = { "cache-control": "private, no-store" };
  if (decision.status === "authenticated") {
    return NextResponse.json({ entitlement: decision.entitlement, gates: decision.gates }, { headers });
  }
  const status = decision.status === "unavailable" || decision.status === "unconfigured" ? 503
    : decision.status === "unassigned" || decision.status === "inactive-account" || decision.status === "no-workspace" ? 403
    : 401;
  return NextResponse.json({ authenticated: false, status: decision.status }, { status, headers });
}
