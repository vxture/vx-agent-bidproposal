import React from "react";
import { AgentAvatar } from "@vxture/design-system";

/** One identity asset for every Xiaoyu entry point. */
export function XiaoyuAvatar({ size = 24, running = false }: { size?: 24 | 32; running?: boolean }) {
  return <AgentAvatar size={size === 32 ? "xl" : "lg"} running={running} />;
}
