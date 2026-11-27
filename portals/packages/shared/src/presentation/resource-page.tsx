"use client";
import React, { useState, useEffect, useRef } from "react";
import { Button, ViewHeader, Icon, ContentWidthContainer, EmptyState, Input, Textarea, NativeSelect, Label, Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, Combobox } from "@vxture/design-system";
import { RESOURCE_CATEGORIES, DEFAULT_RESOURCE_TYPES, resourceCategoryLabel, type ResourceType, type ResourcePerson, isTemplate, resourceTitle, type ResourceData, type ResourceMetadataInput } from "../resources";
import {ResourceImportDialog} from "./resource-import-dialog";
import { FILE_ACCEPT } from "../file-formats";
import { downloadResourceFile, type FileAccess } from "./original-file";
import { ResourcePreview } from "./resource-preview";
import { ResourcePersonLabel } from "./resource-person";
import { ResourceVisualCard } from "./resource-card";
import { ResourceVersionCard } from "./resource-version-card";
import { ResourceActionsMenu } from "./resource-actions";
import { ResourceReferences } from "./resource-references";
import type { ResourceReference, ResourceDetailAction } from "../resources";
import {useRefreshGuard} from "./page-refresh";
import { ResourceDocumentPage } from "./resource-document-page";
export function ResourcePage({ item, initialAction = "info", fileAccess, onBack, onUpdate, onUpload, parsedText, organizationName, workspaceName, tenantLabel, documentVersion, onOpenFile, onCloseFile, loadReferences, onOpenProject, types = DEFAULT_RESOURCE_TYPES, loadMembers }: {
    item: ResourceData;
    types?:ResourceType[];
    loadMembers?(signal:AbortSignal):Promise<ResourcePerson[]>;
    initialAction?: ResourceDetailAction;
    documentVersion?: number;
    onOpenFile?(version: number): void;
    onCloseFile?(): void;
    loadReferences(id: string, signal: AbortSignal): Promise<ResourceReference[]>;
    onOpenProject?(id: string): void;
    fileAccess?: FileAccess;
    onBack(): void;
    onUpdate(input: ResourceMetadataInput): Promise<void>;
    onUpload(file: File): Promise<number>;
    parsedText?: string;
    organizationName?: string;
    tenantLabel?: string;
    workspaceName?: string;
}) {
    const [localDocumentVersion, setLocalDocumentVersion] = useState<number>();
    const openVersion = documentVersion ?? localDocumentVersion;
    const detailScroll = useRef<HTMLElement>(null), scrollPosition = useRef(0);
    const versionsSection = useRef<HTMLElement>(null);
    const referencesSection = useRef<HTMLDivElement>(null);
    const appliedAction = useRef("");
    const openFile = (version = item.versions.at(-1)?.version) => {
        if (version === undefined)
            return;
        scrollPosition.current = detailScroll.current?.scrollTop || 0;
        if (onOpenFile)
            onOpenFile(version);
        else
            setLocalDocumentVersion(version);
    };
    const closeFile = () => {
        setLocalDocumentVersion(undefined);
        onCloseFile?.();
    };
    useEffect(() => {
        if (openVersion === undefined && detailScroll.current)
            detailScroll.current.scrollTop = scrollPosition.current;
    }, [openVersion]);
    const [name, setName] = useState(item.name), [category, setCategory] = useState(item.category);
    const [file, setFile] = useState<File>(), [busy, setBusy] = useState(false), [error, setError] = useState("");
    const [uploadOpen, setUploadOpen] = useState(false), [uploadState, setUploadState] = useState(""), [notice, setNotice] = useState("");
    const [creatorId,setCreatorId]=useState(""),[members,setMembers]=useState<ResourcePerson[]>([]),[membersState,setMembersState]=useState("idle"),[memberRetry,setMemberRetry]=useState(0);
    const [editing, setEditing] = useState(false);
    const [resourceNumber, setResourceNumber] = useState(item.resourceNumber || ""), [shortName, setShortName] = useState(item.shortName || "");
    const [description, setDescription] = useState(item.description || ""), [tags, setTags] = useState((item.tags || []).join(", "));
    const resetMetadata = () => { setCreatorId(""); setResourceNumber(item.resourceNumber || ""); setShortName(item.shortName || ""); setName(item.name); setCategory(item.category); setDescription(item.description || ""); setTags((item.tags || []).join(", ")); };
    const formatDate = (value?: string) => value ? new Date(value).toLocaleString("zh-CN") : "\u672a\u8bb0\u5f55";
    const startEditing = () => { resetMetadata(); setError(""); setNotice(""); setEditing(true); };
    const abandonEditing = () => { resetMetadata(); setError(""); setEditing(false); };
    useEffect(() => {
        const key = item.id + "/" + initialAction;
        if (openVersion !== undefined || appliedAction.current === key) return;
        appliedAction.current = key;
        if (initialAction === "edit") startEditing();
        if (initialAction === "upload") { setFile(undefined); setUploadOpen(true); }
        const section = initialAction === "versions" ? versionsSection.current : initialAction === "references" ? referencesSection.current : null;
        section?.scrollIntoView({ block: "start" });
    }, [item.id, initialAction, openVersion]);
    useEffect(()=>{if(!editing||item.createdBy?.id||!loadMembers)return;const controller=new AbortController();setMembersState("loading");void loadMembers(controller.signal).then(people=>{if(!controller.signal.aborted){setMembers(people.filter(person=>person.name?.trim()));setMembersState("ready");}}).catch(()=>{if(!controller.signal.aborted)setMembersState("failed");});return()=>controller.abort();},[editing,item.id,item.createdBy?.id,loadMembers,memberRetry]);
    const current = item.versions.at(-1);
    const history = item.versions.slice(0, -1).reverse();
    const dirty = editing && (!!creatorId || resourceNumber !== (item.resourceNumber || "") || shortName !== (item.shortName || "") || name !== item.name || category !== item.category || description !== (item.description || "") || tags !== (item.tags || []).join(", "));
    useRefreshGuard(dirty||busy,()=>setError("\u8bf7\u5148\u4fdd\u5b58\u6216\u653e\u5f03\u5f53\u524d\u4fee\u6539\uff0c\u518d\u5237\u65b0\u3002"));
    const back = () => {
        if (!busy && (!dirty || window.confirm("\u6709\u672a\u4fdd\u5b58\u7684\u4fee\u6539\uff0c\u786e\u5b9a\u8fd4\u56de\uff1f")))
            onBack();
    };
    const execute = async (operation: () => Promise<void>) => {
        setBusy(true);
        setError("");
        try {
            await operation();
        }
        catch (e) {
            setError(e instanceof Error ? e.message : "\u64cd\u4f5c\u5931\u8d25");
        }
        finally {
            setBusy(false);
        }
    };
    useEffect(() => {
        if (!dirty)
            return;
        const beforeUnload = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ""; };
        window.addEventListener("beforeunload", beforeUnload);
        return () => window.removeEventListener("beforeunload", beforeUnload);
    }, [dirty]);
    if (openVersion !== undefined)
        return <ResourceDocumentPage item={item} version={openVersion} access={fileAccess} onClose={closeFile} onSaveFile={async(file,baseVersion)=>{if(baseVersion!==item.versions.at(-1)?.version)throw Error("\u6587\u4ef6\u5df2\u6709\u65b0\u7248\u672c\uff0c\u8bf7\u4fdd\u7559\u8349\u7a3f\u5e76\u6838\u5bf9\u6700\u65b0\u7248\u672c\u3002");return onUpload(file);}} onVersion={version => {
                if (onOpenFile)
                    onOpenFile(version);
                else
                    setLocalDocumentVersion(version);
            }}/>;
    return <main className="jadera-resource-page jadera-resource-detail-page" data-page-scroll ref={detailScroll}>
    <ContentWidthContainer className="jadera-resource-page-frame">
    <div className="jadera-resource-page-heading">
      <Button className="jadera-resource-breadcrumb" variant="ghost" disabled={busy} onClick={back} title={isTemplate(item.category)?"\u8fd4\u56de\u6a21\u677f\u7ba1\u7406":"\u8fd4\u56de\u77e5\u8bc6\u8d44\u6599"}><Icon name="arrow-left" size="sm"/>{"\u8fd4\u56de"}</Button>
      <ViewHeader icon="file-text" title={resourceTitle(item) + (current ? "  v" + current.version : "")} description={resourceCategoryLabel(item)} divider action={current ? <Button onClick={() => openFile()}>{"\u6253\u5F00\u6587\u4EF6"}</Button> : undefined}/>
    </div>
    <div className="jadera-resource-detail-scroll">
      {error && <p role="alert">{error}</p>}{notice && <p className="jadera-resource-feedback" role="status">{notice}</p>}

        <div className="jadera-resource-info-layout">
          <div className="jadera-resource-info-main"><form className="jadera-resource-info-form" onSubmit={(event) => {
            event.preventDefault();
            if (!editing || busy)
                return;
            void execute(async () => {
                await onUpdate({ name: name.trim(), resourceNumber, shortName, category, description, tags: tags.split(/[,\uff0c]/).map(tag => tag.trim()).filter(Boolean), revision: item.revision, ...(!item.createdBy?.id&&creatorId?{createdById:creatorId}:{}) });
                setEditing(false);
                setNotice("\u8d44\u6599\u4fe1\u606f\u5df2\u4fdd\u5b58");
            });
        }}>
            <header className="jadera-resource-info-heading">
              <div><h2>{"\u8D44\u6599\u4FE1\u606F"}</h2></div>
              {!editing && <Button type="button" variant="ghost" disabled={busy} onClick={startEditing}>{"\u7F16\u8F91"}</Button>}
            </header>
            {editing ? <>
              <div className="jadera-resource-info-fields">
                <Label htmlFor="resource-page-number">{"\u8D44\u6599\u7F16\u53F7 *"}</Label><Input id="resource-page-number" required maxLength={48} value={resourceNumber} disabled={busy} onChange={event => setResourceNumber(event.target.value)}/>
                <Label htmlFor="resource-page-short-name">{"\u6587\u6863\u7B80\u79F0"}</Label><Input id="resource-page-short-name" maxLength={60} value={shortName} disabled={busy} onChange={event => setShortName(event.target.value)}/>
                <Label htmlFor="resource-page-name">{"\u8D44\u6599\u540D\u79F0 *"}</Label>
                <div><Input id="resource-page-name" required maxLength={200} value={name} disabled={busy} onChange={(event) => setName(event.target.value)} autoFocus/><p className="jadera-resource-help">{"\u7528\u4E8E\u5217\u8868\u4E0E\u641C\u7D22\uFF0C\u539F\u6587\u4EF6\u540D\u4FDD\u6301\u4E0D\u53D8\u3002"}</p></div>
                <Label htmlFor="resource-page-category">{isTemplate(item.category) ? "\u6a21\u677f\u7c7b\u578b" : "\u8d44\u6599\u5206\u7c7b"} *</Label>
                <NativeSelect id="resource-page-category" value={category} disabled={busy} onChange={(event) => setCategory(event.target.value)}>{types.filter(type=>type.collection===(isTemplate(item.category)?"templates":"knowledge")).map(type => <option key={type.id} value={type.id}>{type.label}</option>)}</NativeSelect>
                <Label htmlFor="resource-page-description">{"\u8D44\u6599\u8BF4\u660E"}</Label><Textarea id="resource-page-description" rows={3} maxLength={1000} value={description} disabled={busy} onChange={event => setDescription(event.target.value)} placeholder={"\u8BF4\u660E\u8D44\u6599\u5185\u5BB9\u4E0E\u9002\u7528\u573A\u666F"}/>
                <Label htmlFor="resource-page-tags">{"\u6807\u7B7E"}</Label><div><Input id="resource-page-tags" maxLength={260} value={tags} disabled={busy} onChange={event => setTags(event.target.value)} placeholder={"\u7528\u9017\u53F7\u5206\u9694\u6807\u7B7E"}/><p className="jadera-resource-help">{"\u6700\u591A 10 \u4E2A\uFF0C\u6BCF\u4E2A\u4E0D\u8D85\u8FC7 24 \u5B57\u3002"}</p></div>
              </div>

            </> : <dl className="jadera-resource-info-readonly"><div><dt>{"\u8D44\u6599\u7F16\u53F7"}</dt><dd>{item.resourceNumber || "\u5f85\u7f16\u53f7"}</dd></div><div><dt>{"\u6587\u6863\u7B80\u79F0"}</dt><dd>{resourceTitle(item)}</dd></div>
              <div><dt>{"\u8D44\u6599\u540D\u79F0"}</dt><dd>{item.name}</dd></div>
              <div><dt>{isTemplate(item.category) ? "\u6a21\u677f\u7c7b\u578b" : "\u8d44\u6599\u5206\u7c7b"}</dt><dd>{RESOURCE_CATEGORIES[item.category as keyof typeof RESOURCE_CATEGORIES] || item.category}</dd></div>
              <div><dt>{"\u8D44\u6599\u8BF4\u660E"}</dt><dd>{item.description || "\u672a\u586b\u5199"}</dd></div>
              <div><dt>{"\u6807\u7B7E"}</dt><dd>{item.tags?.length ? <span className="jadera-resource-tags">{item.tags.map(tag => <span key={tag}>{tag}</span>)}</span> : "\u672a\u586b\u5199"}</dd></div>
            </dl>}
          <section className="jadera-resource-info-records"><h2>{"\u8d44\u6599\u5f52\u5c5e"}</h2><dl>
              <dt>{"\u6240\u5C5E\u79DF\u6237"}</dt><dd>{organizationName || "\u672a\u83b7\u53d6"}</dd><dt>{"\u5DE5\u4F5C\u533A"}</dt><dd>{workspaceName || "\u672a\u83b7\u53d6"}</dd>
              <dt>{"\u521B\u5EFA\u4EBA"}</dt><dd>{editing&&!item.createdBy?.id&&loadMembers?<div className="jadera-creator-picker"><Combobox items={members.map(person=>({value:person.id,label:person.name!}))} value={creatorId} onValueChange={setCreatorId} disabled={busy||membersState!=="ready"} placeholder={membersState==="loading"?"\u8bfb\u53d6\u6210\u5458\u2026":"\u9009\u62e9\u521b\u5efa\u4eba"} searchPlaceholder={"\u641c\u7d22\u6210\u5458"} emptyText={"\u6682\u65e0\u53ef\u9009\u6210\u5458"}/><p className="jadera-resource-help">{"\u4ec5\u663e\u793a\u672c\u5de5\u4f5c\u533a\u5df2\u4f7f\u7528\u672c\u4ea7\u54c1\u7684\u6210\u5458\u3002\u4fdd\u5b58\u540e\u4e0d\u53ef\u4fee\u6539\u3002"}</p>{membersState==="failed"&&<Button type="button" variant="ghost" onClick={()=>setMemberRetry(value=>value+1)}>{"\u6210\u5458\u8bfb\u53d6\u5931\u8d25\uff0c\u91cd\u8bd5"}</Button>}</div>:<ResourcePersonLabel person={item.createdBy} via={item.createdVia}/>}</dd><dt>{"\u521B\u5EFA\u65F6\u95F4"}</dt><dd>{formatDate(item.createdAt || item.versions[0]?.addedAt)}</dd>
              <dt>{"\u66F4\u65B0\u4EBA"}</dt><dd><ResourcePersonLabel person={item.updatedBy} via={item.updatedVia}/></dd><dt>{"\u66F4\u65B0\u65F6\u95F4"}</dt><dd>{formatDate(item.updatedAt)}</dd>

            </dl></section>{editing&&<footer><Button disabled={busy || !name.trim()} type="submit">{busy ? "\u4fdd\u5b58\u4e2d\u2026" : "\u4fdd\u5b58"}</Button><Button variant="outline" type="button" disabled={busy} onClick={abandonEditing}>{"\u653E\u5F03"}</Button></footer>}</form><div ref={referencesSection}><ResourceReferences id={item.id} updatedAt={item.updatedAt} load={loadReferences} onOpenProject={onOpenProject}/></div></div>
          <aside className="jadera-resource-info-aside">
        {uploadState && <div className="jadera-resource-upload-state" role="status">{uploadState === "pending" ? <><span>{"\u6B63\u5728\u4E0A\u4F20 "}{file?.name}</span><progress aria-label={"\u4E0A\u4F20\u4E2D"}/></> : <span>{uploadState}</span>}</div>}

            <section ref={history.length === 0 && current ? versionsSection : undefined}><div className="jadera-resource-file-summary">{current ? <><h2 className="jadera-resource-section-title">{current.name}</h2><p className="jadera-resource-help">v{current.version}{" \u00b7 "}{(current.bytes / 1024).toFixed(1)} KB{" \u00b7 "}{item.versions.length}{" \u4E2A\u7248\u672C"}</p></> : <p className="jadera-resource-help">{"\u5C1A\u672A\u4E0A\u4F20\u539F\u4EF6"}</p>}</div><ResourceVisualCard title={resourceTitle(item)} category={RESOURCE_CATEGORIES[item.category as keyof typeof RESOURCE_CATEGORIES] || item.category} version={current?.version} updatedAt={item.updatedAt} onOpenFile={() => openFile()} actions={current ? <ResourceActionsMenu title={resourceTitle(item)} onUpload={() => {setFile(undefined);setUploadOpen(true);}} onDownload={fileAccess ? () => void execute(() => downloadResourceFile(fileAccess,item.id,current.version,current.name)) : undefined}/> : undefined} preview={<ResourcePreview item={item} tenantLabel={tenantLabel}/>}/></section>
            {(history.length > 0 || !current) && <section className="jadera-resource-versions" ref={versionsSection}><header className="jadera-resource-section-heading"><div><h2>{"\u7248\u672c\u4fe1\u606f "}<small>{history.length}</small></h2><p>{"\u4fdd\u7559\u6bcf\u6b21\u66f4\u65b0\uff0c\u53ef\u968f\u65f6\u67e5\u9605\u5386\u53f2\u6587\u4ef6\u3002"}</p></div><Button variant="ghost" onClick={() => { setFile(undefined); setUploadOpen(true); }}>{"\u4e0a\u4f20\u65b0\u7248\u672c"}</Button></header>
        <div className="jadera-resource-version-list">{history.map(entry=><ResourceVersionCard key={entry.version} entry={entry} onOpen={()=>openFile(entry.version)} onDownload={fileAccess?()=>void execute(()=>downloadResourceFile(fileAccess,item.id,entry.version,entry.name)):undefined}/>)}</div>{history.length > 0 && <p className="jadera-resource-help">{"\u5386\u53f2\u7248\u672c\u53ea\u8bfb\uff0c\u9879\u76ee\u4e2d\u5df2\u6709\u7684\u7248\u672c\u5f15\u7528\u4fdd\u6301\u4e0d\u53d8\u3002"}</p>}</section>}
          </aside>
        </div>

    </div>
    </ContentWidthContainer>
    <ResourceImportDialog open={uploadOpen} onOpenChange={setUploadOpen} title={"\u4e0a\u4f20\u65b0\u7248\u672c"} description={"\u66f4\u65b0\u539f\u4ef6\uff0c\u4fdd\u7559\u5386\u53f2\u6587\u4ef6\u548c\u9879\u76ee\u5df2\u5f15\u7528\u7248\u672c\u3002"} file={file} onFile={next=>{setFile(next);setError("");}} busy={busy} error={error} submitLabel={"\u786e\u8ba4\u4e0a\u4f20\u4e3a v"+(Math.max(0,...item.versions.map(v=>v.version))+1)} onSubmit={()=>{if(!file)return;setUploadState("pending");void execute(async()=>{try{await onUpload(file);setUploadState("\u4e0a\u4f20\u5b8c\u6210");setNotice("\u65b0\u7248\u672c\u5df2\u4fdd\u5b58\uff0c\u5386\u53f2\u7248\u672c\u4fdd\u6301\u4e0d\u53d8\u3002");setFile(undefined);setUploadOpen(false);}catch(error){setUploadState("\u4e0a\u4f20\u672a\u5b8c\u6210\uff0c\u53ef\u91cd\u65b0\u5c1d\u8bd5");throw error;}});}}/>
  </main>;
}
