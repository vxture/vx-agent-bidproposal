import { NextResponse } from "next/server";
import { isRefusal, resolveCapabilityCaller } from "../../../../../../capability/caller";
import { isOurProduct } from "../../../../../../capability/contract";
import { getTurnResolver, TurnRequestError, validateTurnRequest } from "../../../../../../capability/turn";
import { AtlasError } from "../../../../../../chat/atlas-client";
import { S2STokenError } from "../../../../../../lib/s2s-token";
import { capabilityAccess } from "../../../../../../capability/access";

// POST /api/products/:product/capabilities/:id/turn - one round of the Ruyin
// harness loop (vxture-ruyin ADR-002 / ADR-009 / ADR-011).
//
// Identity comes from our RP session or own-audience user bearer, verified in
// capability/caller.ts; C2 data access is checked before provider work. The body
// carries FACTS only. `projectId` in the body
// is ruyin's local container id and is echoed nowhere - it must never be read
// as a workspace.
//
// Error posture follows ruyin's client: 4xx other than 408/425/429 is "will keep
// refusing", 5xx/429 is "try again later" (ruyin parks the task). So a
// misconfigured Atlas is a 503, and a body we cannot read is a 400.

export const dynamic = "force-dynamic";

export async function POST(
  req: Request,
  ctx: { params: Promise<{ product: string; id: string }> },
): Promise<Response> {
  const { product, id } = await ctx.params;
  if (!isOurProduct(product)) {
    return NextResponse.json({ error: "unknown product", product }, { status: 404 });
  }

  const caller = await resolveCapabilityCaller(req.headers, { method: req.method });
  if (isRefusal(caller)) return NextResponse.json({ error: caller.error, ...(caller.code ? { code: caller.code, retryable: caller.retryable } : {}) }, { status: caller.status });
  const access = await capabilityAccess(caller);
  if (access) return NextResponse.json({ error: access.error, code: access.code, retryable: access.retryable }, { status: access.status });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "body must be JSON" }, { status: 400 });
  }
  let request;
  try {
    request = validateTurnRequest(body);
  } catch (cause) {
    if (cause instanceof TurnRequestError) return NextResponse.json({ error: cause.message }, { status: 400 });
    throw cause;
  }

  let resolver;
  try {
    resolver = getTurnResolver();
  } catch (cause) {
    // Not wired yet is a real condition; say so rather than mock silently.
    return NextResponse.json({ error: cause instanceof Error ? cause.message : "model service is not configured",
      code: "MODEL_NOT_CONFIGURED", retryable: false }, { status: 503 });
  }

  try {
    const turn = await resolver.turn(request, id, caller);
    return NextResponse.json(turn, { headers: { "x-bidproposal-turn-mode": resolver.mode } });
  } catch (cause) {
    // A quota/configuration refusal is not a transient provider outage.
    const retryable = cause instanceof AtlasError || cause instanceof S2STokenError ? cause.retryable : !(cause instanceof TurnRequestError);
    return NextResponse.json(
      { error: cause instanceof Error ? cause.message : "capability call failed", retryable,
        ...(cause instanceof AtlasError ? { code: cause.envelope.code, ...(cause.retryAfterMs !== undefined ? { retryAfterMs: cause.retryAfterMs } : {}) } : {}),
        ...(cause instanceof S2STokenError ? { code: cause.code } : {}) },
      { status: 503 },
    );
  }
}
