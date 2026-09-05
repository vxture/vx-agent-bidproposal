import { NextResponse } from "next/server";
import { isRefusal, resolveCapabilityCaller } from "../../../../../capability/caller";
import { isOurProduct } from "../../../../../capability/contract";
import { fetchDistributedSkill } from "../../../../../capability/skills";

// GET /api/products/:product/skills/:name - one distributed Skill: SKILL.md
// text, its resources, and a content digest for ruyin's cache.
//
// On Runos's ledger this is a DISTRIBUTION event (`runos_invoke` of the Skill's
// single `fetch` operation), attributed to the task in `?taskId=` when the
// runtime is inside one, else to the refresh id minted here.

export const dynamic = "force-dynamic";

const NAME_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export async function GET(
  req: Request,
  ctx: { params: Promise<{ product: string; name: string }> },
): Promise<Response> {
  const { product, name } = await ctx.params;
  if (!isOurProduct(product)) {
    return NextResponse.json({ error: "unknown product", product }, { status: 404 });
  }
  if (!NAME_RE.test(name) || name.length > 64) {
    // Agent Skills naming rule; anything else cannot be a skill name we relayed.
    return NextResponse.json({ error: "invalid skill name" }, { status: 400 });
  }
  const caller = await resolveCapabilityCaller(req.headers);
  if (isRefusal(caller)) return NextResponse.json({ error: caller.error }, { status: caller.status });

  const url = new URL(req.url);
  const taskId = url.searchParams.get("taskId")?.trim() || `skills-refresh-${Date.now().toString(36)}`;
  try {
    const result = await fetchDistributedSkill(caller, taskId.slice(0, 128), name);
    if ("content" in result) {
      return NextResponse.json(result, { headers: { etag: `"${result.contentDigest}"` } });
    }
    if (result.notFound) return NextResponse.json({ error: "skill not distributed to this product", name }, { status: 404 });
    // Relay not configured or Runos refused: 503 so ruyin keeps its cached copy.
    return NextResponse.json({ error: result.status.reason ?? "skill relay unavailable" }, { status: 503 });
  } catch (cause) {
    return NextResponse.json({ error: cause instanceof Error ? cause.message : String(cause) }, { status: 503 });
  }
}
