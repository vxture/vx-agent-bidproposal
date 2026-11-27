"use client";
import React, { useEffect, useRef, useState, type ReactNode } from "react";
import { Button, EmptyState, Icon } from "@vxture/design-system";
import {usePageRefresh,useRefreshGuard} from "./page-refresh";
import { fileFormat } from "../file-formats";
import { ImageViewer } from "./image-viewer";
import { MarkdownViewer } from "./markdown-viewer";
import { PdfViewer } from "./pdf-viewer";
import { OfficeEditor } from "./office-editor";
export interface FileAccess {
  read(id: string, version: number, signal: AbortSignal): Promise<Blob>;
  office?(id: string, version: number, editable: boolean): Promise<{ serverUrl: string; config: Record<string, unknown> }>;
}
export interface DocumentControls {mode?:ReactNode;download?:ReactNode;edit?:ReactNode}
type OfficeValue = Awaited<ReturnType<NonNullable<FileAccess["office"]>>>;
function checkedOfficeMode(value: OfficeValue, editable: boolean) {
  const editor = value.config.editorConfig as { mode?: string } | undefined;
  const document = value.config.document as { permissions?: { edit?: boolean } } | undefined;
  if (editor?.mode !== (editable ? "edit" : "view") || document?.permissions?.edit !== editable)
    throw Error(editable ? "\u672a\u83b7\u5f97\u6587\u6863\u7f16\u8f91\u6743\u9650" : "\u53ea\u8bfb\u6d4f\u89c8\u4f1a\u8bdd\u5c1a\u672a\u5c31\u7eea\uff0c\u8bf7\u7a0d\u540e\u91cd\u8bd5");
  return value;
}
export function OriginalFile({ id, version, name, access, readOnly = false, renderHeader, toolbarTarget, onSaveMarkdown, onSaved }: {
  id: string; version: number; name: string; access: FileAccess; readOnly?: boolean;
  renderHeader(controls: DocumentControls, locked: boolean): ReactNode;
  toolbarTarget?: HTMLElement | null;
  onSaveMarkdown?(text:string):Promise<number>;
  onSaved?(version:number):void;
}) {
  const [url,setUrl]=useState(""),[text,setText]=useState(""),[error,setError]=useState("");
  const [office,setOffice]=useState<OfficeValue>();
  const [officeEditable,setOfficeEditable]=useState(false),[officeLoading,setOfficeLoading]=useState(false),[officeDirty,setOfficeDirty]=useState(false),[officeError,setOfficeError]=useState("");
  const [attempt,setAttempt]=useState(0),[downloadBusy,setDownloadBusy]=useState(false),[downloadError,setDownloadError]=useState("");
  const [readerError,setReaderError]=useState("");
  const [markdownEditing,setMarkdownEditing]=useState(false),[draft,setDraft]=useState(""),[saving,setSaving]=useState(false),[saveError,setSaveError]=useState("");
  usePageRefresh(()=>{if((error||officeError||readerError)&&!officeEditable&&!markdownEditing)setAttempt(value=>value+1);});
  useRefreshGuard(markdownEditing||officeEditable||saving,()=>setSaveError("\u8bf7\u5148\u9000\u51fa\u7f16\u8f91\uff0c\u518d\u5237\u65b0\u3002"));
  const markdownDirty=markdownEditing&&draft!==text,locked=useRef(false);
  locked.current=markdownDirty||saving;
  useEffect(()=>{
    if(!markdownDirty&&!saving)return;
    const beforeUnload=(event:BeforeUnloadEvent)=>{if(!locked.current)return;event.preventDefault();event.returnValue="";};
    const preventNavigation=(event:Event)=>{if(!locked.current)return;event.preventDefault();setSaveError("\u8bf7\u5148\u4fdd\u5b58\u6216\u653e\u5f03\u5f53\u524d\u4fee\u6539\u3002");};
    window.addEventListener("beforeunload",beforeUnload);window.addEventListener("jadera:before-navigate",preventNavigation);
    return()=>{window.removeEventListener("beforeunload",beforeUnload);window.removeEventListener("jadera:before-navigate",preventNavigation);};
  },[markdownDirty,saving]);
  const startMarkdownEditing=()=>{setDraft(text);setSaveError("");setMarkdownEditing(true);};
  useEffect(()=>{if(readOnly&&markdownEditing)setSaveError("\u6587\u4ef6\u5df2\u6709\u65b0\u7248\u672c\uff0c\u8bf7\u4fdd\u7559\u8349\u7a3f\u5e76\u6838\u5bf9\u6700\u65b0\u7248\u672c\u3002");},[readOnly,markdownEditing]);
  const discardMarkdown=()=>{locked.current=false;setMarkdownEditing(false);setDraft(text);setSaveError("");};
  const saveMarkdown=async()=>{
    if(!onSaveMarkdown||readOnly||saving||!markdownDirty)return;
    setSaving(true);setSaveError("");
    try{const next=await onSaveMarkdown(draft);locked.current=false;setText(draft);setMarkdownEditing(false);onSaved?.(next);}
    catch(error){const message=error instanceof Error?error.message:"";setSaveError(/changed|conflict|stale/i.test(message)?"\u6587\u4ef6\u5df2\u53d1\u751f\u53d8\u5316\uff0c\u8349\u7a3f\u5df2\u4fdd\u7559\uff0c\u8bf7\u6838\u5bf9\u6700\u65b0\u7248\u672c\u540e\u91cd\u8bd5\u3002":message||"\u4fdd\u5b58\u5931\u8d25\uff0c\u4fee\u6539\u5df2\u4fdd\u7559\u3002");}finally{setSaving(false);}
  };
  const format=fileFormat(name),isOffice=format?.kind==="office";
  useEffect(()=>{
    if(!isOffice||!access.office)return;
    let active=true;setOffice(undefined);setOfficeEditable(false);setOfficeDirty(false);setOfficeError("");setOfficeLoading(true);
    void access.office(id,version,false).then(value=>checkedOfficeMode(value,false)).then(value=>{if(active)setOffice(value);})
      .catch(error=>{if(active)setOfficeError(error instanceof Error?error.message:"\u539f\u4ef6\u67e5\u9605\u670d\u52a1\u8fde\u63a5\u5931\u8d25");}).finally(()=>{if(active)setOfficeLoading(false);});
    return()=>{active=false;};
  },[id,version,access,isOffice,attempt]);
  const changeOfficeMode=async(editable:boolean)=>{
    if(!access.office||!office||officeLoading||officeDirty||(editable&&readOnly))return;
    setOfficeLoading(true);setOfficeError("");
    try{const value=checkedOfficeMode(await access.office(id,version,editable),editable);setOffice(value);setOfficeEditable(editable);}
    catch(error){setOfficeError(error instanceof Error?error.message:"\u6587\u6863\u4f1a\u8bdd\u5207\u6362\u5931\u8d25");}finally{setOfficeLoading(false);}
  };
  useEffect(()=>{
    const controller=new AbortController();let objectUrl="";
    setUrl("");setText("");setError("");setDownloadError("");setReaderError("");
    void access.read(id,version,controller.signal).then(async blob=>{
      const source=format?.kind==="markdown"?await blob.text():"";if(controller.signal.aborted)return;
      objectUrl=URL.createObjectURL(blob);setUrl(objectUrl);setText(source);
    }).catch(()=>{if(!controller.signal.aborted)setError("\u539f\u4ef6\u8bfb\u53d6\u5931\u8d25");});
    return()=>{controller.abort();if(objectUrl)URL.revokeObjectURL(objectUrl);};
  },[id,version,access,format?.kind,attempt]);
  const download=async()=>{
    setDownloadBusy(true);setDownloadError("");
    try{await downloadResourceFile(access,id,version,name);}catch{setDownloadError("\u4e0b\u8f7d\u5931\u8d25\uff0c\u8bf7\u91cd\u8bd5");}finally{setDownloadBusy(false);}
  };
  const downloadButton=(variant:"ghost"|"outline"="ghost")=><Button variant={variant} disabled={downloadBusy} onClick={()=>void download()} aria-label={"\u4e0b\u8f7d\u539f\u4ef6"} title={"\u4e0b\u8f7d\u539f\u4ef6"}><Icon name="download" size="sm"/>{"\u4e0b\u8f7d"}</Button>;
  const controls:DocumentControls={
    mode:<span className="jadera-document-mode" role="status">{saving?"\u4fdd\u5b58\u4e2d\u2026":markdownEditing?"\u7f16\u8f91\u6a21\u5f0f":officeEditable?(officeDirty?"\u4fdd\u5b58\u4e2d\u2026":"\u7f16\u8f91\u6a21\u5f0f"):"\u6d4f\u89c8\u6a21\u5f0f"}</span>,
    download:<Button className="jadera-document-icon-button" variant="ghost" size="icon-md" disabled={downloadBusy} onClick={()=>void download()} aria-label={"\u4e0b\u8f7d\u539f\u4ef6"} title={"\u4e0b\u8f7d\u539f\u4ef6"}><Icon name="download" size="sm"/></Button>,
    edit:format?.kind==="markdown"&&onSaveMarkdown&&(markdownEditing||!readOnly)?(markdownEditing?<><Button disabled={saving||!markdownDirty||readOnly} onClick={()=>void saveMarkdown()}>{saving?"\u4fdd\u5b58\u4e2d\u2026":"\u4fdd\u5b58"}</Button><Button variant="ghost" disabled={saving} onClick={discardMarkdown}>{"\u653e\u5f03"}</Button></>:<Button disabled={!url} onClick={startMarkdownEditing}>{"\u7f16\u8f91"}</Button>):isOffice&&access.office&&!readOnly?<Button disabled={!office||officeLoading||officeDirty} variant={officeEditable?"outline":"default"} onClick={()=>void changeOfficeMode(!officeEditable)}>{officeEditable?"\u8fd4\u56de\u6d4f\u89c8":"\u7f16\u8f91"}</Button>:undefined,
  };
  const ready=!readerError&&(isOffice?!!office:!!url);
  const failure=!ready&&(readerError||error||officeError||(isOffice&&!access.office?"\u67e5\u9605\u670d\u52a1\u672a\u5c31\u7eea":""));
  return <>
    {renderHeader(controls,officeDirty||officeLoading||markdownDirty||saving)}
    <section className="jadera-document-stage jadera-original-file">
      {!ready?<div className="jadera-document-status" role={failure?"alert":"status"}>
        <EmptyState icon={failure?"warning":"file-text"} title={failure?"\u6682\u65f6\u65e0\u6cd5\u6d4f\u89c8\u6b64\u6587\u4ef6":"\u6b63\u5728\u6253\u5f00\u6587\u4ef6"} description={failure?(downloadError||"\u8bf7\u91cd\u8bd5\uff0c\u6216\u4e0b\u8f7d\u539f\u4ef6\u540e\u67e5\u770b\u3002"):"\u6b63\u5728\u52a0\u8f7d\u5185\u5bb9\u2026"} action={failure?<div className="jadera-document-status-actions"><Button onClick={()=>setAttempt(value=>value+1)}>{"\u91cd\u8bd5"}</Button>{downloadButton("outline")}</div>:undefined}/>
      </div>:<>
        {(saveError||officeError||downloadError)&&<div className="jadera-document-notice" role="alert">{saveError||officeError||downloadError}</div>}
        {office?<OfficeEditor {...office} onDirtyChange={setOfficeDirty} onFailure={setReaderError}/>:format?.kind==="image"?<ImageViewer src={url} name={name} animated={format.extension==="gif"} toolbarTarget={toolbarTarget} onFailure={setReaderError}/>:format?.kind==="markdown"?<MarkdownViewer text={text} toolbarTarget={toolbarTarget} editing={markdownEditing} draft={draft} onChange={setDraft} disabled={saving}/>:format?.kind==="pdf"?<PdfViewer src={url} toolbarTarget={toolbarTarget} onFailure={setReaderError}/>:null}
      </>}
    </section>
  </>;
}
export async function downloadResourceFile(access: FileAccess, id: string, version: number, name: string) {
  const blob=await access.read(id,version,new AbortController().signal),url=URL.createObjectURL(blob),link=document.createElement("a");
  link.href=url;link.download=name;document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
