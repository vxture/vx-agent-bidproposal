"use client";
import React, { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Button, Icon, Textarea, SegmentedControl } from "@vxture/design-system";

/** Raw HTML is not enabled; links open safely and remote images are not fetched. */
export function MarkdownViewer({ text, toolbarTarget, editing=false, draft=text, onChange, disabled=false }: { text: string; toolbarTarget?: HTMLElement | null; editing?:boolean;draft?:string;onChange?(value:string):void;disabled?:boolean }) {
  const [mode, setMode] = useState<"preview" | "source" | "split">("preview");
  const [layout,setLayout]=useState<"page"|"print">("page");
  const [layoutOpen,setLayoutOpen]=useState(false);
  const layoutControl=useRef<HTMLDivElement>(null),layoutTrigger=useRef<HTMLButtonElement>(null),layoutOptionsId=useId();
  useEffect(()=>{setMode(editing?"split":"preview");setLayoutOpen(false);},[editing]);
  useEffect(()=>{
    if(!layoutOpen)return;
    const outside=(event:PointerEvent)=>{if(event.target instanceof Node&&!layoutControl.current?.contains(event.target))setLayoutOpen(false);};
    document.addEventListener("pointerdown",outside);
    return()=>document.removeEventListener("pointerdown",outside);
  },[layoutOpen]);
  const content=editing?draft:text;
  const tools=<div className="jadera-file-tools" role="toolbar" aria-label={"Markdown \u663e\u793a\u65b9\u5f0f"}>
      {([ ["preview", "\u9605\u8bfb", "\u67e5\u770b\u6392\u7248\u540e\u7684\u6587\u6863"], ["source", "\u6e90\u7801", "\u67e5\u770b Markdown \u539f\u6587"], ["split", "\u5bf9\u7167", "\u6e90\u7801\u4e0e\u9605\u8bfb\u5185\u5bb9\u5e76\u6392\u663e\u793a"] ] as const).map(([value, label,description]) => <Button key={value} variant={mode === value ? "secondary" : "ghost"} onClick={() => {setMode(value);setLayoutOpen(false);}} aria-pressed={mode === value} title={description}>{label}</Button>)}
    </div>;
  return <section className="jadera-markdown-viewer">
    {toolbarTarget?createPortal(tools,toolbarTarget):tools}
    {mode !== "source" && <div ref={layoutControl} className="jadera-markdown-layout-switch" data-open={layoutOpen}
      onPointerEnter={event=>{if(event.pointerType!=="touch")setLayoutOpen(true);}}
      onPointerLeave={event=>{if(event.pointerType!=="touch")setLayoutOpen(false);}}
      onFocus={()=>setLayoutOpen(true)} onBlur={event=>{if(!event.currentTarget.contains(event.relatedTarget))setLayoutOpen(false);}}
      onKeyDown={event=>{if(event.key==="Escape"){event.preventDefault();event.stopPropagation();layoutTrigger.current?.focus();setLayoutOpen(false);}}}>
      <Button ref={layoutTrigger} variant="ghost" size="icon-md" className="jadera-markdown-layout-trigger" aria-expanded={layoutOpen} aria-controls={layoutOptionsId}
        aria-label={"\u9605\u8bfb\u7248\u5f0f\uff1a"+(layout==="page"?"\u9875\u9762\u6a21\u5f0f":"\u6253\u5370\u6a21\u5f0f")}
        title={"\u5207\u6362\u9605\u8bfb\u7248\u5f0f"} onClick={()=>setLayoutOpen(true)}><Icon name="book-open" size="sm"/></Button>
      <div id={layoutOptionsId} className="jadera-markdown-layout-options" hidden={!layoutOpen}><SegmentedControl value={layout} onChange={setLayout} size="md" ariaLabel={"\u9605\u8bfb\u7248\u5f0f"} items={[{value:"page",label:<span title={"\u9875\u9762\u6a21\u5f0f\uff1a1536px \u6846\u67b6\u30011440px \u5185\u5bb9"}>{"\u9875\u9762"}</span>},{value:"print",label:<span title={"\u6253\u5370\u6a21\u5f0f\uff1aA4 \u7eb8\u5f20\u4e0e\u9875\u8fb9\u8ddd"}>{"\u6253\u5370"}</span>}]}/></div>
    </div>}
    <div className="jadera-markdown-panes" data-split={mode === "split"}>
      {mode !== "source" && <div className="jadera-markdown-reader" data-layout={layout}><article className="jadera-markdown-content" data-page-scroll><div className="jadera-markdown-prose"><ReactMarkdown remarkPlugins={[remarkGfm]} components={{ a: ({ children, href }) => <a href={href} target="_blank" rel="noopener noreferrer">{children}</a>, img: ({ alt }) => <span>{alt || "[image]"}</span>,table:({children})=><div className="jadera-markdown-table"><table>{children}</table></div> }}>{content}</ReactMarkdown></div></article></div>}
      {mode !== "preview" && (editing?<Textarea className="jadera-markdown-source jadera-markdown-editor" data-page-scroll aria-label={"Markdown \u7f16\u8f91"} value={draft} onChange={event=>onChange?.(event.target.value)} disabled={disabled} spellCheck={false} autoFocus/>:<pre className="jadera-markdown-source" data-page-scroll aria-label={"Markdown \u6e90\u7801"}>{text}</pre>)}
    </div>
  </section>;
}
