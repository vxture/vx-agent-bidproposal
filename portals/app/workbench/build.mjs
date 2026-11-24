/**
 * @package @bidproposal/app
 * @layer Infrastructure
 * @category Build
 * @author AI-Generated
 * @date 2026-11-25
 */
import { mkdirSync, readFileSync, writeFileSync, copyFileSync } from "node:fs";
import { createRequire } from "node:module";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { collectAssets } from "@bidproposal/workbench/assets";
const root = fileURLToPath(new URL("../public/workbench/", import.meta.url));
const environment = readFileSync(
  new URL("./environment.mjs", import.meta.url),
  "utf8",
)
  .replace(/(["'])@bidproposal\/workbench\/runtime\1/, '"./runtime.mjs"')
  .replace(
    "  publish,",
    "  publish = items => window.parent.postMessage({ns: 'bid.workflow', items}, location.origin),",
  );
mkdirSync(root, { recursive: true });
for (const asset of collectAssets(environment))
  writeFileSync(join(root, asset.name), asset.data);

const require = createRequire(import.meta.url);
for (const [specifier, file] of [
  ["document-reader.py", "reader.py"],
  ["requirements.lock", "reader-requirements.lock"],
])
  copyFileSync(
    require.resolve("@vxture/ruyin-node-runtime/" + specifier),
    new URL("../document-engine/" + file, import.meta.url),
  );
