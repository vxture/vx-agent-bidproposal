import { randomBytes, createHash } from "node:crypto";

// PKCE (S256) + state + nonce generation. PKCE is always enforced even for a
// confidential client (defends against authorization-code injection).

function base64url(buf: Buffer): string {
  return buf.toString("base64url");
}

export function randomToken(bytes = 32): string {
  return base64url(randomBytes(bytes));
}

export function makePkce(): { verifier: string; challenge: string } {
  const verifier = base64url(randomBytes(32));
  const challenge = base64url(createHash("sha256").update(verifier).digest());
  return { verifier, challenge };
}
