import { createHmac, timingSafeEqual } from "node:crypto";

// Provisioning webhook signature verification (product_200 section 4, 080-rp
// section 4). Stripe-style, over the RAW request bytes (never re-serialize):
//   header  X-Vxture-Signature: t=<unix_ts>,v1=<hex>[,v1=<hex>]
//   payload "{t}.{raw_body}"
//   v1 = hex(HMAC_SHA256(secret, payload))
// Constant-time compare; timestamp within +/-300s (replay). Rotation: the
// platform may sign with the current OR next secret; try each provided secret
// against each provided v1, any match accepts.

const TOLERANCE_SECONDS = 300;

export interface ParsedSignature {
  t: number;
  v1: string[];
}

export function parseSignatureHeader(header: string | null): ParsedSignature | null {
  if (!header) return null;
  let t: number | null = null;
  const v1: string[] = [];
  for (const part of header.split(",")) {
    const eq = part.indexOf("=");
    if (eq === -1) continue;
    const key = part.slice(0, eq).trim();
    const val = part.slice(eq + 1).trim();
    if (key === "t") t = Number(val);
    else if (key === "v1") v1.push(val);
  }
  if (t === null || !Number.isFinite(t) || v1.length === 0) return null;
  return { t, v1 };
}

function hexEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  try {
    return timingSafeEqual(Buffer.from(a, "hex"), Buffer.from(b, "hex"));
  } catch {
    return false;
  }
}

/**
 * Verify a raw-body webhook signature against one or more secrets (rotation).
 * `nowSeconds` is injectable for tests.
 */
export function verifySignature(
  rawBody: string,
  header: string | null,
  secrets: string[],
  nowSeconds: number = Math.floor(Date.now() / 1000),
): boolean {
  const parsed = parseSignatureHeader(header);
  if (!parsed) return false;
  if (Math.abs(nowSeconds - parsed.t) > TOLERANCE_SECONDS) return false;

  const payload = `${parsed.t}.${rawBody}`;
  for (const secret of secrets) {
    if (!secret) continue;
    const expected = createHmac("sha256", secret).update(payload).digest("hex");
    if (parsed.v1.some((v) => hexEqual(v, expected))) return true;
  }
  return false;
}

/** Secrets for verification: current PROVISION_WEBHOOK_SECRET + optional _NEXT (rotation). */
export function webhookSecrets(): string[] {
  return [process.env.PROVISION_WEBHOOK_SECRET, process.env.PROVISION_WEBHOOK_SECRET_NEXT].filter(
    (s): s is string => Boolean(s),
  );
}
