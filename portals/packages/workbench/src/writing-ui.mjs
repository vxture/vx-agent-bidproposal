/**
 * @package @bidproposal/workbench
 * @layer Presentation
 * @category BusinessUi
 * @author AI-Generated
 * @date 2026-11-25
 */
import { autoSave } from './autosave.mjs';
import { WritingSession } from './writing.mjs';
import { renderMarkdown } from './markdown-view.mjs';
import { readChapterEvidence } from './chapter-evidence.mjs';

export async function mountWriting(bridge, workflow, { onDraftSaved = async () => {} } = {}) {
  const text = (tag, value, cls) => {
    const el = document.createElement(tag);
    el.textContent = value;
    if (cls) el.className = cls;
    return el;
  };
  const project = await bridge.request('GET', '/project');
  if (!project.ok) throw new Error('Project unavailable');
  const run = new WritingSession(bridge);
  run.backgroundEnabled = true;
  run.businessReviewEnabled = true;
  await run.load();
  const panel = document.createElement('section');
  panel.id = 'writing-panel';
  panel.className = 'writing-studio';
  panel.hidden = true;
  document.querySelector('main').append(panel);
  const hero = text('div', '', 'writing-hero');
  hero.append(
    text('p', 'AGENT / \u6807\u4e66\u7f16\u5199', 'section-label'),
    text('h1', '\u8ba9\u667a\u80fd\u4f53\u628a\u65b9\u6848\u5199\u6210\u6b63\u6587'),
    text(
      'p',
      '\u6cbf\u7528\u5df2\u786e\u8ba4\u7684\u76ee\u5f55\uff0c\u5206\u7ae0\u7f16\u5199\u5e76\u4fdd\u5b58\u3002\u4f60\u53ef\u4ee5\u968f\u65f6\u9605\u8bfb\u3001\u6682\u505c\uff0c\u6216\u8981\u6c42\u667a\u80fd\u4f53\u91cd\u5199\u5176\u4e2d\u4e00\u7ae0\u3002',
      'muted',
    ),
  );
  const toolbar = text('div', '', 'writing-toolbar'),
    progress = text('strong', ''),
    start = text('button', '\u5f00\u59cb\u5206\u7ae0\u7f16\u5199', 'primary'),
    pause = text('button', '\u6682\u505c\u540e\u7eed\u7ae0\u8282'),
    refresh = text('button', '\u5237\u65b0\u8fdb\u5ea6', 'quiet'),
    assistantToggle = text('button', '\u667a\u80fd\u4f53\u9762\u677f', 'writing-assistant-toggle');
  toolbar.append(progress, start, pause, refresh, assistantToggle);
  const status = text('p', '', 'writing-status');
  status.setAttribute('role', 'status');
  const layout = text('div', '', 'writing-layout'),
    nav = text('div', '', 'writing-chapter-nav'),
    viewer = text('article', '', 'writing-document'),
    agent = text('aside', '', 'writing-agent');
  agent.id = 'writing-agent';
  assistantToggle.setAttribute('aria-controls', agent.id);
  let agentOpen = window.innerWidth > 1280;
  const toggleAgent = () => {
    agent.hidden = !agentOpen;
    panel.classList.toggle('is-agent-closed', !agentOpen);
    assistantToggle.setAttribute('aria-expanded', String(agentOpen));
    assistantToggle.textContent = agentOpen
      ? '\u6536\u8d77\u667a\u80fd\u4f53'
      : '\u667a\u80fd\u4f53\u9762\u677f';
  };
  assistantToggle.onclick = () => {
    agentOpen = !agentOpen;
    toggleAgent();
  };
  agent.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      agentOpen = false;
      toggleAgent();
      assistantToggle.focus();
    }
  });
  toggleAgent();
  nav.setAttribute('aria-label', '\u7f16\u5199\u4efb\u52a1');
  const title = text('h2', ''),
    meta = text('p', '', 'muted'),
    tabs = text('div', '', 'writing-versions'),
    body = text('div', '', 'markdown-body'),
    gaps = text('details', '', 'writing-material-gaps'),
    versionHistory = text('details', '', 'writing-history');
  versionHistory.append(text('summary', '\u5386\u53f2\u7248\u672c'));
  const documentBar = text('div', '', 'writing-document-bar'),
    readingMode = text('button', '\u8fde\u7eed\u9605\u8bfb'),
    edit = text('button', '\u8865\u5145\u4fee\u6539'),
    selectedToAI = text('button', '\u9009\u4e2d\u6587\u5b57\u4ea4\u7ed9 AI'),
    editTools = text('div', '', 'chapter-editor-tools'),
    saveEdit = text('button', '\u4fdd\u5b58\u4fee\u6539', 'primary'),
    cancelEdit = text('button', '\u53d6\u6d88\u4fee\u6539'),
    editState = text('span', '', 'chapter-edit-state');
  documentBar.append(readingMode, selectedToAI, edit);
  editTools.hidden = true;
  editTools.setAttribute('role', 'toolbar');
  editTools.setAttribute('aria-label', '\u6b63\u6587\u6392\u7248');
  for (const [action, label] of [
    ['undo', '\u64a4\u9500'], ['redo', '\u91cd\u505a'], ['paragraph', '\u6b63\u6587'],
    ['h2', '\u6807\u9898'], ['h3', '\u5b50\u6807\u9898'], ['bold', '\u7c97\u4f53'],
    ['italic', '\u659c\u4f53'], ['bullet', '\u9879\u76ee\u7b26\u53f7'],
    ['ordered', '\u7f16\u53f7'], ['table', '\u8868\u683c'],
    ['row', '\u52a0\u884c'], ['column', '\u52a0\u5217'],
  ]) {
    const button = text('button', label);
    button.onmousedown = (event) => event.preventDefault();
    button.onclick = () => chapterEditor?.command(action);
    editTools.append(button);
  }
  editTools.append(editState, cancelEdit, saveEdit);
  viewer.append(title, meta, documentBar, tabs, editTools, body, versionHistory);
  const agentTitle = text('h2', '\u672c\u7ae0\u7f16\u5199\u4efb\u52a1'),
    agentContext = text('div', '', 'writing-chapter-context');
  agent.append(
    text('p', '\u4e0e\u667a\u80fd\u4f53\u534f\u4f5c', 'section-label'),
    agentTitle,
    agentContext,
    gaps,
  );
  const instruction = document.createElement('textarea');
  instruction.maxLength = 4000;
  instruction.rows = 5;
  instruction.placeholder =
    '\u4f8b\u5982\uff1a\u5b9e\u65bd\u6b65\u9aa4\u592a\u7c97\uff0c\u8865\u5145\u8d23\u4efb\u5206\u5de5\u548c\u9a8c\u6536\u6807\u51c6\uff0c\u4fdd\u7559\u5df2\u6709\u54cd\u5e94\u6307\u6807\u3002';
  instruction.setAttribute('aria-label', '\u672c\u7ae0\u91cd\u5199\u8981\u6c42');
  let instructionRevision = 0,
    instructionNotes = {};
  const oldNotes = await bridge.request('GET', '/documents/bid_writing_notes');
  if (oldNotes.ok) {
    instructionNotes = JSON.parse(oldNotes.body.markdown);
    instructionRevision = oldNotes.body.revision;
  }
  const instructionSave = autoSave(
    async () => {
      const r = await bridge.request('PUT', '/documents/bid_writing_notes', {
        markdown: JSON.stringify(instructionNotes),
        revision: instructionRevision,
      });
      if (!r.ok) throw new Error(r.error?.message || 'Instruction save conflict');
      instructionRevision = r.body.revision;
    },
    {
      onState: (state, e) => {
        if (state === 'error') status.textContent = e.message;
      },
    },
  );
  instruction.oninput = () => {
    if (selected) {
      instructionNotes[selected] = instruction.value;
      instructionSave.change();
    }
  };
  const rewrite = text('button', '\u8ba9\u667a\u80fd\u4f53\u91cd\u5199\u672c\u7ae0', 'primary'),
    adopt = text('button', '\u91c7\u7528\u65b0\u7a3f', 'primary'),
    discard = text('button', '\u4fdd\u7559\u539f\u7a3f'),
    retry = text('button', '\u91cd\u8bd5\u672c\u7ae0');
  const agentNote = text(
    'p',
    '\u91cd\u5199\u4f1a\u5148\u751f\u6210\u5019\u9009\u7a3f\uff0c\u786e\u8ba4\u540e\u624d\u66ff\u6362\u672c\u7ae0\u3002\u539f\u7a3f\u4f1a\u4fdd\u7559\u4e3a\u5386\u53f2\u7248\u672c\u3002',
    'muted',
  );
  agent.append(instruction, rewrite, adopt, discard, retry, agentNote);
  const evidenceBox = text('section', '', 'writing-evidence');
  evidenceBox.setAttribute('aria-label', '\u672c\u7ae0\u4f01\u4e1a\u8bc1\u636e');
  const evidenceTitle = text('h3', '\u672c\u7ae0\u4f01\u4e1a\u8bc1\u636e'),
    evidenceStatus = text('p', '', 'writing-evidence-status'),
    evidenceList = text('div', '', 'writing-evidence-list'),
    manageEvidence = text('button', '\u6574\u7406\u4f01\u4e1a\u8bc1\u636e'),
    rewriteEvidence = text('button', '\u8865\u8d44\u6599\u540e\u91cd\u5199\u672c\u7ae0');
  evidenceBox.append(evidenceTitle, evidenceStatus, evidenceList, manageEvidence, rewriteEvidence);
  agent.append(evidenceBox);
  const review = text(
    'p',
    '\u751f\u6210\u5185\u5bb9\u4e3a\u5f85\u5ba1\u6838\u8349\u7a3f\u3002\u6d4f\u89c8\u5668\u9884\u89c8\u4e0d\u4ee3\u8868 Word \u6700\u7ec8\u9875\u754c\uff1b\u7f3a\u5931\u8d44\u6599\u9700\u8981\u8865\u5145\u540e\u590d\u6838\u3002',
    'writing-boundary',
  );
  const maintenance = document.createElement('details');
  maintenance.className = 'writing-maintenance';
  maintenance.append(
    text('summary', '\u66f4\u65b0\u89c4\u5212\u540e\u91cd\u5efa\u7f16\u5199\u6279\u6b21'),
  );
  const reset = text(
    'button',
    '\u6309\u6700\u65b0\u786e\u8ba4\u76ee\u5f55\u65b0\u5efa\u6279\u6b21',
  );
  maintenance.append(
    text(
      'p',
      '\u65e7\u6279\u6b21\u5f52\u6863\uff0c\u5df2\u6709\u6b63\u6587\u4fdd\u7559\uff0c\u4e0d\u4f1a\u81ea\u52a8\u8986\u76d6\u3002',
    ),
    reset,
  );
  layout.append(nav, viewer, agent);
  panel.append(hero, toolbar, status, layout, review, maintenance);
  let selected,
    showCandidate = true,
    busy = false,
    sourceError = '',
    actionError = '',
    timer,
    visible = false,
    lastMarkdown,
    historyView;
  let chapterEditor = null,
    editBase = null,
    editBody = '',
    continuous = true;
  const dirtyEdit = () => editBase && editBody !== editBase.body;
  const leaveEdit = () => {
    chapterEditor?.destroy();
    chapterEditor = null;
    editBase = null;
    delete document.documentElement.dataset.unsaved;
    editTools.hidden = true;
    lastMarkdown = undefined;
  };
  readingMode.onclick = () => {
    continuous = !continuous;
    historyView = undefined;
    showCandidate = false;
    render();
  };
  edit.onclick = async () => {
    if (busy || editBase) return;
    const chapter = run.draft?.chapters.find((row) => row.id === selected);
    if (!chapter) return;
    busy = true;
    render();
    try {
      const { createChapterEditor } = await import('./vendor-editor.mjs');
      editBase = { id: selected, body: chapter.body };
      editBody = chapter.body;
      continuous = false;
      showCandidate = false;
      historyView = undefined;
      clearTimeout(timer);
      const host = text('div', '', 'chapter-editor');
      body.replaceChildren(host);
      chapterEditor = createChapterEditor(host, chapter.body, (value) => {
        editBody = value;
        document.documentElement.dataset.unsaved = String(!!dirtyEdit());
        editState.textContent = '\u4fee\u6539\u5f85\u4fdd\u5b58';
      });
      editTools.hidden = false;
      editState.textContent = '\u652f\u6301\u9009\u62e9\u3001\u7c98\u8d34\u548c Ctrl+Z';
      chapterEditor.focus();
    } catch (e) {
      actionError = e.message;
      leaveEdit();
    } finally {
      busy = false;
      render();
    }
  };
  cancelEdit.onclick = () => {
    leaveEdit();
    render();
    schedule();
  };
  saveEdit.onclick = () => {
    if (!editBase) return;
    const base = { ...editBase }, value = editBody;
    return act(async () => {
      await run.saveHumanChapter(base.id, base.body, value);
      leaveEdit();
      await onDraftSaved();
    });
  };
  selectedToAI.onmousedown = (event) => event.preventDefault();
  selectedToAI.onclick = () => {
    const selection = window.getSelection(),
      quote = chapterEditor?.selectedText() || selection?.toString() || '',
      source = selection?.anchorNode?.parentElement?.closest('[data-chapter]')?.dataset.chapter;
    if (!quote.trim()) {
      status.textContent = '\u5148\u9009\u4e2d\u6b63\u6587\u4e2d\u7684\u6587\u5b57\uff0c\u518d\u544a\u8bc9 AI \u5982\u4f55\u4fee\u6539\u3002';
      return;
    }
    if (source && source !== selected && !editBase) { selected = source; render(); }
    instruction.value = '\u8bf7\u4fee\u6539\u4ee5\u4e0b\u5185\u5bb9\uff1a\n' + quote.slice(0, 3000) + '\n\n\u4fee\u6539\u8981\u6c42\uff1a';
    instructionNotes[selected] = instruction.value;
    instructionSave.change();
    agentOpen = true;
    toggleAgent();
    instruction.focus();
  };
  window.addEventListener('beforeunload', (event) => {
    if (dirtyEdit()) { event.preventDefault(); event.returnValue = ''; }
  });
  document.addEventListener('bid.unsaved', () => {
    status.textContent = '\u5f53\u524d\u6b63\u6587\u4fee\u6539\u5c1a\u672a\u4fdd\u5b58\uff0c\u8bf7\u5148\u4fdd\u5b58\u6216\u53d6\u6d88\u3002';
    status.scrollIntoView({ block: 'center' });
  });
  document.addEventListener('keydown', (event) => {
    if (editBase && (event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') {
      event.preventDefault();
      saveEdit.click();
    }
  });
  let evidenceKey = '',
    evidenceSequence = 0;
  const currentEvidence = new Map();
  const labels = {
    pending: '\u5f85\u7f16\u5199',
    submitting: '\u6b63\u5728\u63d0\u4ea4',
    running: '\u6b63\u5728\u7f16\u5199',
    candidate: '\u65b0\u7a3f\u5f85\u786e\u8ba4',
    done: '\u8349\u7a3f\u5df2\u4fdd\u5b58',
    error: '\u9700\u8981\u5904\u7406',
  };
  const items = () =>
    run.value?.items || run.plan?.value.outline.map((c) => ({ ...c, state: 'pending' })) || [];
  async function read() {
    sourceError = '';
    try {
      await run.sources();
      if (run.value?.jobId) await run.step();
      if (
        run.complete &&
        workflow.records?.chapters?.startedAt &&
        !workflow.records.chapters.completedAt
      ) {
        const at = await run.completionTime();
        if (at) await workflow.mark('chapters', true, false, at);
      }
      currentEvidence.clear();
      for (const row of items()) {
        try {
          currentEvidence.set(row.id, await run.evidenceFor(row.id));
        } catch (e) {
          currentEvidence.set(row.id, { error: e.message });
        }
      }
    } catch (e) {
      sourceError = e.message;
    }
    render();
  }
  function renderEvidence(item, viewingHistory) {
    const candidate = !viewingHistory && showCandidate && item?.candidate,
      ref = viewingHistory
        ? historyView.evidenceRef
        : candidate
          ? item.inputEvidenceRef
          : item?.evidenceRef,
      usage = viewingHistory
        ? historyView.usedEvidence || []
        : candidate
          ? item.candidate.usedEvidence || []
          : item?.usedEvidence || [],
      latest = currentEvidence.get(item?.id),
      key = JSON.stringify([item?.id, ref, usage, latest, viewingHistory, !!candidate]);
    rewriteEvidence.disabled = rewrite.disabled;
    manageEvidence.disabled = busy;
    if (key === evidenceKey) return;
    evidenceKey = key;
    const sequence = ++evidenceSequence;
    evidenceList.replaceChildren();
    if (latest?.error) {
      evidenceStatus.textContent = latest.error;
      return;
    }
    evidenceStatus.textContent = viewingHistory
      ? '\u5386\u53f2\u7a3f\u4f7f\u7528\u7684\u8bc1\u636e'
      : candidate
        ? '\u672c\u6b21\u5019\u9009\u56fa\u5b9a\u7684\u8bc1\u636e'
        : ref
          ? '\u5f53\u524d\u6b63\u6587\u4f7f\u7528\u7684\u8bc1\u636e'
          : '\u4e0b\u6b21\u7f16\u5199\u53ef\u7528\u7684\u8bc1\u636e\uff0c\u5c1a\u672a\u5199\u5165\u672c\u7ae0';
    if (ref && latest && ref.digest !== latest.digest && !viewingHistory)
      evidenceStatus.textContent += ' \u00b7 \u8d44\u6599\u6216\u91c7\u7eb3\u5df2\u66f4\u65b0';
    void (async () => {
      const snapshot = ref ? await readChapterEvidence(bridge, ref) : latest;
      if (sequence !== evidenceSequence) return;
      if (!snapshot) {
        evidenceList.append(
          text(
            'p',
            '\u65e7\u7ae0\u8282\u672a\u8bb0\u5f55\u4f01\u4e1a\u5f15\u7528\uff1b\u4e0d\u8865\u9020\u5386\u53f2\u6765\u6e90\u3002',
          ),
        );
        return;
      }
      const used = new Map(usage.map((u) => [u.factId, u.quote]));
      evidenceList.append(
        text(
          'p',
          snapshot.facts.length +
            ' \u6761\u53ef\u7528\u4e8b\u5b9e \u00b7 ' +
            used.size +
            ' \u6761\u6a21\u578b\u58f0\u660e\u5df2\u5f15\u7528',
          'muted',
        ),
      );
      for (const fact of [...snapshot.facts, ...snapshot.cautions]) {
        const box = text('details', '', 'writing-evidence-fact'),
          label = text(
            'summary',
            (used.has(fact.id)
              ? '\u5df2\u5f15\u7528'
              : fact.flags.length
                ? '\u4ec5\u4f9b\u6838\u5bf9'
                : '\u672c\u7ae0\u5019\u9009') +
              ' \u00b7 ' +
              fact.subject +
              ' / ' +
              fact.attribute,
          );
        box.append(
          label,
          text(
            'p',
            fact.source.name +
              ' \u00b7 v' +
              fact.source.version +
              ' / ' +
              (fact.location?.page
                ? '\u7b2c ' + fact.location.page + ' \u9875'
                : '\u7ed3\u6784\u5757 ' + (fact.unit + 1)),
          ),
          text('blockquote', fact.quote),
        );
        if (used.has(fact.id))
          box.append(
            text('strong', '\u6b63\u6587\u4f7f\u7528\u4f4d\u7f6e'),
            text('blockquote', used.get(fact.id)),
          );
        if (fact.decision.note)
          box.append(text('p', '\u64cd\u4f5c\u4eba\u5458\u8bf4\u660e\uff1a' + fact.decision.note));
        const source = text('button', '\u56de\u770b\u8be5\u7248\u539f\u6587'),
          sourceText = text('pre', '', 'writing-evidence-source');
        sourceText.hidden = true;
        source.onclick = async () => {
          try {
            const r = await bridge.request(
              'GET',
              '/readings/' + fact.source.readingId + '/units/' + fact.unit,
            );
            if (!r.ok) throw new Error(r.error?.message || 'Saved source unavailable');
            sourceText.textContent =
              r.body.text +
              '\n' +
              (r.body.tables || [])
                .map((t) =>
                  t.rows
                    .map((row) => row.map((v) => v ?? '\u5408\u5e76\u4f4d\u7f6e').join(' | '))
                    .join('\n'),
                )
                .join('\n');
            sourceText.hidden = false;
          } catch (e) {
            sourceText.textContent = e.message;
            sourceText.hidden = false;
          }
        };
        box.append(source, sourceText);
        evidenceList.append(box);
      }
      const missing = snapshot.requirements.filter((r) => r.status === 'gap');
      if (missing.length) {
        const section = text('details', '', 'writing-evidence-gaps');
        section.append(
          text(
            'summary',
            '\u8bc1\u660e\u7f3a\u53e3\u6216\u5f85\u6838\u5bf9\uff08' + missing.length + '\uff09',
          ),
        );
        for (const gap of missing)
          section.append(text('p', gap.text), text('small', gap.reasons.join('\uff1b')));
        evidenceList.append(section);
      }
      if (snapshot.state !== 'ready')
        evidenceList.append(
          text(
            'p',
            '\u672a\u4f7f\u7528\u65e7\u63a8\u8350\u8bc1\u660e\u4f01\u4e1a\u80fd\u529b\u3002\u53ef\u6574\u7406\u8bc1\u636e\u540e\u5355\u7ae0\u91cd\u5199\uff0c\u5f53\u524d\u8349\u7a3f\u7ee7\u7eed\u4fdd\u7559\u3002',
            'muted',
          ),
        );
    })().catch((e) => {
      if (sequence === evidenceSequence) evidenceStatus.textContent = e.message;
    });
  }
  function render() {
    const rows = items();
    selected = rows.some((i) => i.id === selected) ? selected : rows[0]?.id;
    const item = rows.find((i) => i.id === selected),
      chapter = run.draft?.chapters.find((c) => c.id === selected);
    const done = rows.filter((i) => i.state === 'done').length;
    progress.textContent = done + ' / ' + rows.length + ' \u7ae0\u8349\u7a3f\u5df2\u4fdd\u5b58';
    nav.replaceChildren();
    if (instruction.dataset.chapter !== selected) {
      instruction.dataset.chapter = selected || '';
      instruction.value = instructionNotes[selected] || '';
    }
    const planned = run.plan?.value.outline.find((c) => c.id === selected);
    agentTitle.textContent = chapter?.body
      ? '\u8fd9\u4e00\u7ae0\uff0c\u8fd8\u53ef\u4ee5\u600e\u4e48\u6539'
      : '\u672c\u7ae0\u7f16\u5199\u4efb\u52a1';
    agentContext.replaceChildren();
    if (planned) {
      if (planned.purpose) agentContext.append(text('p', planned.purpose));
      agentContext.append(
        text(
          'small',
          '\u54cd\u5e94 ' + planned.requirementIds.length + ' \u9879\u5df2\u786e\u8ba4\u9700\u6c42',
        ),
      );
    }
    for (const [index, row] of rows.entries()) {
      const b = text('button', '', 'writing-chapter');
      b.setAttribute('aria-current', String(row.id === selected));
      b.append(
        text('span', String(index + 1).padStart(2, '0')),
        text('strong', row.title),
        text('small', labels[row.state]),
      );
      b.onclick = () => {
        if (editBase) {
          status.textContent = '\u8bf7\u5148\u4fdd\u5b58\u6216\u53d6\u6d88\u5f53\u524d\u4fee\u6539\u3002';
          return;
        }
        selected = row.id;
        showCandidate = !!row.candidate;
        historyView = undefined;
        render();
        body.querySelector('[data-chapter="' + row.id + '"]')?.scrollIntoView({ block: 'start', behavior: 'smooth' });
      };
      nav.append(b);
    }
    title.textContent = item?.title || '\u5148\u786e\u8ba4\u7f16\u5199\u89c4\u5212';
    meta.textContent = item
      ? labels[item.state] + ' \u00b7 ' + (chapter?.body.length || 0) + ' \u5b57 \u00b7 Markdown'
      : '\u4ece\u5df2\u786e\u8ba4\u7684\u76ee\u5f55\u5f00\u59cb\uff0c\u667a\u80fd\u4f53\u5c06\u81ea\u52a8\u5b89\u6392\u5206\u7ae0\u7f16\u5199\u3002';
    tabs.replaceChildren();
    if (item?.candidate) {
      for (const [label, value] of [
        ['\u539f\u7a3f', false],
        ['\u65b0\u7a3f', true],
      ]) {
        const b = text('button', label);
        b.setAttribute('aria-pressed', String(showCandidate === value));
        b.onclick = () => {
          showCandidate = value;
          historyView = undefined;
          render();
        };
        tabs.append(b);
      }
    }
    const viewingHistory = !!historyView && historyView.chapterId === selected;
    const markdown = viewingHistory
      ? historyView.body
      : showCandidate && item?.candidate
        ? item.candidate.markdown
        : chapter?.body;
    const manuscript = continuous && !viewingHistory && !(showCandidate && item?.candidate) && !editBase;
    readingMode.textContent = manuscript ? '\u5355\u7ae0\u9605\u8bfb' : '\u8fde\u7eed\u9605\u8bfb';
    readingMode.disabled = !!editBase;
    edit.hidden = !!editBase || viewingHistory || !!(showCandidate && item?.candidate);
    edit.disabled = busy || !chapter || ['submitting', 'running', 'candidate'].includes(item?.state);
    saveEdit.disabled = busy;
    cancelEdit.disabled = busy;
    if (viewingHistory) {
      const back = text('button', '\u8fd4\u56de\u5f53\u524d\u7a3f');
      back.onclick = () => {
        historyView = undefined;
        render();
      };
      tabs.append(back);
    }
    const documentKey = manuscript ? JSON.stringify(run.draft?.chapters) : markdown;
    if (editBase) {
      // Polling and status renders must never replace the editor DOM or selection.
    } else if (manuscript && run.draft?.chapters.length) {
      if (documentKey !== lastMarkdown) {
        body.replaceChildren();
        for (const saved of run.draft.chapters) {
          const section = text('section', '', 'writing-manuscript-chapter'), content = text('div');
          section.dataset.chapter = saved.id;
          section.append(text('h2', saved.title), content);
          renderMarkdown(content, saved.body);
          if (/^H[12]$/.test(content.firstElementChild?.tagName || '') && content.firstElementChild.textContent.trim() === saved.title.trim())
            content.firstElementChild.remove();
          body.append(section);
        }
        lastMarkdown = documentKey;
      }
      title.textContent = '\u6807\u4e66\u6b63\u6587';
    } else if (markdown) {
      if (documentKey !== lastMarkdown) {
        renderMarkdown(body, markdown);
        lastMarkdown = markdown;
      }
    } else {
      lastMarkdown = undefined;
      body.replaceChildren(
        text(
          'div',
          item?.state === 'running'
            ? '\u667a\u80fd\u4f53\u6b63\u5728\u7ec4\u7ec7\u672c\u7ae0\u5185\u5bb9\uff0c\u5b8c\u6210\u540e\u4f1a\u81ea\u52a8\u4fdd\u5b58\u3002'
            : '\u6b63\u6587\u5c06\u7531\u667a\u80fd\u4f53\u751f\u6210\u3002\u65e0\u9700\u5728\u8fd9\u91cc\u624b\u52a8\u8d77\u8349\u3002',
          'writing-empty',
        ),
      );
    }
    if (item)
      meta.textContent =
        (manuscript ? '\u8fde\u7eed\u9605\u8bfb \u00b7 ' + run.draft.chapters.length + ' \u7ae0' : viewingHistory ? '\u5386\u53f2\u7248\u672c\uff08\u53ea\u8bfb\uff09' : labels[item.state]) +
        ' \u00b7 ' +
        (manuscript ? run.draft.chapters.reduce((total, row) => total + row.body.length, 0) : markdown?.length || 0) +
        ' \u5b57';
    gaps.replaceChildren();
    const missing =
      (showCandidate && item?.candidate ? item.candidate.materialGaps : item?.materialGaps) || [];
    if (missing.length) {
      gaps.append(text('summary', '\u5f85\u8865\u8d44\u6599\uff08' + missing.length + '\uff09'));
      for (const gap of missing) gaps.append(text('p', gap));
    }
    gaps.hidden = !missing.length;
    const active = rows.find((i) => ['submitting', 'running'].includes(i.state));
    const candidate = rows.find((i) => i.state === 'candidate');
    start.disabled =
      busy || !!sourceError || run.complete || !!candidate || rows.some((i) => i.state === 'error');
    start.textContent = run.complete
      ? '\u672c\u6279\u8349\u7a3f\u5df2\u5b8c\u6210'
      : run.value
        ? '\u7ee7\u7eed\u7f16\u5199'
        : '\u5f00\u59cb\u5206\u7ae0\u7f16\u5199';
    pause.disabled = busy || !run.value || run.value.paused;
    start.hidden = run.complete;
    pause.hidden = !run.value || run.value.paused || run.complete;
    refresh.disabled = busy;
    rewrite.disabled = busy || !!editBase || !!sourceError || !chapter?.body || !!active || !!candidate;
    instruction.disabled = busy || !!sourceError;
    adopt.textContent = item?.reviewTaskId
      ? '\u67e5\u770b\u5e76\u786e\u8ba4\u91c7\u7528'
      : item?.reviewAccepted
        ? '\u7ee7\u7eed\u4fdd\u5b58\u5df2\u786e\u8ba4\u7a3f'
        : '\u91c7\u7528\u65b0\u7a3f';
    discard.textContent = item?.reviewTaskId
      ? '\u67e5\u770b\u5904\u7406\u9009\u9879'
      : '\u4fdd\u7559\u539f\u7a3f';
    adopt.hidden = item?.state !== 'candidate';
    discard.hidden = item?.state !== 'candidate' && !(item?.state === 'error' && item.candidate);
    adopt.disabled = busy || !!editBase || !!sourceError;
    discard.disabled = busy || !!editBase;
    retry.hidden = item?.state !== 'error';
    retry.disabled = busy || !!sourceError;
    reset.disabled = busy || !!editBase || !!active || !!candidate;
    start.disabled ||= !!editBase;
    refresh.disabled ||= !!editBase;
    renderEvidence(item, viewingHistory);
    if (run.value?.backgroundError) status.textContent = run.value.backgroundError;
    else if (sourceError || actionError)
      status.textContent = '\u65e0\u6cd5\u7ee7\u7eed\uff1a' + (sourceError || actionError);
    else if (active?.runtimeState === 'waiting_human')
      status.textContent = active.waitingOn?.includes('verification_review')
        ? '\u672c\u7ae0\u5df2\u751f\u6210\uff0c\u8bf7\u5728\u5f85\u529e\u4e2d\u67e5\u770b\u6a21\u578b\u6821\u9a8c\u7ed3\u679c\u5e76\u786e\u8ba4\u8349\u7a3f\u3002'
        : '\u7b49\u5f85\u6388\u6743\uff1a\u8bf7\u5728\u5f85\u529e\u4e2d\u786e\u8ba4\u672c\u7ae0\u8d44\u6599\u7684\u6a21\u578b\u4f7f\u7528\u3002';
    else if (active)
      status.textContent =
        (run.value.paused ? '\u5df2\u6682\u505c\u540e\u7eed\u8c03\u5ea6\uff1b' : '') +
        '\u667a\u80fd\u4f53\u6b63\u5728\u7f16\u5199\uff1a' +
        active.title;
    else if (candidate)
      status.textContent =
        '\u65b0\u7a3f\u5df2\u751f\u6210\uff0c\u539f\u7a3f\u4fdd\u6301\u4e0d\u53d8\u3002\u67e5\u770b\u540e\u9009\u62e9\u91c7\u7528\u6216\u4fdd\u7559\u539f\u7a3f\u3002';
    else if (run.complete)
      status.textContent =
        '\u672c\u6279\u7ae0\u8282\u8349\u7a3f\u5df2\u751f\u6210\u5e76\u4fdd\u5b58\uff0c\u8bf7\u7ee7\u7eed\u5ba1\u6838\u4fee\u8ba2\u3002';
    else if (rows.some((i) => i.state === 'error'))
      status.textContent = rows.find((i) => i.state === 'error').error;
    else
      status.textContent = run.value?.paused
        ? '\u5df2\u6682\u505c\uff0c\u5df2\u751f\u6210\u5185\u5bb9\u4e0e\u8fdb\u5ea6\u5747\u5df2\u4fdd\u5b58\u3002'
        : '\u5c31\u7eea\uff1a\u6309\u5df2\u786e\u8ba4\u76ee\u5f55\u5206\u7ae0\u751f\u6210\u3002\u6bcf\u7ae0\u4e00\u6b21\u6a21\u578b\u4efb\u52a1\uff0c\u907f\u514d\u5168\u6587\u53cd\u590d\u5360\u7528\u4e0a\u4e0b\u6587\u3002';
    const chapterState = run.complete
      ? 'complete'
      : run.value
        ? 'active'
        : run.draft?.chapters.length
          ? 'active'
          : 'pending';
    if (workflow.states.chapters !== chapterState) {
      workflow.states.chapters = chapterState;
      workflow.emit();
    }
    versionHistory.hidden = !item?.history?.length;
    versionHistory.replaceChildren(
      text('summary', '\u5386\u53f2\u7248\u672c\uff08' + (item?.history?.length || 0) + '\uff09'),
    );
    for (const [i, id] of (item?.history || []).entries()) {
      const b = text('button', '\u67e5\u770b\u66ff\u6362\u524d\u7248\u672c ' + (i + 1));
      b.onclick = async () => {
        if (editBase) return;
        try {
          const r = await bridge.request('GET', '/documents/' + id);
          if (!r.ok) throw new Error('History unavailable');
          const saved = JSON.parse(r.body.markdown);
          if (typeof saved.body !== 'string') throw new Error('Invalid history');
          historyView = {
            chapterId: item.id,
            body: saved.body,
            evidenceRef: saved.evidenceRef,
            usedEvidence: saved.usedEvidence,
          };
          render();
        } catch (e) {
          status.textContent = e.message;
        }
      };
      versionHistory.append(b);
    }
  }
  async function exclusive(fn) {
    if (navigator.locks)
      return navigator.locks.request(
        'bid-writing:' + project.body.projectId,
        { ifAvailable: true },
        (lock) => {
          if (!lock) throw new Error('Another window is handling writing; use one active window');
          return fn();
        },
      );
    return fn();
  }
  async function act(fn) {
    if (busy) return;
    busy = true;
    actionError = '';
    render();
    try {
      await exclusive(async () => {
        await run.load();
        await fn();
      });
      await read();
    } catch (e) {
      actionError =
        e.status === 409
          ? '\u8fdb\u5ea6\u5df2\u5728\u53e6\u4e00\u7a97\u53e3\u66f4\u65b0\uff0c\u8bf7\u5237\u65b0\u540e\u7ee7\u7eed\u3002'
          : e.message;
    } finally {
      busy = false;
      render();
      schedule();
    }
  }
  async function pump() {
    timer = null;
    if (busy || !visible || editBase) return;
    schedule();
    if (
      !run.value ||
      (run.value.paused &&
        !run.value.items.some(
          (i) => ['running', 'submitting'].includes(i.state) || i.reviewTaskId || i.reviewAccepted,
        ))
    )
      return;
    await act(async () => {
      const before = run.draft?.revision;
      await run.step();
      if (run.complete) await workflow.mark('chapters', true, false, run.background.job?.updatedAt);
      if (run.draft?.revision !== before) await onDraftSaved();
    });
  }
  function schedule() {
    clearTimeout(timer);
    const v = run.value;
    if (
      visible && !editBase &&
      v &&
      (v.items.some(
        (i) => ['submitting', 'running'].includes(i.state) || i.reviewTaskId || i.reviewAccepted,
      ) ||
        (!v.paused &&
          !run.complete &&
          !v.items.some((i) => ['candidate', 'error'].includes(i.state))))
    )
      timer = setTimeout(pump, 2200);
  }
  start.onclick = () =>
    act(async () => {
      await run.start();
      await workflow.mark('chapters');
      await run.step();
    });
  pause.onclick = () => act(() => run.pause());
  refresh.onclick = () => act(() => read());
  rewrite.onclick = () => {
    const id = selected,
      brief = instruction.value;
    return act(async () => {
      await instructionSave.flush();
      await run.rewrite(id, brief);
      await workflow.mark('chapters');
      await run.step();
    });
  };
  adopt.onclick = () => {
    const id = selected;
    return act(async () => {
      await run.accept(id);
      await onDraftSaved();
      if (run.complete) await workflow.mark('chapters', true, false, run.background.job?.updatedAt);
    });
  };
  discard.onclick = () => {
    const id = selected;
    return act(() => run.discard(id));
  };
  retry.onclick = () => {
    const id = selected;
    return act(() => run.retry(id));
  };
  reset.onclick = () => act(() => run.reset());
  manageEvidence.onclick = () => window.dispatchEvent(new Event('bid.evidence.open'));
  rewriteEvidence.onclick = () => {
    const id = selected,
      brief = instruction.value;
    return act(async () => {
      await instructionSave.flush();
      await run.rewriteWithEvidence(id, brief);
      await workflow.mark('chapters');
      await run.step();
    });
  };
  bridge.onStage((section) => {
    const next = section === 'chapters';
    if (next === visible) return;
    visible = next;
    if (visible) void act(() => read());
    else clearTimeout(timer);
  });
  window.addEventListener('pagehide', () => {
    clearTimeout(timer);
    void instructionSave.flush().catch(() => {});
  });
  await read();
  return { run, panel, render };
}
