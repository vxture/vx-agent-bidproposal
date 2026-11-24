/**
 * @package @bidproposal/workbench
 * @layer Presentation
 * @category BusinessUi
 * @author AI-Generated
 * @date 2026-11-25
 */
import { ReviewSession } from './review.mjs';
import { WritingSession } from './writing.mjs';
import { autoSave } from './autosave.mjs';
import { checked } from './background.mjs';
import { renderMarkdown } from './markdown-view.mjs';
import { reviewFact } from './evidence-review.mjs';
export async function mountReview(bridge, workflow) {
  const el = (tag, value = '', cls = '') => {
    const n = document.createElement(tag);
    n.textContent = value;
    n.className = cls;
    return n;
  };
  const run = new ReviewSession(bridge);
  await run.load();
  const writer = new WritingSession(bridge);
  writer.backgroundEnabled = true;
  await writer.load();
  const panel = el('section', '', 'review-studio');
  panel.id = 'review-panel';
  panel.hidden = true;
  document.querySelector('main').append(panel);
  const hero = el('div', '', 'review-hero');
  hero.append(
    el('p', 'AGENT / \u5ba1\u6838\u4fee\u8ba2', 'section-label'),
    el('h1', '\u8ba9\u6bcf\u4e00\u9879\u54cd\u5e94\uff0c\u7ecf\u5f97\u8d77\u6838\u5bf9'),
    el(
      'p',
      '\u667a\u80fd\u4f53\u9010\u7ae0\u6838\u5bf9\u9700\u6c42\u3001\u6307\u6807\u548c\u4e8b\u5b9e\u4f9d\u636e\uff0c\u6574\u7406\u95ee\u9898\u5e76\u63d0\u51fa\u4fee\u8ba2\u3002\u4f60\u51b3\u5b9a\u54ea\u4e9b\u5efa\u8bae\u8fdb\u5165\u6b63\u6587\u3002',
      'muted',
    ),
  );
  const toolbar = el('div', '', 'review-toolbar'),
    progress = el('strong'),
    start = el('button', '\u5f00\u59cb\u667a\u80fd\u5ba1\u6838', 'primary'),
    refresh = el('button', '\u5237\u65b0\u7ed3\u679c'),
    pause = el('button', '\u6682\u505c\u540e\u7eed\u5ba1\u6838'),
    toggle = el('button', '\u667a\u80fd\u4f53\u9762\u677f', 'review-toggle');
  toolbar.append(progress, start, pause, refresh, toggle);
  const status = el('p', '', 'review-status');
  status.setAttribute('role', 'status');
  const layout = el('div', '', 'review-layout'),
    nav = el('div', '', 'review-findings'),
    viewer = el('article', '', 'review-detail'),
    agent = el('aside', '', 'review-agent');
  agent.id = 'review-agent';
  toggle.setAttribute('aria-controls', agent.id);
  const intro = el('div', '', 'review-empty');
  intro.append(
    el('span', '01 \u2014 \u9700\u6c42\u5230\u6b63\u6587', 'section-label'),
    el(
      'h2',
      '\u5148\u53d1\u73b0\u95ee\u9898\uff0c\u518d\u4ea4\u7ed9\u667a\u80fd\u4f53\u4fee\u8ba2',
    ),
    el(
      'p',
      '\u4ece\u5df2\u4fdd\u5b58\u7684\u6807\u4e66\u51fa\u53d1\uff0c\u5206\u7ae0\u5ba1\u6838\u5e76\u81ea\u52a8\u4fdd\u7559\u62a5\u544a\u3002\u79bb\u5f00\u5f53\u524d\u9875\u9762\uff0c\u4efb\u52a1\u4ecd\u5728\u540e\u53f0\u6267\u884c\u3002',
    ),
    el(
      'div',
      '\u9700\u6c42\u9057\u6f0f \u00b7 \u6307\u6807\u504f\u5dee \u00b7 \u65e0\u4f9d\u636e\u627f\u8bfa \u00b7 \u524d\u540e\u77db\u76fe',
      'review-scope',
    ),
  );
  const notes = document.createElement('textarea');
  notes.rows = 4;
  notes.maxLength = 4000;
  notes.setAttribute('aria-label', '\u672c\u6b21\u5ba1\u6838\u91cd\u70b9');
  notes.placeholder =
    '\u4f8b\u5982\uff1a\u91cd\u70b9\u68c0\u67e5\u8d44\u683c\u6027\u8981\u6c42\u3001\u670d\u52a1\u54cd\u5e94\u65f6\u95f4\uff0c\u907f\u514d\u65e0\u4f9d\u636e\u7684\u627f\u8bfa\u3002';
  const saved = el('small', '', 'review-save-state');
  let noteRevision = 0;
  const noteDoc = await bridge.request('GET', '/documents/bid_review_notes');
  if (noteDoc.ok) {
    notes.value = noteDoc.body.markdown;
    noteRevision = noteDoc.body.revision;
  }
  const saver = autoSave(
    async () => {
      const r = checked(
        await bridge.request('PUT', '/documents/bid_review_notes', {
          markdown: notes.value,
          revision: noteRevision,
        }),
      );
      noteRevision = r.revision;
    },
    {
      onState: (state, e) => {
        saved.textContent = {
          pending: '\u4fee\u6539\u5f85\u4fdd\u5b58',
          saving: '\u6b63\u5728\u4fdd\u5b58\u2026',
          saved: '\u5ba1\u6838\u91cd\u70b9\u5df2\u81ea\u52a8\u4fdd\u5b58',
          error:
            '\u4fdd\u5b58\u5931\u8d25\uff0c\u8f93\u5165\u4ecd\u4fdd\u7559\uff1a' +
            (e?.message || ''),
        }[state];
      },
    },
  );
  notes.oninput = () => saver.change();
  notes.onblur = () => void saver.flush().catch((e) => (status.textContent = e.message));
  const selectedContext = el('div', '', 'review-agent-context'),
    revisionInput = document.createElement('textarea');
  revisionInput.rows = 4;
  revisionInput.maxLength = 1000;
  revisionInput.setAttribute('aria-label', '\u8865\u5145\u4fee\u8ba2\u8981\u6c42');
  revisionInput.placeholder =
    '\u53ef\u8865\u5145\u4fee\u8ba2\u65b9\u5411\uff1b\u7f3a\u5931\u7684\u4f01\u4e1a\u4e8b\u5b9e\u9700\u8981\u5148\u8865\u8d44\u6599\u3002';
  let revisionNotes = {},
    revisionNotesVersion = 0;
  const priorRevisionNotes = await bridge.request('GET', '/documents/bid_review_revision_notes');
  if (priorRevisionNotes.ok) {
    revisionNotes = JSON.parse(priorRevisionNotes.body.markdown);
    revisionNotesVersion = priorRevisionNotes.body.revision;
  }
  const revisionSaver = autoSave(
    async () => {
      const r = checked(
        await bridge.request('PUT', '/documents/bid_review_revision_notes', {
          markdown: JSON.stringify(revisionNotes),
          revision: revisionNotesVersion,
        }),
      );
      revisionNotesVersion = r.revision;
    },
    {
      onState: (state, e) => {
        if (state === 'error') status.textContent = e.message;
      },
    },
  );
  revisionInput.oninput = () => {
    const id = findingChapter();
    if (id) {
      revisionNotes[id] = revisionInput.value;
      revisionSaver.change();
    }
  };
  const revise = el('button', '\u8ba9\u667a\u80fd\u4f53\u4fee\u8ba2\u672c\u7ae0', 'primary'),
    adopt = el('button', '\u91c7\u7528\u4fee\u8ba2\u7a3f', 'primary'),
    keep = el('button', '\u4fdd\u7559\u5f53\u524d\u7a3f'),
    back = el('button', '\u67e5\u770b\u5f53\u524d\u6b63\u6587'),
    dismiss = el('button', '\u6b64\u9879\u6682\u4e0d\u5904\u7406', 'quiet');
  agent.append(
    el('p', '\u4e0e\u667a\u80fd\u4f53\u534f\u4f5c', 'section-label'),
    el('h2', '\u5ba1\u6838\u91cd\u70b9'),
    notes,
    saved,
    selectedContext,
    revisionInput,
    revise,
    adopt,
    keep,
    back,
    dismiss,
    el(
      'p',
      '\u4fee\u8ba2\u5148\u751f\u6210\u5019\u9009\u7a3f\uff0c\u91c7\u7eb3\u540e\u4fdd\u7559\u539f\u7a3f\u3002\u4fee\u6539\u6b63\u6587\u540e\uff0c\u9700\u8981\u91cd\u65b0\u5ba1\u6838\u3002',
      'muted',
    ),
  );
  const decisionNote = el('textarea');
  decisionNote.maxLength = 1600;
  decisionNote.rows = 3;
  decisionNote.setAttribute('aria-label', '\u5ba1\u6838\u5904\u7406\u8bf4\u660e');
  decisionNote.placeholder =
    '\u8bb0\u5f55\u5904\u7406\u8bf4\u660e\uff0c\u6682\u7f13\u65f6\u5fc5\u586b\uff1b\u8349\u7a3f\u81ea\u52a8\u4fdd\u5b58';
  const reopen = el('button', '\u6062\u590d\u5904\u7406');
  dismiss.before(decisionNote);
  dismiss.after(reopen);
  let decisionDrafts = {},
    decisionDraftRevision = 0;
  const decisionDraft = await bridge.request('GET', '/documents/bid_review_note_drafts');
  if (decisionDraft.ok) {
    decisionDrafts = JSON.parse(decisionDraft.body.markdown);
    decisionDraftRevision = decisionDraft.body.revision;
  }
  const decisionSaver = autoSave(
    async () => {
      const markdown = JSON.stringify(decisionDrafts);
      if (new TextEncoder().encode(markdown).length > 900000)
        throw new Error('Review note storage limit exceeded');
      const d = checked(
        await bridge.request('PUT', '/documents/bid_review_note_drafts', {
          markdown,
          revision: decisionDraftRevision,
        }),
      );
      decisionDraftRevision = d.revision;
    },
    {
      onState: (state, e) => {
        if (state === 'error') status.textContent = e.message;
      },
    },
  );
  decisionNote.oninput = () => {
    if (selected) {
      decisionDrafts[selected] = decisionNote.value;
      decisionSaver.change();
    }
  };
  layout.append(nav, viewer, agent);
  panel.append(hero, toolbar, status, layout);
  let busy = false,
    visible = false,
    timer,
    selected = null,
    showDraft = false,
    showCandidate = true,
    agentOpen = window.innerWidth > 1100,
    actionError = '',
    lastContentKey;
  function agentState() {
    agent.hidden = !agentOpen;
    panel.classList.toggle('is-agent-closed', !agentOpen);
    toggle.textContent = agentOpen
      ? '\u6536\u8d77\u667a\u80fd\u4f53'
      : '\u667a\u80fd\u4f53\u9762\u677f';
    toggle.setAttribute('aria-expanded', String(agentOpen));
  }
  toggle.onclick = () => {
    agentOpen = !agentOpen;
    agentState();
  };
  agentState();
  const severity = {
      blocker: '\u5173\u952e\u95ee\u9898',
      warning: '\u5f85\u4fee\u8ba2',
      info: '\u6539\u8fdb\u5efa\u8bae',
    },
    kind = {
      omission: '\u9700\u6c42\u8986\u76d6',
      metric: '\u6307\u6807\u504f\u5dee',
      unsupported: '\u4e8b\u5b9e\u4f9d\u636e',
      consistency: '\u4e00\u81f4\u6027',
      quality: '\u5185\u5bb9\u8d28\u91cf',
    };
  Object.assign(kind, {
    evidence_missing: '\u4f01\u4e1a\u8bc1\u660e\u7f3a\u5931',
    evidence_expired: '\u8bc1\u660e\u6709\u6548\u671f',
    evidence_conflict: '\u8d44\u6599\u51b2\u7a81',
    evidence_mismatch: '\u9648\u8ff0\u4e0e\u8bc1\u636e\u4e0d\u7b26',
    evidence_changed: '\u8d44\u6599\u5df2\u66f4\u65b0',
    cross_chapter: '\u8de8\u7ae0\u9648\u8ff0\u4e0d\u4e00\u81f4',
  });
  function sourcesFor(finding, report) {
    if (!report?.enterpriseAudit) return;
    const audit = report.enterpriseAudit,
      ids = finding.evidenceIds || [],
      area = el('section', '', 'review-enterprise-sources');
    area.append(el('h3', '\u4f01\u4e1a\u8bc1\u636e\u5bf9\u7167'));
    for (const id of ids) {
      const fact = reviewFact(audit, id);
      if (!fact) continue;
      const card = el('details', '', 'review-enterprise-source');
      card.append(
        el('summary', fact.subject + ' / ' + fact.attribute),
        el(
          'p',
          fact.source.name +
            ' \u00b7 v' +
            fact.source.version +
            ' / ' +
            (fact.location?.page
              ? '\u7b2c ' + fact.location.page + ' \u9875'
              : '\u7ed3\u6784\u5757 ' + (fact.unit + 1)),
        ),
        el('blockquote', fact.quote),
      );
      if (fact.validUntil) card.append(el('p', '\u6709\u6548\u671f\u81f3 ' + fact.validUntil));
      if (fact.flags.length)
        card.append(
          el(
            'p',
            '\u9700\u6838\u5bf9\uff1a' +
              fact.flags
                .map(
                  (v) =>
                    ({
                      expired: '\u5df2\u8fc7\u671f',
                      undated: '\u65e5\u671f\u672a\u6807\u660e',
                      conflict: '\u4fe1\u606f\u51b2\u7a81',
                      uncertain: '\u4e0d\u786e\u5b9a',
                      'operator-supplement': '\u4eba\u5de5\u8865\u5145',
                    })[v] || '\u539f\u6587\u9700\u590d\u6838',
                )
                .join(' / '),
          ),
        );
      const open = el('button', '\u56de\u770b\u8be5\u7248\u539f\u6587'),
        original = el('pre', '', 'review-source-text');
      original.hidden = true;
      open.onclick = async () => {
        try {
          const unit = checked(
            await bridge.request(
              'GET',
              '/readings/' + fact.source.readingId + '/units/' + fact.unit,
            ),
          );
          original.textContent =
            unit.text +
            '\n' +
            (unit.tables || [])
              .map((t) =>
                t.rows
                  .map((r) => r.map((v) => v ?? '\u5408\u5e76\u4f4d\u7f6e').join(' | '))
                  .join('\n'),
              )
              .join('\n');
        } catch (e) {
          original.textContent = e.message;
        }
        original.hidden = false;
      };
      card.append(open, original);
      area.append(card);
    }
    if (!ids.length)
      area.append(
        el(
          'p',
          '\u6b64\u9879\u5c1a\u65e0\u53ef\u5b9a\u4f4d\u7684\u4f01\u4e1a\u8bc1\u660e\uff0c\u4e0d\u8865\u9020\u6765\u6e90\u3002',
        ),
      );
    const comparison = el('details');
    comparison.append(el('summary', '\u5f53\u524d\u9009\u7528\u8d44\u6599\u5bf9\u7167'));
    for (const f of audit.current.facts)
      comparison.append(
        el(
          'p',
          f.subject +
            ' / ' +
            f.attribute +
            '\uff1a' +
            f.value +
            ' \u00b7 ' +
            f.source.name +
            ' v' +
            f.source.version,
        ),
      );
    if (!audit.current.facts.length)
      comparison.append(
        el(
          'p',
          '\u5f53\u524d\u5c1a\u65e0\u5df2\u6574\u7406\u4e14\u91c7\u7eb3\u7684\u5173\u8054\u4e8b\u5b9e',
        ),
      );
    area.append(comparison);
    for (const id of finding.relatedChapterIds || []) {
      const peer = audit.otherClaims.find((c) => c.chapterId === id);
      if (peer) {
        const related = el('details');
        related.append(
          el('summary', '\u5173\u8054\u7ae0\u8282\uff1a' + peer.title),
          el('blockquote', peer.quote),
        );
        area.append(related);
      }
    }
    area.append(
      el(
        'p',
        finding.origin === 'source-check'
          ? '\u6765\u6e90\u8bb0\u5f55\u68c0\u67e5\u63d0\u793a\uff0c\u4e0d\u662f\u8d44\u683c\u7b26\u5408\u6027\u7ed3\u8bba'
          : '\u6a21\u578b\u5ba1\u6838\u53d1\u73b0\uff0c\u4ecd\u9700\u6838\u5bf9\u539f\u4ef6',
        'muted',
      ),
    );
    viewer.append(area);
  }
  function render() {
    const job = run.request.job,
      findings = run.findings,
      active = job && !['completed', 'error', 'cancelled'].includes(job.state),
      done = job?.steps.filter((s) => s.state === 'done').length || 0;
    selected = findings.some((f) => f.id === selected) ? selected : findings[0]?.id;
    const finding = findings.find((f) => f.id === selected),
      report = run.reports.find((r) => r.chapterId === finding?.chapterId),
      item = writer.value?.items.find((i) => i.id === finding?.chapterId),
      chapter = run.draft.chapters.find((c) => c.id === finding?.chapterId);
    progress.textContent = job
      ? done +
        ' / ' +
        job.steps.length +
        ' \u7ae0\u5df2\u5ba1\u6838 \u00b7 \u62a5\u544a\u81ea\u52a8\u4fdd\u5b58'
      : '\u6309\u5df2\u4fdd\u5b58\u6b63\u6587\u9010\u7ae0\u5ba1\u6838';
    start.textContent = job
      ? '\u91cd\u65b0\u5ba1\u6838\u5f53\u524d\u7a3f'
      : '\u5f00\u59cb\u667a\u80fd\u5ba1\u6838';
    start.disabled = busy || active;
    pause.disabled = busy || (!active && job?.state !== 'error');
    pause.textContent =
      job?.state === 'error'
        ? '\u4ece\u5931\u8d25\u7ae0\u8282\u7ee7\u7eed'
        : job?.paused
          ? '\u7ee7\u7eed\u5ba1\u6838'
          : '\u6682\u505c\u540e\u7eed\u5ba1\u6838';
    refresh.disabled = busy;
    const contentKey = JSON.stringify([
      run.reports,
      run.decisions,
      selected,
      showDraft,
      showCandidate,
      item?.candidate,
      chapter?.body,
      !!job,
      !!active,
      run.stale,
    ]);
    if (contentKey !== lastContentKey) {
      lastContentKey = contentKey;
      nav.replaceChildren();
      if (!findings.length) {
        nav.append(
          el(
            'p',
            run.reports.length
              ? '\u672c\u6b21\u672a\u53d1\u73b0\u53ef\u5217\u51fa\u7684\u95ee\u9898'
              : '\u5ba1\u6838\u5173\u6ce8',
            'section-label',
          ),
        );
        for (const text of [
          '\u9700\u6c42\u662f\u5426\u5b8c\u6574\u56de\u5e94',
          '\u5173\u952e\u6307\u6807\u662f\u5426\u4e00\u81f4',
          '\u4f01\u4e1a\u4e8b\u5b9e\u662f\u5426\u6709\u4f9d\u636e',
          '\u7ae0\u8282\u4e4b\u95f4\u662f\u5426\u77db\u76fe',
        ])
          nav.append(el('p', text, 'review-scope-item'));
      } else {
        const counts = el('div', '', 'review-counts');
        for (const key of ['blocker', 'warning', 'info']) {
          const n = findings.filter(
            (f) => f.severity === key && run.decisions[f.id]?.state !== 'dismissed',
          ).length;
          counts.append(el('span', n + ' ' + severity[key], key));
        }
        nav.append(counts);
        for (const f of findings) {
          const b = el('button', '', 'review-finding ' + f.severity);
          b.setAttribute('aria-current', String(selected === f.id));
          b.append(
            el('small', run.reports.find((r) => r.chapterId === f.chapterId)?.title || ''),
            el('strong', f.title),
            el(
              'span',
              run.decisions[f.id]?.state === 'dismissed'
                ? '\u5df2\u6682\u7f13'
                : severity[f.severity] + ' \u00b7 ' + kind[f.category],
            ),
          );
          b.onclick = () => {
            selected = f.id;
            showDraft = false;
            showCandidate = true;
            render();
          };
          nav.append(b);
        }
      }
      viewer.replaceChildren();
      if (!job) viewer.append(intro);
      else if (showDraft && chapter) {
        viewer.append(
          el(
            'p',
            item?.candidate && showCandidate
              ? '\u667a\u80fd\u4f53\u4fee\u8ba2\u5019\u9009\u7a3f \u00b7 \u5c1a\u672a\u66ff\u6362\u6b63\u6587'
              : '\u5f53\u524d\u4fdd\u5b58\u6b63\u6587',
            'section-label',
          ),
          el('h2', chapter.title),
        );
        if (item?.candidate) {
          const tabs = el('div', '', 'writing-versions');
          for (const [label, value] of [
            ['\u5f53\u524d\u7a3f', false],
            ['\u4fee\u8ba2\u7a3f', true],
          ]) {
            const b = el('button', label);
            b.setAttribute('aria-pressed', String(showCandidate === value));
            b.onclick = () => {
              showCandidate = value;
              render();
            };
            tabs.append(b);
          }
          viewer.append(tabs);
        }
        const md = el('div', '', 'markdown-body');
        renderMarkdown(
          md,
          item?.candidate && showCandidate ? item.candidate.markdown : chapter.body,
        );
        viewer.append(md);
      } else if (finding) {
        viewer.append(
          el('p', severity[finding.severity] + ' / ' + kind[finding.category], 'section-label'),
          el('h2', finding.title),
          el('p', finding.detail, 'review-finding-detail'),
        );
        if (finding.quote)
          viewer.append(
            el('h3', '\u6b63\u6587\u4f9d\u636e'),
            el('blockquote', finding.quote, 'review-evidence'),
          );
        for (const id of finding.requirementIds) {
          const req = run.matrix.rows.find((r) => r.id === id);
          if (req) {
            const evidence = el('section', '', 'review-requirement');
            evidence.append(
              el('h3', req.text),
              el('blockquote', req.quote),
              el('small', req.location),
            );
            viewer.append(evidence);
          }
        }
        viewer.append(
          el('h3', '\u667a\u80fd\u4f53\u5efa\u8bae'),
          el('p', finding.suggestion, 'review-suggestion'),
        );
        if (report?.summary) {
          const detail = el('details');
          detail.append(
            el('summary', '\u672c\u7ae0\u5ba1\u6838\u7ed3\u8bba'),
            el('p', report.summary),
          );
          viewer.append(detail);
        }
      } else {
        viewer.append(
          el(
            'p',
            active
              ? '\u5ba1\u6838\u6b63\u5728\u540e\u53f0\u8fdb\u884c'
              : '\u672c\u6b21\u5ba1\u6838\u62a5\u544a',
            'section-label',
          ),
          el(
            'h2',
            active
              ? '\u4f60\u53ef\u4ee5\u79bb\u5f00\uff0c\u5b8c\u6210\u540e\u56de\u6765\u67e5\u770b'
              : '\u9010\u7ae0\u5ba1\u6838\u5df2\u5f52\u6863',
          ),
        );
        for (const r of run.reports)
          viewer.append(el('h3', r.title), el('p', r.error || r.summary));
        if (!run.reports.length)
          viewer.append(
            el(
              'p',
              '\u7ed3\u679c\u4f1a\u81ea\u52a8\u4fdd\u5b58\u5230\u5f53\u524d\u9879\u76ee\uff1b\u8d44\u6599\u6388\u6743\u7b49\u5fc5\u8981\u786e\u8ba4\u4f1a\u51fa\u73b0\u5728 RUYIN \u5f85\u529e\u4e2d\u3002',
              'muted',
            ),
          );
      }
      if (finding && !showDraft) sourcesFor(finding, report);
    }
    if (revisionInput.dataset.chapter !== finding?.chapterId) {
      revisionInput.dataset.chapter = finding?.chapterId || '';
      revisionInput.value = revisionNotes[finding?.chapterId] || '';
    }
    if (decisionNote.dataset.finding !== finding?.id) {
      decisionNote.dataset.finding = finding?.id || '';
      decisionNote.value = decisionDrafts[finding?.id] ?? run.decisions[finding?.id]?.note ?? '';
    }
    decisionNote.hidden = !finding;
    decisionNote.disabled = busy || run.stale;
    reopen.hidden = !finding || run.decisions[finding?.id]?.state !== 'dismissed';
    reopen.disabled = busy || run.stale;
    selectedContext.replaceChildren();
    if (finding)
      selectedContext.append(
        el('h3', '\u4fee\u8ba2\u5f53\u524d\u95ee\u9898\u6240\u5728\u7ae0\u8282'),
        el('p', report?.title || ''),
        el(
          'small',
          '\u4f1a\u540c\u65f6\u5904\u7406\u672c\u7ae0\u672a\u6682\u7f13\u7684\u5ba1\u6838\u95ee\u9898',
        ),
      );
    const writingActive =
      writer.value?.items.some(
        (i) => ['pending', 'submitting', 'running'].includes(i.state) && i.rewrite,
      ) || writer.value?.jobId;
    revise.disabled =
      busy || active || !finding || run.stale || !!writingActive || !!item?.candidate;
    revisionInput.disabled = revise.disabled;
    adopt.hidden = keep.hidden = !item?.candidate;
    adopt.disabled = busy || run.stale;
    keep.disabled = busy;
    back.hidden = !finding;
    back.textContent = showDraft
      ? '\u8fd4\u56de\u5ba1\u6838\u95ee\u9898'
      : item?.candidate
        ? '\u67e5\u770b\u4fee\u8ba2\u5019\u9009\u7a3f'
        : '\u67e5\u770b\u5f53\u524d\u6b63\u6587';
    dismiss.hidden = !finding;
    dismiss.disabled = busy || run.stale || run.decisions[finding?.id]?.state === 'dismissed';
    if (run.stale)
      status.textContent =
        '\u6b63\u6587\u3001\u9700\u6c42\u6216\u4f01\u4e1a\u8d44\u6599\u5df2\u66f4\u65b0\u3002\u6b64\u62a5\u544a\u4fdd\u7559\u4e3a\u5386\u53f2\u4f9d\u636e\uff0c\u8bf7\u91cd\u65b0\u5ba1\u6838\u5f53\u524d\u7a3f\u3002';
    else if (job?.state === 'error')
      status.textContent =
        '\u5ba1\u6838\u5df2\u505c\u6b62\uff1a' +
        job.error +
        '\u3002\u5df2\u5b8c\u6210\u7684\u62a5\u544a\u4ecd\u5df2\u4fdd\u5b58\u3002';
    else if (run.reports.some((r) => r.error))
      status.textContent =
        '\u90e8\u5206\u6a21\u578b\u7ed3\u679c\u672a\u901a\u8fc7\u683c\u5f0f\u6216\u5f15\u6587\u6821\u9a8c\uff0c\u539f\u59cb\u7ed3\u679c\u5df2\u4fdd\u5b58\uff0c\u8bf7\u91cd\u65b0\u5ba1\u6838\u3002';
    else if (job?.state === 'waiting')
      status.textContent =
        '\u7b49\u5f85\u5fc5\u8981\u786e\u8ba4\uff1a\u8bf7\u5728 RUYIN \u5f85\u529e\u4e2d\u5904\u7406\uff0c\u5df2\u6709\u8fdb\u5ea6\u5df2\u4fdd\u5b58\u3002';
    else if (job?.paused)
      status.textContent =
        '\u540e\u7eed\u5ba1\u6838\u5df2\u6682\u505c\uff0c\u5df2\u63d0\u4ea4\u7684\u4efb\u52a1\u4f1a\u7ee7\u7eed\u4fdd\u5b58\u7ed3\u679c\u3002';
    else if (active)
      status.textContent =
        '\u667a\u80fd\u4f53\u6b63\u5728\u540e\u53f0\u5ba1\u6838\u3002\u4f60\u53ef\u4ee5\u53bb\u5904\u7406\u5176\u4ed6\u5de5\u4f5c\uff0c\u8fd4\u56de\u540e\u67e5\u770b\u7ed3\u679c\u3002';
    else if (job)
      status.textContent =
        '\u5ba1\u6838\u62a5\u544a\u5df2\u4fdd\u5b58 \u00b7 ' +
        findings.length +
        ' \u9879\u53d1\u73b0\u3002\u5efa\u8bae\u4ecd\u9700\u7ed3\u5408\u771f\u5b9e\u8d44\u6599\u6838\u9a8c\u3002';
    else
      status.textContent =
        '\u5c31\u7eea \u00b7 \u5ba1\u6838\u4e0d\u4fee\u6539\u6b63\u6587\uff0c\u4fee\u8ba2\u987b\u7ecf\u8fc7\u5019\u9009\u7a3f\u786e\u8ba4\u3002';
    if (writingActive)
      status.textContent += ' \u672c\u7ae0\u4fee\u8ba2\u6b63\u5728\u540e\u53f0\u6267\u884c\u3002';
    if (actionError) status.textContent = actionError;
    const state =
      job?.state === 'completed' &&
      !run.stale &&
      run.reports.length === job.steps.length &&
      !run.reports.some((r) => r.error)
        ? 'complete'
        : job
          ? 'active'
          : 'pending';
    if (workflow.states.review !== state) {
      workflow.states.review = state;
      workflow.emit();
      if (state === 'complete') void workflow.mark('review', true, false, job.updatedAt);
    }
  }
  async function read() {
    await run.sources();
    if (run.request.value) await run.sync();
    await writer.load();
    if (writer.value?.jobId) await writer.step();
    await run.draft.load();
    render();
  }
  function schedule() {
    clearTimeout(timer);
    if (
      visible &&
      ((run.request.job && !['completed', 'error', 'cancelled'].includes(run.request.job.state)) ||
        writer.value?.jobId)
    )
      timer = setTimeout(() => void act(read), 2600);
  }
  async function act(fn) {
    if (busy) return;
    busy = true;
    actionError = '';
    render();
    try {
      await fn();
    } catch (e) {
      actionError = e.message;
    } finally {
      busy = false;
      render();
      schedule();
    }
  }
  start.onclick = () =>
    act(async () => {
      await saver.flush();
      await run.start(notes.value);
      await workflow.mark('review', false, true);
      await read();
    });
  pause.onclick = () =>
    act(async () => {
      await run.request.control(
        run.request.job.state === 'error' ? 'retry' : run.request.job.paused ? 'resume' : 'pause',
      );
    });
  refresh.onclick = () => act(read);
  function findingChapter() {
    return run.findings.find((f) => f.id === selected)?.chapterId;
  }
  revise.onclick = () => {
    const id = findingChapter();
    return act(async () => {
      const instruction = revisionInput.value + '\n' + run.rewriteInstruction(id);
      if (instruction.length > 4000)
        throw new Error(
          '\u4fee\u8ba2\u8981\u6c42\u8fc7\u957f\uff0c\u8bf7\u7f29\u5c0f\u672c\u6b21\u4fee\u8ba2\u8303\u56f4\uff1b\u672a\u622a\u65ad',
        );
      await writer.sources();
      if (!writer.value) throw new Error('Writing progress unavailable');
      await revisionSaver.flush();
      await writer.rewrite(id, instruction);
      await writer.step();
      await read();
    });
  };
  adopt.onclick = () => {
    const id = findingChapter();
    return act(async () => {
      await writer.accept(id);
      await read();
    });
  };
  keep.onclick = () => {
    const id = findingChapter();
    return act(async () => {
      await writer.discard(id);
      await read();
    });
  };
  dismiss.onclick = () => {
    const id = selected,
      note = decisionNote.value;
    return act(async () => {
      await decisionSaver.flush();
      await run.decide(id, { state: 'dismissed', note });
    });
  };
  reopen.onclick = () => {
    const id = selected,
      note = decisionNote.value;
    return act(() => run.decide(id, { state: 'open', note }));
  };
  back.onclick = () => {
    showDraft = !showDraft;
    render();
  };
  bridge.onStage((section) => {
    visible = section === 'review';
    if (visible) void act(read);
    else clearTimeout(timer);
  });
  window.addEventListener('pagehide', () => {
    clearTimeout(timer);
    void saver.flush().catch(() => {});
    void revisionSaver.flush().catch(() => {});
    void decisionSaver.flush().catch(() => {});
  });
  render();
  return { run, panel, render };
}
