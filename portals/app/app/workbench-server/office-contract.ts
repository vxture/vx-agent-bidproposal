import { createHash } from "node:crypto";
import { SignJWT, jwtVerify } from "jose";

export interface OfficeSession {
  id: string;
  version: number;
  hash: string;
  name: string;
  downloadUrl: string;
  callbackUrl: string;
  user: { id: string; name: string };
  editable: boolean;
}

/** Distinct key per immutable version prevents accidental cache reuse. */
export async function officeConfig(input: OfficeSession, secret: string) {
  if (secret.length < 32) throw Error("Document service JWT secret is not configured");
  const extension = input.name.split(".").at(-1)?.toLowerCase();
  if (!["docx", "xlsx", "pptx"].includes(extension || "")) throw Error("Unsupported Office format");
  const config = {
    documentType: extension === "xlsx" ? "cell" : extension === "pptx" ? "slide" : "word",
    document: {
      fileType: extension, title: input.name, url: input.downloadUrl,
      key: createHash("sha256").update(JSON.stringify([input.id, input.version, input.hash])).digest("hex"),
      permissions: { edit: input.editable, download: true, print: true },
    },
    editorConfig: {
      mode: input.editable ? "edit" : "view", lang: "zh-CN",
      callbackUrl: input.callbackUrl, user: input.user,
      customization: { autosave: true, forcesave: false },
    },
  };
  const token = await new SignJWT(config).setProtectedHeader({ alg: "HS256", typ: "JWT" }).sign(new TextEncoder().encode(secret));
  return { ...config, token };
}

/** Callback-supplied URLs must belong to the exact configured document server. */
export async function verifiedOfficeCallback(token: string, secret: string, serverUrl: string) {
  const { payload } = await jwtVerify(token, new TextEncoder().encode(secret), { algorithms: ["HS256"] });
  const body = (payload.payload ?? payload) as Record<string, unknown>;
  if (![1, 2, 3, 4, 6, 7].includes(Number(body.status))) throw Error("Invalid document callback status");
  if ([2, 6].includes(Number(body.status))) {
    if (typeof body.url !== "string") throw Error("Missing saved document URL");
    const url = new URL(body.url), allowed = new URL(serverUrl);
    if (url.origin !== allowed.origin || url.username || url.password)
      throw Error("Saved document origin is not allowed");
  }
  return body;
}
