/**
 * @package @bidproposal/app
 * @layer Application
 * @category RuntimeHost
 * @author AI-Generated
 * @date 2026-11-25
 */
import { isAbsolute, join } from "node:path";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { localSourceReader } from "@vxture/ruyin-node-runtime";
import { BidRuntime } from "./service";
import {
  namespaceFor,
  authorizePinnedAccess,
  WorkbenchError,
  type Principal,
} from "./identity";
import { makePlatformGauge } from "../usage/lib/gauge";
import { runtimeContract } from "./contract";
import { limitReaders } from "./reader-limit";
import { serverLayout } from "./layout-engine";

// --- Single-process product runtime --------------------------------------
const globalState = globalThis as typeof globalThis & {
  bidRuntimeHosts?: Map<string, { service: BidRuntime; usedAt: number }>;
};
const hosts = (globalState.bidRuntimeHosts ??= new Map());
const reader = limitReaders(
  localSourceReader(
    process.env.BID_READER_PYTHON ?? "/usr/bin/python3",
    join(process.cwd(), "document-engine/reader.py"),
  ),
);
export function runtimeFor(principal: Principal): BidRuntime {
  const root = process.env.BID_RUNTIME_DATA_DIR,
    key = process.env.BID_RUNTIME_MASTER_KEY;
  const platformBase = process.env.PLATFORM_API_URL;
  if (!root || !isAbsolute(root) || !key || !platformBase)
    throw new WorkbenchError(
      503,
      "RUNTIME_NOT_CONFIGURED",
      "The Bid project runtime is not configured",
    );
  const namespace = namespaceFor(principal),
    existing = hosts.get(namespace);
  if (existing) {
    existing.usedAt = Date.now();
    return existing.service;
  }
  for (const [id, host] of hosts) {
    if (
      Date.now() - host.usedAt > 15 * 60_000 &&
      !host.service.tasks.activeCount &&
      !host.service.jobs.activeCount &&
      !host.service.readings.activeCount &&
      !host.service.renders.activeCount &&
      !host.service.assistant.activeCount
    ) {
      host.service.close();
      hosts.delete(id);
    }
  }
  if (hosts.size >= 64)
    throw new WorkbenchError(
      503,
      "RUNTIME_BUSY",
      "The runtime is busy; try again shortly",
    );
  const manifest = JSON.parse(
    readFileSync(join(process.cwd(), "package.json"), "utf8"),
  ) as {
    dependencies: Record<string, string>;
  };
  const rendererVersion = manifest.dependencies["@vxture/ruyin-document"];
  if (!rendererVersion || !/^\d+\.\d+\.\d+$/.test(rendererVersion))
    throw Error("The document renderer must have an exact version");
  const service = new BidRuntime({
    root,
    masterHex: key,
    principal,
    contract: runtimeContract(),
    reader,
    layout: serverLayout,
    layoutCacheVersion: createHash("sha256")
      .update(readFileSync(join(process.cwd(), "document-engine/layout.py")))
      .update(rendererVersion)
      .digest("hex"),
    storageAccess: async (pinned) =>
      (await authorizePinnedAccess(pinned)).entitlement,
    reportStorage: makePlatformGauge(platformBase),
  });
  hosts.set(namespace, { service, usedAt: Date.now() });
  return service;
}
