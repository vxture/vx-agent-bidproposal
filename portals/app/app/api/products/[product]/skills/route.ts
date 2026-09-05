import { NextResponse } from "next/server";
import { isRefusal, resolveCapabilityCaller } from "../../../../capability/caller";
import { isOurProduct } from "../../../../capability/contract";
import { listDistributedSkills } from "../../../../capability/skills";

// GET /api/products/:product/skills - the Skills Runos distributes to this
// product, relayed for the Ruyin runtime (vxture-ruyin ADR-020 section 3c).
//
// `?taskId=` is optional: ruyin refreshes its product-distributed layer outside
// any task, and Runos still wants an aggregation key, so a per-refresh id is
// minted here when none is given. It is NOT an execution - a discover is a
// catalogue read on Runos's ledger.

export const dynamic = "force-dynamic";

export async function GET(req: Request, ctx: { params: Promise<{ product: string }> }): Promise<Response> {
  const { product } = await ctx.params;
  if (!isOurProduct(product)) {
    return NextResponse.json({ error: "unknown product", product }, { status: 404 });
  }
  const caller = await resolveCapabilityCaller(req.headers);
  if (isRefusal(caller)) return NextResponse.json({ error: caller.error }, { status: caller.status });

  const url = new URL(req.url);
  const taskId = url.searchParams.get("taskId")?.trim() || `skills-refresh-${Date.now().toString(36)}`;
  try {
    const result = await listDistributedSkills(caller, taskId.slice(0, 128));
    return NextResponse.json(result, {
      // ruyin caches by digest per skill; the catalogue itself may be re-asked freely.
      headers: { "cache-control": "private, max-age=60" },
    });
  } catch (cause) {
    return NextResponse.json({ error: cause instanceof Error ? cause.message : String(cause) }, { status: 503 });
  }
}
