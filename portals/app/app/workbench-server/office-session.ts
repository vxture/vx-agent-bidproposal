import { createHash } from "node:crypto";
import { EncryptJWT, jwtDecrypt } from "jose";
import type { Principal } from "./identity";

export interface OfficeTicket {
  principal: Principal;
  resourceId: string;
  version: number;
  hash: string;
  key: string;
  editable: boolean;
}
function key(secret: string) {
  if (secret.length < 32) throw Error("Office integration is not configured");
  return createHash("sha256").update("jadera-office-ticket:" + secret).digest();
}
/** Encryption prevents the browser/document server reading the pinned RP session. */
export async function sealOfficeTicket(value: OfficeTicket, secret: string) {
  return new EncryptJWT({ ...value }).setProtectedHeader({ alg: "dir", enc: "A256GCM" })
    .setIssuer("jadera-office").setAudience("office-bridge").setIssuedAt().setExpirationTime("8h").encrypt(key(secret));
}
export async function openOfficeTicket(token: string, secret: string): Promise<OfficeTicket> {
  const { payload } = await jwtDecrypt(token, key(secret), { issuer: "jadera-office", audience: "office-bridge", keyManagementAlgorithms: ["dir"], contentEncryptionAlgorithms: ["A256GCM"] });
  if (!payload.principal || typeof payload.resourceId !== "string" || !Number.isSafeInteger(payload.version) || typeof payload.hash !== "string" || typeof payload.key !== "string" || typeof payload.editable !== "boolean") throw Error("Invalid office ticket");
  return payload as unknown as OfficeTicket;
}
