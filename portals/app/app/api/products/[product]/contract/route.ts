import { NextResponse } from "next/server";
import { isOurProduct, loadContract } from "../../../../capability/contract";

// GET /api/products/:product/contract - the runtime contract, as YAML.
//
// Unauthenticated on purpose: the contract is public by design (vxture-ruyin
// CLAUDE.md, "all client-side configuration is public"), and ruyin fetches it
// before it has a task to attach a user to. Anything secret does not belong in
// a contract in the first place (R6 forbids provider binding; credentials live
// in Runos's vault).

export const dynamic = "force-dynamic";

export async function GET(req: Request, ctx: { params: Promise<{ product: string }> }): Promise<Response> {
  const { product } = await ctx.params;
  if (!isOurProduct(product)) {
    return NextResponse.json({ error: "unknown product", product }, { status: 404 });
  }
  const { text, etag } = loadContract();
  if (req.headers.get("if-none-match") === etag) {
    return new Response(null, { status: 304, headers: { etag } });
  }
  return new Response(text, {
    status: 200,
    headers: {
      "content-type": "application/yaml; charset=utf-8",
      etag,
      // Short: ruyin keeps its own copy and re-checks; a long max-age here would
      // delay a contract fix on every installed machine.
      "cache-control": "public, max-age=60",
    },
  });
}
