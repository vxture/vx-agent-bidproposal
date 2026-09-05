import { NextResponse } from "next/server";
import { flushUsage } from "../../../usage/lib/flush";

// POST /api/usage/flush: trigger the usage flush job. Gated by INTERNAL_JOB_TOKEN
// (an internal job/cron caller), never a user session. Fail-closed: if the token
// is unset or mismatched, refuse.
export const dynamic = "force-dynamic";

export async function POST(req: Request): Promise<Response> {
  const expected = process.env.INTERNAL_JOB_TOKEN;
  const got = req.headers.get("x-internal-job-token");
  if (!expected || got !== expected) {
    return new NextResponse("forbidden", { status: 403 });
  }
  const summary = await flushUsage();
  return NextResponse.json(summary);
}
