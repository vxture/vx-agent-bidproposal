"use client";
/**
 * @package @bidproposal/app
 * @layer Presentation
 * @category Proposals
 * @author AI-Generated
 * @date 2026-11-25
 */
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowSquareOut, Archive, BookOpen, CaretRight, Check, FileText, FloppyDisk, FolderOpen, Plus, Sparkle, X } from "@phosphor-icons/react";
import { readAccess } from "../access/access-reader";
import { EntryCard } from "../access/entry-card";
import { EntryShell } from "../access/entry-shell";
import { entryKindFor, gateLoginUrl } from "../access/entry-content";
import { isThrough, type AccessState } from "../access/types";
import type { Proposal, ProposalSummary } from "./model";
import "./workbench.css";
// --- Transport and explicit user-facing failure states -----------------------
const ERRORS: Record<string, string> = {
    REVISION_CONFLICT: "\u53E6\u4E00\u5904\u5DF2\u4FDD\u5B58\u4E86\u65B0\u7248\u672C\u3002\u8BF7\u4FDD\u7559\u5F53\u524D\u5185\u5BB9\uFF0C\u91CD\u65B0\u6253\u5F00\u65B9\u6848\u540E\u518D\u5408\u5E76\u4FEE\u6539\u3002",
    PROPOSAL_LIMIT_REACHED: "\u5DF2\u8FBE\u5230\u65B9\u6848\u6570\u91CF\u4E0A\u9650\u3002\u8BF7\u5728\u63A7\u5236\u53F0\u67E5\u770B\u5957\u9910\u6743\u76CA\u3002",
    SIGN_IN_REQUIRED: "\u767B\u5F55\u5DF2\u5931\u6548\uFF0C\u8BF7\u91CD\u65B0\u767B\u5F55\u3002",
    NOT_ENTITLED: "\u5F53\u524D\u5DE5\u4F5C\u533A\u6682\u4E0D\u53EF\u4F7F\u7528\u672C\u4EA7\u54C1\uFF0C\u8BF7\u5728\u63A7\u5236\u53F0\u786E\u8BA4\u8BA2\u9605\u3002",
    PRODUCT_ACCESS_NOT_ASSIGNED: "\u5C1A\u672A\u5206\u914D\u4F7F\u7528\u5E2D\u4F4D\uFF0C\u8BF7\u8054\u7CFB\u7BA1\u7406\u5458\u3002",
    SOURCE_REQUIRED: "\u8BF7\u5148\u5728\u62DB\u6807\u8D44\u6599\u4E2D\u7C98\u8D34\u5E76\u4FDD\u5B58\u76F8\u5173\u539F\u6587\u3002",
    SOURCE_REQUIRES_BATCHING: "\u52A9\u624B\u6682\u4E0D\u652F\u6301\u957F\u8D44\u6599\u7684\u81EA\u52A8\u5206\u6279\u5904\u7406\u3002\u8BF7\u5C06\u76F8\u5173\u539F\u6587\u6574\u7406\u4E3A 5 \u4E07\u5B57\u7B26\u4EE5\u5185\u518D\u8BD5\u3002",
    DOCUMENT_TOO_LARGE: "\u65B9\u6848\u5185\u5BB9\u8D85\u51FA\u4FDD\u5B58\u8303\u56F4\uFF0C\u8BF7\u7CBE\u7B80\u8D44\u6599\u6216\u7AE0\u8282\u3002",
    INVALID_INPUT: "\u8BF7\u68C0\u67E5\u8F93\u5165\u5185\u5BB9\u548C\u957F\u5EA6\u3002",
    INVALID_CHAPTERS: "\u7AE0\u8282\u6807\u9898\u4E0D\u80FD\u4E3A\u7A7A\uFF0C\u6700\u591A\u652F\u6301 80 \u7AE0\u3002",
    WRITING_RATE_LIMITED: "\u64CD\u4F5C\u8F83\u9891\u7E41\uFF0C\u8BF7\u4E00\u5206\u949F\u540E\u518D\u8BD5\u3002",
    PROPOSAL_ARCHIVED: "\u8BF7\u5148\u6062\u590D\u65B9\u6848\uFF0C\u518D\u4F7F\u7528\u7F16\u5199\u52A9\u624B\u3002",
    QUOTA_EXCEEDED: "AI \u70B9\u6570\u4E0D\u8DB3\uFF0C\u8BF7\u5728\u63A7\u5236\u53F0\u67E5\u770B\u914D\u989D\u3002",
    PROPOSAL_LIST_REQUIRES_PAGING: "\u65B9\u6848\u8D85\u8FC7\u5F53\u524D\u6E05\u5355\u5BB9\u91CF\uFF0C\u8BF7\u8054\u7CFB\u652F\u6301\u3002",
};
async function request<T>(path: string, method = "GET", body?: unknown): Promise<T> {
    const response = await fetch("/api/proposals" + path, { method, credentials: "same-origin", cache: "no-store",
        headers: body === undefined ? {} : { "content-type": "application/json" },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
    const result = await response.json().catch(() => ({}));
    if (!response.ok)
        throw new Error(ERRORS[result.code] ?? "\u6682\u65F6\u65E0\u6CD5\u5B8C\u6210\u64CD\u4F5C\uFF0C\u8BF7\u4FDD\u7559\u5185\u5BB9\u540E\u91CD\u8BD5\u3002");
    return result as T;
}
const dateLabel = (value: string) => new Date(value).toLocaleDateString("zh-CN", { month: "short", day: "numeric" });
const stageLabels = ["\u62DB\u6807\u89E3\u8BFB", "\u9700\u6C42\u786E\u8BA4", "\u7F16\u5199\u89C4\u5212", "\u6807\u4E66\u7F16\u5199", "\u5BA1\u6838\u4FEE\u8BA2", "\u6210\u679C\u5BFC\u51FA"];
// --- Workspace library and draft lifecycle -----------------------------------
export function ProposalWorkbench() {
    const [access, setAccess] = useState<AccessState | null>(null);
    const [failed, setFailed] = useState(false);
    const [items, setItems] = useState<ProposalSummary[]>([]);
    const [record, setRecord] = useState<Proposal | null>(null);
    const [snapshot, setSnapshot] = useState("");
    const [selected, setSelected] = useState("");
    const [tab, setTab] = useState<"source" | "draft">("draft");
    const [filter, setFilter] = useState("active");
    const [search, setSearch] = useState("");
    const [creating, setCreating] = useState(false);
    const [name, setName] = useState("");
    const createId = useRef<string | null>(null);
    const [busy, setBusy] = useState("");
    const [message, setMessage] = useState("");
    const [problem, setProblem] = useState("");
    const [instruction, setInstruction] = useState("\u6839\u636E\u62DB\u6807\u539F\u6587\uFF0C\u4E3A\u5F53\u524D\u7AE0\u8282\u7F16\u5199\u53EF\u4F9B\u4EBA\u5DE5\u5BA1\u6838\u7684\u4E13\u4E1A\u521D\u7A3F\u3002");
    const [candidate, setCandidate] = useState<{
        markdown: string;
        chapterId: string;
        sourceRevision: number;
    } | null>(null);
    const dirty = !!record && JSON.stringify(record) !== snapshot;
    const chapter = record?.content.chapters.find(row => row.id === selected);
    const refresh = async () => {
        const data = await request<{
            items: ProposalSummary[];
        }>("");
        setItems(data.items);
    };
    function accept(proposal: Proposal) {
        setRecord(proposal);
        setSnapshot(JSON.stringify(proposal));
        setSelected(previous => proposal.content.chapters.some(c => c.id === previous) ? previous : proposal.content.chapters[0]?.id ?? "");
    }
    useEffect(() => {
        let alive = true;
        void readAccess().then(async (state) => {
            if (!alive)
                return;
            setAccess(state);
            if (!isThrough(state))
                return;
            const data = await request<{
                items: ProposalSummary[];
            }>("");
            if (alive)
                setItems(data.items);
        }).catch(() => {
            if (alive)
                setFailed(true);
        });
        return () => { alive = false; };
    }, []);
    useEffect(() => {
        const warn = (event: BeforeUnloadEvent) => {
            if (dirty || busy) {
                event.preventDefault();
                event.returnValue = "";
            }
        };
        window.addEventListener("beforeunload", warn);
        return () => window.removeEventListener("beforeunload", warn);
    }, [dirty, busy]);
    async function act(label: string, work: () => Promise<void>) {
        if (busy)
            return;
        setBusy(label);
        setProblem("");
        setMessage("");
        try {
            await work();
        }
        catch (error) {
            setProblem(error instanceof Error ? error.message : "\u64CD\u4F5C\u672A\u5B8C\u6210\uFF0C\u8BF7\u91CD\u8BD5\u3002");
        }
        finally {
            setBusy("");
        }
    }
    async function save(): Promise<Proposal> {
        if (!record)
            throw new Error("\u8BF7\u5148\u9009\u62E9\u65B9\u6848\u3002");
        if (!dirty)
            return record;
        const next = await request<Proposal>("/" + record.id, "PUT", record);
        accept(next);
        setItems(rows => [next, ...rows.filter(row => row.id !== next.id)]);
        setMessage("\u5DF2\u4FDD\u5B58\u5230\u5F53\u524D\u5DE5\u4F5C\u533A");
        return next;
    }
    async function open(id: string) {
        if (dirty && !window.confirm("\u5F53\u524D\u4FEE\u6539\u5C1A\u672A\u4FDD\u5B58\uFF0C\u662F\u5426\u653E\u5F03\u4FEE\u6539\u5E76\u6253\u5F00\u53E6\u4E00\u65B9\u6848\uFF1F"))
            return;
        await act("\u6B63\u5728\u6253\u5F00", async () => { accept(await request<Proposal>("/" + id)); setCandidate(null); setTab("draft"); });
    }
    function changeChapter(value: Partial<NonNullable<typeof chapter>>) {
        if (!record || !chapter)
            return;
        setRecord({ ...record, content: { ...record.content, chapters: record.content.chapters.map(c => c.id === chapter.id ? { ...c, ...value } : c) } });
        setCandidate(null);
    }
    const user = access && "user" in access ? access.user : undefined;
    if (failed)
        return <EntryShell><EntryCard kind="access-unavailable" onAction={() => location.reload()}/></EntryShell>;
    if (!access)
        return <EntryShell><EntryCard kind="checking"/></EntryShell>;
    if (!isThrough(access)) {
        const kind = entryKindFor(access);
        return <EntryShell><EntryCard kind={kind} user={user} actionHref={kind === "signin" ? gateLoginUrl("/") : undefined} onAction={kind === "signin" ? undefined : () => location.reload()}/></EntryShell>;
    }
    const visible = items.filter(row => row.status === filter && row.title.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase()));
    // --- Product shell and library --------------------------------------------
    return <div className="bid-workbench">
    <header className="bid-wb-header">
      <a href="/" className="bid-wb-brand" aria-label={"Bidproposal \u9996\u9875"}><span className="bid-wb-mark"><BookOpen size={21} weight="duotone"/></span><strong>Bidproposal</strong><span className="bid-wb-beta">{"\u516C\u6D4B"}</span></a>
      <div className="bid-wb-account"><span>{user?.activeWorkspaceName ?? "\u5F53\u524D\u5DE5\u4F5C\u533A"}</span><span className="bid-wb-separator"/><span>{user?.displayName ?? "\u5DF2\u767B\u5F55"}</span><form method="post" action="/auth/logout"><button type="submit" disabled={!!busy} onClick={event => {
            if (dirty && !window.confirm("\u4FEE\u6539\u5C1A\u672A\u4FDD\u5B58\uFF0C\u662F\u5426\u9000\u51FA\uFF1F"))
                event.preventDefault();
        }}>{"\u9000\u51FA"}</button></form></div>
    </header>
    <div className="bid-wb-layout">
      <aside className="bid-wb-sidebar"><p className="bid-wb-overline">{"\u5DE5\u4F5C\u7A7A\u95F4"}</p><button className="bid-wb-nav active" onClick={() => {
            if (!dirty || window.confirm("\u4FEE\u6539\u5C1A\u672A\u4FDD\u5B58\uFF0C\u662F\u5426\u8FD4\u56DE\u65B9\u6848\u6E05\u5355\uFF1F")) {
                setRecord(null);
                setCandidate(null);
            }
        }} disabled={!!busy}><FolderOpen size={19} weight="duotone"/>{"\u6211\u7684\u65B9\u6848"}<span>{items.filter(row => row.status === "active").length}</span></button>
        <div className="bid-wb-sidebar-bottom"><p>{"\u4ECE\u62DB\u6807\u89E3\u8BFB\uFF0C\u5230\u4E13\u4E1A\u6210\u7A3F"}</p><a href="https://console.vxture.com/zh-CN/subscription" target="_blank" rel="noreferrer">{"\u8BA2\u9605\u4E0E\u914D\u989D"}<ArrowSquareOut size={15}/></a><p className="bid-wb-small">{"\u7F51\u9875\u7248 \u00B7 \u5DE5\u4F5C\u533A\u5171\u4EAB"}</p></div>
      </aside>
      <main className="bid-wb-main" id="bid-workspace-main">
        <div className="bid-wb-feedback" aria-live="polite">{busy || message}</div>
        {problem && <div className="bid-wb-error" role="alert">{problem}<button aria-label={"\u5173\u95ED\u63D0\u793A"} onClick={() => setProblem("")}><X size={16}/></button></div>}
        {!record ? <>
          <div className="bid-wb-page-title"><div><p className="bid-wb-overline">PROPOSAL WORKSPACE</p><h1>{"\u6211\u7684\u65B9\u6848"}</h1><p>{"\u4FDD\u7559\u8D44\u6599\u4E0E\u601D\u8DEF\uFF0C\u9010\u7AE0\u5B8C\u6210\u6BCF\u4E00\u4EFD\u4E13\u4E1A\u54CD\u5E94\u3002"}</p></div><button className="bid-wb-primary" onClick={() => { setCreating(true); createId.current ??= crypto.randomUUID(); }} disabled={!!busy}><Plus size={18}/>{"\u65B0\u5EFA\u65B9\u6848"}</button></div>
          <div className="bid-wb-process" aria-label={"\u7F16\u6807\u6D41\u7A0B"}>{stageLabels.map((label, index) => <span key={label}><i>{String(index + 1).padStart(2, "0")}</i>{label}{index < 5 && <CaretRight size={13}/>}</span>)}</div>
          <p className="bid-wb-scope">{"\u53EF\u4F7F\u7528\u8D44\u6599\u6574\u7406\u3001\u7AE0\u8282\u7F16\u8F91\u4E0E\u7F16\u5199\u52A9\u624B\uFF1B\u5206\u6279\u89E3\u8BFB\u3001\u8BC1\u636E\u6838\u9A8C\u53CA DOCX / PDF \u5BFC\u51FA\u5C06\u9646\u7EED\u5F00\u653E\u3002"}</p>
          {creating && <form className="bid-wb-create" onSubmit={event => { event.preventDefault(); void act("\u6B63\u5728\u521B\u5EFA", async () => { const next = await request<Proposal>("", "POST", { id: createId.current, title: name }); accept(next); setItems(rows => [next, ...rows.filter(row => row.id !== next.id)]); setCreating(false); setName(""); createId.current = null; }); }}>
            <label htmlFor="proposal-name">{"\u65B9\u6848\u540D\u79F0"}</label><input id="proposal-name" value={name} onChange={e => setName(e.target.value)} maxLength={120} placeholder={"\u4F8B\u5982\uFF1A\u667A\u6167\u56ED\u533A\u5EFA\u8BBE\u9879\u76EE\u6280\u672F\u65B9\u6848"} autoFocus required disabled={!!busy}/><button className="bid-wb-primary" disabled={!!busy || !name.trim()}>{"\u521B\u5EFA\u65B9\u6848"}</button><button type="button" disabled={!!busy} onClick={() => { setCreating(false); createId.current = null; }}>{"\u53D6\u6D88"}</button>
          </form>}
          <div className="bid-wb-toolbar"><div className="bid-wb-tabs">{["active", "archived"].map(value => <button key={value} aria-pressed={filter === value} onClick={() => setFilter(value)}>{value === "active" ? "\u8FDB\u884C\u4E2D" : "\u5DF2\u5F52\u6863"}</button>)}</div><input type="search" placeholder={"\u641C\u7D22\u65B9\u6848"} aria-label={"\u641C\u7D22\u65B9\u6848"} value={search} onChange={e => setSearch(e.target.value)}/><button onClick={() => void act("\u6B63\u5728\u5237\u65B0", refresh)} disabled={!!busy}>{"\u5237\u65B0"}</button></div>
          <div className="bid-wb-grid">{visible.map(row => <button key={row.id} className="bid-wb-proposal-card" onClick={() => void open(row.id)} disabled={!!busy}><span className="bid-wb-document-icon"><FileText size={24} weight="duotone"/></span><span className="bid-wb-proposal-state">{row.status === "active" ? "\u7F16\u5199\u4E2D" : "\u5DF2\u5F52\u6863"}</span><h2>{row.title}</h2><p>{"\u8FDB\u5165\u65B9\u6848\uFF0C\u7EE7\u7EED\u6574\u7406\u4E0E\u7F16\u5199"}</p><footer><span>{dateLabel(row.updatedAt)}{" \u66F4\u65B0"}</span><CaretRight size={16}/></footer></button>)}</div>
          {!visible.length && <div className="bid-wb-empty"><FileText size={36} weight="duotone"/><h2>{search ? "\u6CA1\u6709\u5339\u914D\u7684\u65B9\u6848" : filter === "archived" ? "\u6682\u65E0\u5F52\u6863\u65B9\u6848" : "\u4ECE\u7B2C\u4E00\u4EFD\u65B9\u6848\u5F00\u59CB"}</h2><p>{filter === "active" ? "\u65B0\u5EFA\u65B9\u6848\uFF0C\u6DFB\u52A0\u62DB\u6807\u8D44\u6599\uFF0C\u518D\u9010\u7AE0\u7EC4\u7EC7\u4E13\u4E1A\u5185\u5BB9\u3002" : "\u5F52\u6863\u540E\u4ECD\u4FDD\u7559\u8D44\u6599\u4E0E\u7AE0\u8282\uFF0C\u968F\u65F6\u53EF\u4EE5\u6062\u590D\u3002"}</p></div>}
        </> : <>
          <button className="bid-wb-back" disabled={!!busy} onClick={() => {
                if (!dirty || window.confirm("\u4FEE\u6539\u5C1A\u672A\u4FDD\u5B58\uFF0C\u662F\u5426\u8FD4\u56DE\u6E05\u5355\uFF1F")) {
                    setRecord(null);
                    setCandidate(null);
                }
            }}><ArrowLeft size={15}/>{"\u5168\u90E8\u65B9\u6848"}</button>
          <div className="bid-wb-editor-title"><div><input aria-label={"\u65B9\u6848\u540D\u79F0"} maxLength={120} value={record.title} onChange={e => { setRecord({ ...record, title: e.target.value }); setCandidate(null); }} disabled={!!busy || record.status === "archived"}/><p>{record.status === "archived" ? "\u5DF2\u5F52\u6863 \u00B7 \u6062\u590D\u540E\u53EF\u7EE7\u7EED\u7F16\u5199" : dirty ? "\u6709\u5C1A\u672A\u4FDD\u5B58\u7684\u4FEE\u6539" : "\u5DF2\u4FDD\u5B58\u5230\u5DE5\u4F5C\u533A"}{" \u00B7 "}{dateLabel(record.updatedAt)}</p></div><button disabled={!!busy} onClick={() => void act("\u6B63\u5728\u66F4\u65B0", async () => { const next = await save(); const updated = await request<Proposal>("/" + next.id, "PUT", { ...next, status: next.status === "active" ? "archived" : "active" }); accept(updated); setItems(rows => [updated, ...rows.filter(row => row.id !== updated.id)]); setCandidate(null); })}><Archive size={17}/>{record.status === "active" ? "\u5F52\u6863" : "\u6062\u590D"}</button><button className="bid-wb-primary" disabled={!!busy || !dirty || record.status === "archived"} onClick={() => void act("\u6B63\u5728\u4FDD\u5B58", async () => { await save(); })}><FloppyDisk size={17}/>{"\u4FDD\u5B58"}</button></div>
          <div className="bid-wb-tabs bid-wb-editor-tabs"><button aria-pressed={tab === "source"} onClick={() => setTab("source")}>{"\u62DB\u6807\u8D44\u6599"}</button><button aria-pressed={tab === "draft"} onClick={() => setTab("draft")}>{"\u7AE0\u8282\u7F16\u5199"}<span>{record.content.chapters.length}</span></button></div>
          <fieldset className="bid-wb-fields" disabled={!!busy || record.status === "archived"}>
            {tab === "source" ? <div className="bid-wb-source"><section><h2>{"\u7F16\u5199\u65B9\u5411"}</h2><p>{"\u8BF4\u660E\u9879\u76EE\u80CC\u666F\u3001\u6807\u4E66\u7C7B\u578B\u4E0E\u672C\u6B21\u9700\u8981\u7A81\u51FA\u7684\u91CD\u70B9\u3002"}</p><textarea aria-label={"\u7F16\u5199\u65B9\u5411"} value={record.content.brief} maxLength={4000} onChange={e => { setRecord({ ...record, content: { ...record.content, brief: e.target.value } }); setCandidate(null); }} placeholder={"\u4F8B\u5982\uFF1A\u6280\u672F\u65B9\u6848\uFF0C\u4EE5\u5B9E\u65BD\u8DEF\u5F84\u548C\u9A8C\u6536\u65B9\u5F0F\u4E3A\u91CD\u70B9\uFF0C\u4E0D\u4F7F\u7528\u672A\u7ECF\u6838\u5B9E\u7684\u4F01\u4E1A\u627F\u8BFA\u3002"} rows={5}/></section><section><div className="bid-wb-section-heading"><div><h2>{"\u62DB\u6807\u539F\u6587\u4E0E\u53C2\u8003\u8D44\u6599"}</h2><p>{"\u7C98\u8D34\u4E0E\u5F53\u524D\u65B9\u6848\u76F8\u5173\u7684\u539F\u6587\uFF0C\u4FDD\u7559\u7AE0\u8282\u540D\u79F0\u3001\u6307\u6807\u548C\u51FA\u5904\u3002"}</p></div><label className="bid-wb-file-label">{"\u5BFC\u5165\u6587\u672C"}<input type="file" accept=".txt,.md,text/plain,text/markdown" onChange={event => {
                    const file = event.target.files?.[0];
                    if (!file)
                        return;
                    void act("\u6B63\u5728\u8BFB\u53D6", async () => {
                        if (file.size > 500000)
                            throw new Error("\u6587\u672C\u6587\u4EF6\u8FC7\u5927\uFF0C\u8BF7\u5148\u6574\u7406\u76F8\u5173\u8D44\u6599\u3002");
                        if (record.content.source.trim() && !window.confirm("\u5BFC\u5165\u6587\u672C\u5C06\u66FF\u6362\u5F53\u524D\u62DB\u6807\u539F\u6587\uFF0C\u662F\u5426\u7EE7\u7EED\uFF1F"))
                            return;
                        const value = await file.text();
                        if (value.length > 150000)
                            throw new Error("\u8D44\u6599\u8D85\u8FC7 15 \u4E07\u5B57\uFF0C\u8BF7\u7CBE\u7B80\u540E\u5BFC\u5165\u3002");
                        setRecord({ ...record, content: { ...record.content, source: value } });
                        setCandidate(null);
                    });
                    event.target.value = "";
                }}/></label></div><textarea aria-label={"\u62DB\u6807\u539F\u6587"} rows={20} maxLength={150000} value={record.content.source} onChange={e => { setRecord({ ...record, content: { ...record.content, source: e.target.value } }); setCandidate(null); }} placeholder={"\u5728\u8FD9\u91CC\u7C98\u8D34\u62DB\u6807\u8981\u6C42\u53CA\u53EF\u6838\u5B9E\u7684\u53C2\u8003\u8D44\u6599\u3002\u5F53\u524D\u652F\u6301 TXT / Markdown \u6587\u672C\uFF0CPDF \u4E0E Word \u89E3\u6790\u53E6\u884C\u63A5\u5165\u3002"}/><p className="bid-wb-small">{record.content.source.length.toLocaleString()}{" \u5B57\u7B26 \u00B7 \u52A9\u624B\u5355\u6B21\u5904\u7406\u4E0D\u8D85\u8FC7 5 \u4E07\u5B57\u7B26 \u00B7 \u539F\u6587\u4F5C\u4E3A\u8D44\u6599\uFF0C\u4E0D\u4F5C\u4E3A\u6307\u4EE4\u6267\u884C"}</p></section></div> :
                <div className="bid-wb-writing"><aside className="bid-wb-chapters"><div className="bid-wb-section-heading"><strong>{"\u7AE0\u8282\u76EE\u5F55"}</strong><button aria-label={"\u6DFB\u52A0\u7AE0\u8282"} onClick={() => { const id = crypto.randomUUID(); setRecord({ ...record, content: { ...record.content, chapters: [...record.content.chapters, { id, title: "\u65B0\u7AE0\u8282", markdown: "" }] } }); setSelected(id); setCandidate(null); }} disabled={record.content.chapters.length >= 80 || !!busy}><Plus size={17}/></button></div>{record.content.chapters.map((row, index) => <button key={row.id} className={selected === row.id ? "selected" : ""} onClick={() => { setSelected(row.id); setCandidate(null); }}><span>{String(index + 1).padStart(2, "0")}</span>{row.title}</button>)}{!chapter && <p className="bid-wb-small">{"\u6DFB\u52A0\u7B2C\u4E00\u4E2A\u7AE0\u8282\uFF0C\u7EC4\u7EC7\u65B9\u6848\u7ED3\u6784\u3002"}</p>}</aside><section className="bid-wb-chapter-editor">{chapter ? <><input className="bid-wb-chapter-title" aria-label={"\u7AE0\u8282\u6807\u9898"} value={chapter.title} maxLength={100} onChange={e => changeChapter({ title: e.target.value })}/><textarea className="bid-wb-chapter-body" aria-label={"\u7AE0\u8282\u6B63\u6587"} value={chapter.markdown} maxLength={150000} onChange={e => changeChapter({ markdown: e.target.value })} placeholder={"\u5728\u8FD9\u91CC\u7F16\u5199\u5F53\u524D\u7AE0\u8282\uFF0C\u652F\u6301 Markdown\u3002\u4E5F\u53EF\u4EE5\u8BA9\u53F3\u4FA7\u52A9\u624B\u6839\u636E\u62DB\u6807\u539F\u6587\u751F\u6210\u5019\u9009\u521D\u7A3F\u3002"}/><p className="bid-wb-small">{chapter.markdown.length.toLocaleString()}{" \u5B57\u7B26 \u00B7 Markdown \u6B63\u6587 \u00B7 \u4FDD\u5B58\u540E\u53EF\u8DE8\u8BBE\u5907\u7EE7\u7EED"}</p></> : <div className="bid-wb-empty"><BookOpen size={34} weight="duotone"/><h2>{"\u5148\u7EC4\u7EC7\u7AE0\u8282\uFF0C\u518D\u5C55\u5F00\u5185\u5BB9"}</h2><p>{"\u5728\u5DE6\u4FA7\u6DFB\u52A0\u7AE0\u8282\uFF0C\u6216\u5148\u5207\u6362\u5230\u62DB\u6807\u8D44\u6599\u6574\u7406\u539F\u6587\u3002"}</p><button type="button" onClick={() => setTab("source")}>{"\u6574\u7406\u62DB\u6807\u8D44\u6599"}</button></div>}</section><aside className="bid-wb-assistant"><div className="bid-wb-section-heading"><h2><Sparkle size={18} weight="duotone"/>{"\u7F16\u5199\u52A9\u624B"}</h2></div><p>{"\u6839\u636E\u5DF2\u4FDD\u5B58\u7684\u8D44\u6599\u751F\u6210\u5F53\u524D\u7AE0\u8282\u5019\u9009\uFF0C\u4E0D\u4F1A\u76F4\u63A5\u8986\u76D6\u6B63\u6587\u3002"}</p><label htmlFor="writing-direction">{"\u672C\u6B21\u7F16\u5199\u8981\u6C42"}</label><textarea id="writing-direction" rows={6} maxLength={2000} value={instruction} onChange={e => setInstruction(e.target.value)}/><button className="bid-wb-primary" disabled={!chapter || !!busy || !instruction.trim()} onClick={() => void act("\u6B63\u5728\u7F16\u5199\uFF0C\u8BF7\u52FF\u91CD\u590D\u63D0\u4EA4", async () => { const next = await save(); const result = await request<NonNullable<typeof candidate>>("/" + next.id + "/assist", "POST", { revision: next.revision, chapterId: selected, instruction }); setCandidate(result); setMessage("\u5019\u9009\u5DF2\u751F\u6210\uFF0C\u8BF7\u6838\u5BF9\u540E\u91C7\u7528\uFF1B\u6B63\u6587\u5C1A\u672A\u6539\u52A8\u3002"); })}><Sparkle size={17}/>{"\u751F\u6210\u7AE0\u8282\u5019\u9009"}</button><p className="bid-wb-small">{"\u6D88\u8017\u5DE5\u4F5C\u533A AI \u70B9\u6570\u3002\u751F\u6210\u5185\u5BB9\u9700\u8981\u4EBA\u5DE5\u6838\u5BF9\uFF0C\u7F3A\u5931\u8BC1\u636E\u4F1A\u4FDD\u7559\u5F85\u8865\u63D0\u793A\u3002"}</p></aside></div>}
          </fieldset>
          {candidate && chapter && <section className="bid-wb-candidate"><div className="bid-wb-section-heading"><div><p className="bid-wb-overline">{"\u5F85\u4EBA\u5DE5\u786E\u8BA4"}</p><h2>{chapter.title}{" \u00B7 \u5019\u9009\u521D\u7A3F"}</h2></div><button onClick={() => setCandidate(null)} disabled={!!busy}>{"\u653E\u5F03\u5019\u9009"}</button><button className="bid-wb-primary" disabled={!!busy || dirty || candidate.sourceRevision !== record.revision} onClick={() => void act("\u6B63\u5728\u91C7\u7528\u5E76\u4FDD\u5B58", async () => { const content = { ...record.content, chapters: record.content.chapters.map(row => row.id === candidate.chapterId ? { ...row, markdown: candidate.markdown } : row) }; const next = await request<Proposal>("/" + record.id, "PUT", { ...record, content }); accept(next); setCandidate(null); setMessage("\u5019\u9009\u5DF2\u91C7\u7528\u5E76\u4FDD\u5B58\uFF0C\u8BF7\u7EE7\u7EED\u6838\u5BF9\u6B63\u6587\u3002"); })}><Check size={17}/>{"\u91C7\u7528\u5E76\u4FDD\u5B58"}</button></div><pre>{candidate.markdown}</pre></section>}
        </>}
        <footer className="bid-wb-footer"><span>{"\u00A9 "}{new Date().getFullYear()}{" VXTURE \u00B7 RUYIN"}</span><span>{"Bidproposal \u00B7 \u6807\u4E66\u65B9\u6848\u667A\u80FD\u4F53"}</span></footer>
      </main>
    </div>
  </div>;
}
