"use client";
import { useEffect, useRef, useState } from "react";
import { Button, Dialog, DialogContent, DialogTitle } from "@vxture/design-system";
import { readAccess } from "../access/access-reader";
import { isThrough, type AccessState } from "../access/types";
import { gateLoginUrl } from "../access/entry-content";
import { ACCESS_RECOVERY_EVENT, setWorkspaceBlocked } from "./product-fetch";

export function sameWorkspace(original: AccessState, next: AccessState) {
  if (original.status === "open") return next.status === "open";
  return original.status === "authenticated" && next.status === "authenticated" &&
    original.user.sub === next.user.sub &&
    original.user.activeOrg === next.user.activeOrg &&
    original.user.activeWorkspace === next.user.activeWorkspace;
}
/** Keep the underlying editor mounted until its original principal is restored. */
export function SessionRecovery({ original, frame }: {
  original: AccessState;
  frame: React.RefObject<HTMLIFrameElement | null>;
}) {
  const [open, setOpen] = useState(false), [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const checking = useRef(false);
  const blockFrame = (value: boolean) => frame.current?.contentWindow?.postMessage(
    { ns: "bid.access", blocked: value }, window.location.origin,
  );
  useEffect(() => {
    const recover = () => {
      setWorkspaceBlocked(true);
      blockFrame(true);
      setOpen(true);
    };
    const receive = (event: MessageEvent) => {
      if (event.origin === window.location.origin && event.source === frame.current?.contentWindow && event.data?.ns === "bid.access-recovery") recover();
    };
    window.addEventListener(ACCESS_RECOVERY_EVENT, recover);
    window.addEventListener("message", receive);
    return () => {
      window.removeEventListener(ACCESS_RECOVERY_EVENT, recover);
      window.removeEventListener("message", receive);
      setWorkspaceBlocked(false);
    };
  }, [frame]);
  const check = async () => {
    if (checking.current) return;
    checking.current = true;
    setBusy(true);
    try {
      const next = await readAccess();
      if (!isThrough(next)) {
        setMessage("\u4f1a\u8bdd\u6216\u8bbf\u95ee\u8d44\u683c\u5c1a\u672a\u6062\u590d\uff0c\u8bf7\u767b\u5f55\u540e\u91cd\u65b0\u786e\u8ba4");
      } else if (!sameWorkspace(original, next)) {
        setMessage("\u8d26\u53f7\u6216\u5de5\u4f5c\u533a\u5df2\u6539\u53d8\uff0c\u8bf7\u5207\u56de\u539f\u8d26\u53f7\u4e0e\u5de5\u4f5c\u533a\uff1b\u8349\u7a3f\u4ecd\u4fdd\u7559\u5728\u539f\u9875");
      } else {
        setWorkspaceBlocked(false);
        blockFrame(false);
        setMessage("");
        setOpen(false);
      }
    } catch {
      setMessage("\u6682\u65f6\u65e0\u6cd5\u786e\u8ba4\u72b6\u6001\uff0c\u8bf7\u7a0d\u540e\u91cd\u8bd5\uff1b\u8349\u7a3f\u5df2\u4fdd\u7559");
    } finally { checking.current = false; setBusy(false); }
  };
  return <Dialog open={open} onOpenChange={() => {}}>
    <DialogContent onEscapeKeyDown={event => event.preventDefault()} onPointerDownOutside={event => event.preventDefault()}>
      <DialogTitle>{"\u786e\u8ba4\u4f1a\u8bdd\u4e0e\u5de5\u4f5c\u533a"}</DialogTitle>
      <p>{"\u5f53\u524d\u8bf7\u6c42\u672a\u901a\u8fc7\u8bbf\u95ee\u6821\u9a8c\u3002\u539f\u9875\u5185\u5bb9\u4e0e\u8349\u7a3f\u4fdd\u7559\uff0c\u767b\u5f55\u540e\u786e\u8ba4\u539f\u8d26\u53f7\u548c\u5de5\u4f5c\u533a\u518d\u7ee7\u7eed\u3002\u672a\u5b8c\u6210\u7684\u4fdd\u5b58\u9700\u8981\u91cd\u65b0\u64cd\u4f5c"}</p>
      {message && <p role="status">{message}</p>}
      <Button asChild><a href={gateLoginUrl("/")} target="_blank" rel="noopener noreferrer">{"\u5728\u65b0\u6807\u7b7e\u767b\u5f55"}</a></Button>
      <Button variant="outline" disabled={busy} onClick={() => void check()}>{busy ? "\u6b63\u5728\u786e\u8ba4\u2026" : "\u91cd\u65b0\u786e\u8ba4"}</Button>
    </DialogContent>
  </Dialog>;
}
