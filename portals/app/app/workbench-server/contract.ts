/**
 * @package @bidproposal/app
 * @layer Application
 * @category RuntimeContract
 * @author AI-Generated
 * @date 2026-11-25
 */
import { parse } from "yaml";
import { businessContract } from "@bidproposal/workbench/contract";
import { loadContract } from "../capability/contract";
import type { RuyinContract } from "@vxture/ruyin-contract-schema";

/** Same task assembly as the desktop package, without installer transport metadata. */
export function runtimeContract(): RuyinContract {
  return parse(
    businessContract(loadContract().text)
      .replace('contract: "0.1"', 'contract: "0.2"')
      .replace("  version: 1.0.0", "  version: 1.17.2")
      .replace("    minimum: 0.1.0", "    minimum: 0.2.0"),
  ) as RuyinContract;
}
