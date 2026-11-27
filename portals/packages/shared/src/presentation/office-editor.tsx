"use client";
import React, { useEffect, useRef, useState } from "react";

interface OfficeInstance { destroyEditor(): void }
interface OfficeApi { DocEditor: new (id: string, config: Record<string, unknown>) => OfficeInstance }
const scripts = new Map<string, Promise<OfficeApi>>();
function loadOffice(baseUrl: string): Promise<OfficeApi> {
  const base = new URL(baseUrl);
  if (base.protocol !== "https:" && !(base.protocol === "http:" && ["localhost", "127.0.0.1"].includes(base.hostname)))
    return Promise.reject(Error("Document server must use HTTPS"));
  const src = new URL("web-apps/apps/api/documents/api.js", base.href.replace(/\/?$/, "/")).href;
  const existing = scripts.get(src);
  if (existing) return existing;
  const pending = new Promise<OfficeApi>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = src;
    script.onload = () => {
      const api = (window as unknown as { DocsAPI?: OfficeApi }).DocsAPI;
      if (api) resolve(api); else { scripts.delete(src); reject(Error("Document editor API unavailable")); }
    };
    script.onerror = () => { scripts.delete(src); script.remove(); reject(Error("Document server unavailable")); };
    document.head.append(script);
  });
  scripts.set(src, pending);
  return pending;
}

/** Host supplies a server-signed config, scoped download URL and callback URL. */
export function OfficeEditor({ serverUrl, config, onDirtyChange, onFailure }: { serverUrl: string; config: Record<string, unknown>; onDirtyChange?(dirty:boolean):void; onFailure?(message:string):void }) {
  const host = useRef<HTMLDivElement>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    let disposed = false;
    let editor: OfficeInstance | undefined;
    const id = "office-" + crypto.randomUUID();
    const mount = document.createElement("div");
    mount.id = id;
    host.current!.replaceChildren(mount);
    setError("");
    void loadOffice(serverUrl).then((api) => {
      if (!disposed) editor = new api.DocEditor(id, { ...config, width: "100%", height: "100%", events: { ...(config.events as Record<string,unknown> || {}), onDocumentStateChange: (event:{data:boolean}) => onDirtyChange?.(event.data), onError: () => {if(!disposed)onFailure?.("Document renderer failed");} } });
    }).catch(() => { if (!disposed) {if(onFailure)onFailure("Document renderer unavailable");else setError("\u6587\u6863\u7f16\u8f91\u5668\u52a0\u8f7d\u5931\u8d25\uff0c\u8bf7\u7a0d\u540e\u91cd\u8bd5");} });
    return () => { disposed = true; editor?.destroyEditor(); mount.remove(); };
  }, [serverUrl, config, onDirtyChange, onFailure]);
  return <div className="jadera-office-editor">{error && <p role="alert">{error}</p>}<div ref={host} className="jadera-office-surface" /></div>;
}
