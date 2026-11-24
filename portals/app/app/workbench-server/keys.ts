/**
 * @package @bidproposal/app
 * @layer Infrastructure
 * @category RuntimeStorage
 * @author AI-Generated
 * @date 2026-11-25
 */
import { createHmac } from "node:crypto";
import { relative, resolve, sep } from "node:path";
import type { StorageKeyProvider } from "@vxture/ruyin-node-runtime";

/** Product-owned server key; absence or malformed configuration always fails closed. */
export function serverKeys(
  root: string,
  namespace: string,
  masterHex: string,
): StorageKeyProvider {
  if (!/^[a-f0-9]{64}$/i.test(masterHex) || !/^[a-f0-9]{64}$/.test(namespace))
    throw Error("A protected Bid runtime master key is required");
  const master = Buffer.from(masterHex, "hex");
  return {
    workspaceKeyHex(directory) {
      const local = relative(resolve(root), resolve(directory));
      if (
        !local ||
        local === ".." ||
        local.startsWith(".." + sep) ||
        resolve(root, local) !== resolve(directory)
      )
        throw Error("Storage key scope is invalid");
      return createHmac("sha256", master)
        .update(
          JSON.stringify([
            "bid-runtime-v1",
            namespace,
            local.split(sep).join("/"),
          ]),
        )
        .digest("hex");
    },
  };
}
