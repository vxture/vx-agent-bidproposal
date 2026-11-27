"use client";
import React, { useEffect, useState } from "react";
import { Button, EmptyState, NativeSelect, Icon } from "@vxture/design-system";
import { resourceTitle, type ResourceData } from "../resources";
import { OriginalFile, type FileAccess, type DocumentControls } from "./original-file";
/** A full-width document route. Focus mode changes chrome, not the reader tree. */
export function ResourceDocumentPage({ item, version, access, onClose, onVersion, onSaveFile }: {
    item: ResourceData;
    version: number;
    access?: FileAccess;
    onClose(): void;
    onVersion(version: number): void;
    onSaveFile?(file:File,baseVersion:number):Promise<number>;
}) {
    const [focused, setFocused] = useState(false);
    const [toolbarTarget,setToolbarTarget]=useState<HTMLDivElement|null>(null);
    const current = item.versions.find(entry => entry.version === version);
    useEffect(() => {
        const keydown = (event: KeyboardEvent) => {
            if (event.key === "Escape")
                setFocused(false);
        };
        window.addEventListener("keydown", keydown);
        return () => window.removeEventListener("keydown", keydown);
    }, []);
    const heading=(controls:DocumentControls={},locked=false)=><header className="jadera-document-heading">
      <Button variant="ghost" disabled={locked} onClick={onClose} className="jadera-document-back" title={"\u8fd4\u56de\u8d44\u6599\u8be6\u60c5"}><Icon name="arrow-left" size="sm"/>{"\u8fd4\u56de"}</Button>
      <div className="jadera-document-identity"><h1 title={current?.name}>{resourceTitle(item)}</h1>{controls.mode}</div>
      <div className="jadera-document-viewer-tools" ref={setToolbarTarget}/>
      <div className="jadera-document-actions">
        <div className="jadera-document-icon-actions">{controls.download}
        <Button variant="ghost" size="icon-md" className="jadera-document-focus jadera-document-icon-button" aria-label={focused ? "\u9000\u51fa\u4e13\u6ce8\u6a21\u5f0f" : "\u4e13\u6ce8\u6a21\u5f0f"} title={focused ? "\u9000\u51fa\u4e13\u6ce8\u6a21\u5f0f\uff08Esc\uff09" : "\u4e13\u6ce8\u6a21\u5f0f\uff1a\u4f7f\u7528\u5168\u90e8\u7a7a\u95f4"} aria-pressed={focused} onClick={() => setFocused(value => !value)}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><path d={focused ? "M9 3v6H3m12-6v6h6M9 21v-6H3m12 6v-6h6" : "M9 3H3v6m12-6h6v6M3 15v6h6m12-6v6h-6"}/></svg>
        </Button>
        </div>{controls.edit}
        <NativeSelect disabled={locked} aria-label={"\u6587\u4EF6\u7248\u672C"} value={version} onChange={event => onVersion(Number(event.target.value))}>
          {[...item.versions].reverse().map((entry, index) => <option key={entry.version} value={entry.version}>v{entry.version}{index === 0 ? " \u00b7 \u6700\u65b0\u7248\u672c" : " \u00b7 \u5386\u53f2\u7248\u672c\uff08\u53ea\u8bfb\uff09"}</option>)}
        </NativeSelect>
      </div>
    </header>;
    return <main className="jadera-document-page" data-focused={focused} aria-label={"\u6587\u6863\uff1a" + resourceTitle(item)}>
      {current && access ? <OriginalFile key={current.version} id={item.id} version={current.version} name={current.name} access={access} readOnly={current.version !== item.versions.at(-1)?.version} renderHeader={heading} toolbarTarget={toolbarTarget} onSaveMarkdown={onSaveFile?text=>onSaveFile(new File([text],current.name,{type:"text/markdown;charset=utf-8"}),current.version):undefined} onSaved={onVersion}/> : <>{heading()}<div className="jadera-document-stage"><div className="jadera-document-status"><EmptyState icon="file-text" title={current ? "\u6587\u4ef6\u8fde\u63a5\u672a\u5c31\u7eea" : "\u672a\u627e\u5230\u6b64\u7248\u672c"} description={"\u8FD4\u56DE\u8D44\u6599\u8BE6\u60C5\uFF0C\u786E\u8BA4\u6587\u4EF6\u7248\u672C\u540E\u91CD\u65B0\u6253\u5F00\u3002"} action={<Button onClick={onClose} title={"\u8fd4\u56de\u8d44\u6599\u8be6\u60c5"}><Icon name="arrow-left" size="sm"/>{"\u8fd4\u56de"}</Button>}/></div></div></>}
  </main>;
}
