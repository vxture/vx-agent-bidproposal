import { NextResponse } from "next/server";
import { flushUsage } from "../../../usage/lib/flush";
import { isDeployedStage } from "../../../lib/deploy-stage";
import { prismaEnabled } from "../../../lib/db";
import { timingSafeEqual } from "node:crypto";

// POST /api/usage/flush: trigger the usage flush job. Gated by INTERNAL_JOB_TOKEN
// (an internal job/cron caller), never a user session. Fail-closed: if the token
// is unset or mismatched, refuse.
export const dynamic = "force-dynamic";

export async function POST(req: Request): Promise<Response> {
  const expected = process.env.INTERNAL_JOB_TOKEN;
  const got = req.headers.get("x-internal-job-token");
  if (!expected || !got || Buffer.byteLength(got) !== Buffer.byteLength(expected) ||
      !timingSafeEqual(Buffer.from(got), Buffer.from(expected))) {
    return new NextResponse("forbidden", { status: 403 });
  }
  if (isDeployedStage() && !prismaEnabled()) return new NextResponse("usage store unavailable", { status: 503 });
  try {
    const summary = await flushUsage();
    return NextResponse.json(summary, { status: summary.skipped ? 503 : 200, headers: { "cache-control": "private, no-store" } });
  } catch {
    return new NextResponse("usage flush unavailable", { status: 503 });
  }
}
