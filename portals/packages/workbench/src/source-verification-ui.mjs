/**
 * @package @bidproposal/workbench
 * @layer Presentation
 * @category BusinessUi
 * @author AI-Generated
 * @date 2026-11-25
 */
import { SourceVerification, sourceUnit, locationLabel } from './source-verification.mjs';
import { Requirements } from './requirements.mjs';
import { flagLabel } from './reading.mjs';
import { mountClarifications } from './clarification-ui.mjs';
const el = (tag, text, className) => {
  const n = document.createElement(tag);
  if (text != null) n.textContent = text;
  if (className) n.className = className;
  return n;
};
const scopes = {
  target: '\u672c\u5305\u8981\u6c42',
  shared: '\u901a\u7528\u8981\u6c42',
  other: '\u5176\u5b83\u5206\u5305 / \u4e0d\u9002\u7528',
  uncertain: '\u8303\u56f4\u5f85\u6838\u5bf9',
};
const states = {
  ready: '\u53ef\u91c7\u7eb3',
  review: '\u9700\u590d\u6838',
  clarification: '\u5f85\u6f84\u6e05',
  excluded: '\u5df2\u6392\u9664',
  pending: '\u5f85\u667a\u80fd\u6838\u9a8c',
  'source-error': '\u6765\u6e90\u5f02\u5e38',
};
let closeDrawer = () => {};
function marked(text, start, end) {
  const n = document.createDocumentFragment();
  n.append(
    document.createTextNode(text.slice(0, start)),
    el('mark', text.slice(start, end)),
    document.createTextNode(text.slice(end)),
  );
  return n;
}

/** Source text and table association stay in one closable auxiliary panel. */
export async function openSourceDrawer(
  bridge,
  {
    candidate,
    segment,
    readingId,
    name,
    hash,
    check,
    review,
    onDecision,
    sourceSegments,
    handling,
  },
) {
  closeDrawer();
  const backdrop = el('div', null, 'source-drawer-backdrop'),
    drawer = el('aside', null, 'source-drawer');
  drawer.setAttribute('aria-label', '\u6765\u6e90\u4f9d\u636e\u4e0e\u6838\u5bf9');
  drawer.setAttribute('role', 'dialog');
  drawer.setAttribute('aria-modal', 'true');
  const previous = document.activeElement;
  const close = () => {
    backdrop.remove();
    window.removeEventListener('keydown', key);
    previous?.focus();
    closeDrawer = () => {};
  };
  const key = (e) => {
    if (e.key === 'Escape') close();
    if (e.key === 'Tab') {
      const fields = [...drawer.querySelectorAll('button,input,select,textarea,summary')].filter(
          (n) => !n.disabled,
        ),
        first = fields[0],
        last = fields.at(-1);
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last?.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first?.focus();
      }
    }
  };
  window.addEventListener('keydown', key);
  closeDrawer = close;
  const head = el('div', null, 'source-drawer-head'),
    title = el('div');
  title.append(
    el('p', '\u6765\u6e90\u4f9d\u636e', 'eyebrow'),
    el('h2', locationLabel(candidate, segment)),
  );
  const exit = el('button', '\u5173\u95ed\u539f\u6587');
  exit.onclick = close;
  head.append(title, exit);
  drawer.append(head);
  const body = el('div', null, 'source-drawer-body');
  body.append(el('h3', candidate.text), el('p', name, 'muted'));
  const quoteDetails = el('details', null, 'source-quote-details');
  quoteDetails.append(
    el('summary', '\u9700\u6c42\u5168\u6587\u4e0e\u6a21\u578b\u5f15\u7528'),
    el('p', candidate.text),
    el('blockquote', candidate.quote, 'source-quote'),
  );
  body.append(quoteDetails);
  const version = el('p', 'SHA256 ' + hash.slice(0, 16) + '\u2026', 'source-version');
  version.title = hash;
  body.append(version);
  if (review)
    body.append(
      el(
        'p',
        (scopes[review.scope] || '\u5f85\u6838\u5bf9') + ' \u00b7 ' + review.reason,
        'source-assessment',
      ),
    );
  if (check && !check.ok)
    body.append(
      el(
        'p',
        '\u5f15\u7528\u672a\u5339\u914d\u6307\u5b9a\u6765\u6e90\u6bb5\uff0c\u8bf7\u8865\u5145\u6b63\u786e\u4f9d\u636e\u540e\u590d\u6838\u3002',
        'source-warning',
      ),
    );
  drawer.append(body);
  backdrop.append(drawer);
  document.body.append(backdrop);
  exit.focus();
  backdrop.onclick = (e) => {
    if (e.target === backdrop) close();
  };
  try {
    const unit = await sourceUnit(bridge, readingId, candidate.unit);
    const source = el('section', null, 'source-original');
    source.append(el('h3', '\u4fdd\u5b58\u7684\u539f\u6587'));
    const pre = el('pre');
    pre.textContent = unit.text;
    if (segment?.kind === 'text') {
      if (check?.ok) {
        const start = Math.max(0, check.sourceStart - 160),
          end = Math.min(unit.text.length, check.sourceEnd + 160),
          excerpt = el('pre');
        excerpt.append(
          marked(unit.text.slice(start, end), check.sourceStart - start, check.sourceEnd - start),
        );
        source.append(excerpt);
      } else source.append(el('pre', (segment.text || unit.text).slice(0, 650)));
    }
    if (segment?.kind !== 'text' && segment?.table != null) {
      const table = unit.tables?.[segment.table],
        label = el('h3', '\u8868 ' + (segment.table + 1) + ' \u00b7 \u884c ' + (segment.row + 1));
      source.append(label);
      const wrap = el('div', null, 'source-table-wrap'),
        grid = el('table', null, 'reading-grid');
      for (const index of [
        ...new Set([
          0,
          Math.max(0, segment.row - 1),
          segment.row,
          Math.min((table?.rows.length || 1) - 1, segment.row + 1),
        ]),
      ].sort((a, b) => a - b)) {
        const row = table?.rows[index];
        if (!row) continue;
        const tr = el('tr');
        if (index === segment.row) tr.className = 'source-target-row';
        tr.append(el('th', String(index + 1)));
        row.forEach((value, column) => {
          const td = el('td');
          const cell = check?.cells?.find((c) => c.column === column);
          if (index === segment.row && cell && value !== null)
            td.append(
              marked(
                value,
                cell.start + (segment.kind === 'table-cell' ? segment.start : 0),
                cell.end + (segment.kind === 'table-cell' ? segment.start : 0),
              ),
            );
          else td.textContent = value === null ? '\u2196 \u5408\u5e76\u4f4d\u7f6e' : value;
          tr.append(td);
        });
        grid.append(tr);
      }
      wrap.append(grid);
      source.append(
        wrap,
        el(
          'p',
          '\u663e\u793a\u8868\u5934\u4e0e\u76ee\u6807\u884c\u9644\u8fd1\u5185\u5bb9\uff1b\u5408\u5e76\u4f4d\u7f6e\u4fdd\u7559\uff0c\u4e0d\u63a8\u65ad\u7a7a\u683c\u7684\u542b\u4e49\u3002',
          'muted',
        ),
      );
    }
    const full = el('details', null, 'source-full-page');
    full.append(el('summary', '\u672c\u9875\u5b8c\u6574\u8f6c\u5199'), pre);
    source.append(full);
    for (const flag of unit.flags || []) source.append(el('p', flagLabel(flag), 'source-warning'));
    body.append(source);
    for (const ref of check?.references || []) {
      const section = el('section', null, 'source-supplement');
      section.append(
        el(
          'h3',
          '\u8865\u5145\u4f9d\u636e \u00b7 ' +
            locationLabel(ref, {
              kind: ref.match.kind,
              table: ref.match.table,
              row: ref.match.row,
            }),
        ),
        el('blockquote', ref.quote, 'source-quote'),
      );
      body.append(section);
    }
    if (candidate.decision)
      body.append(
        el(
          'p',
          (candidate.decision.reviewer === 'assistant'
            ? '\u667a\u80fd\u4f53\u539f\u9875\u590d\u6838'
            : '\u7528\u6237\u590d\u6838') +
            ' \u00b7 ' +
            (candidate.decision.disposition === 'clarification'
              ? '\u5f85\u5904\u7406'
              : candidate.decision.disposition === 'recorded'
                ? '\u5df2\u8bb0\u5f55\u8be2\u95ee\u5904\u7406'
                : '\u5df2\u4fee\u8ba2') +
            '\n' +
            candidate.decision.note,
          'source-assessment',
        ),
      );
    if (onDecision) {
      const details = el('details', null, 'source-manual');
      details.append(el('summary', '\u4eba\u5de5\u8865\u5145\u6216\u590d\u6838'));
      const form = el('form');
      const field = (label, node) => {
        const l = el('label', label);
        l.append(node);
        form.append(l);
        return node;
      };
      const text = field('\u9700\u6c42\u8868\u8ff0', el('textarea'));
      text.value = candidate.text;
      text.maxLength = 4000;
      const quote = field('\u6307\u5b9a\u6765\u6e90\u6bb5\u4e2d\u7684\u539f\u6587', el('textarea'));
      quote.value = candidate.quote;
      quote.maxLength = 4000;
      const scope = field('\u9002\u7528\u8303\u56f4', el('select'));
      for (const value of ['target', 'shared', 'other']) {
        const o = el('option', scopes[value]);
        o.value = value;
        scope.append(o);
      }
      scope.value =
        candidate.decision?.scope ||
        (['target', 'shared', 'other'].includes(review?.scope) ? review.scope : 'target');
      const disposition = field('\u5904\u7406\u7ed3\u8bba', el('select'));
      for (const [value, label] of [
        [
          'resolved',
          '\u64cd\u4f5c\u4eba\u5458\u5df2\u6f84\u6e05\uff0c\u6309\u8bf4\u660e\u63a8\u8fdb',
        ],
        [
          'recorded',
          '\u5df2\u8bb0\u5f55\u8be2\u95ee\u5904\u7406\uff0c\u6309\u5f53\u524d\u8bf4\u660e\u7ee7\u7eed',
        ],
        ['clarification', '\u6682\u4fdd\u7559\u7591\u70b9\uff0c\u7a0d\u540e\u5904\u7406'],
      ]) {
        const o = el('option', label);
        o.value = value;
        disposition.append(o);
      }
      disposition.value = candidate.decision?.disposition || 'resolved';
      const segmentSelect = field('\u4e3b\u8981\u4f9d\u636e\u4f4d\u7f6e', el('select'));
      const fillSegments = (select) => {
        for (const s of sourceSegments?.values() || [segment]) {
          if (!s) continue;
          const o = el(
            'option',
            locationLabel({ location: s.location, unit: s.unit }, s) +
              ' \u00b7 ' +
              (s.text || s.cells?.filter(Boolean).join(' ') || '').slice(0, 36),
          );
          o.value = s.id;
          select.append(o);
        }
      };
      fillSegments(segmentSelect);
      segmentSelect.value = candidate.segmentId;
      const extra = el('div', null, 'source-ref-editor'),
        refInputs = [];
      const addRef = (value) => {
        if (refInputs.length >= 8) return;
        const row = el('div'),
          select = el('select'),
          quote = el('textarea'),
          remove = el('button', '\u79fb\u9664\u5f15\u7528');
        fillSegments(select);
        if (value) select.value = value.segmentId;
        quote.value = value?.quote || '';
        quote.maxLength = 4000;
        quote.placeholder = '\u590d\u5236\u8be5\u4f4d\u7f6e\u7684\u539f\u6587';
        select.setAttribute('aria-label', '\u8865\u5145\u4f9d\u636e\u4f4d\u7f6e');
        quote.setAttribute('aria-label', '\u8865\u5145\u4f9d\u636e\u539f\u6587');
        remove.type = 'button';
        const ref = { select, quote };
        refInputs.push(ref);
        remove.onclick = () => {
          row.remove();
          refInputs.splice(refInputs.indexOf(ref), 1);
        };
        row.append(select, quote, remove);
        extra.append(row);
      };
      for (const ref of candidate.decision?.references || []) addRef(ref);
      const add = el('button', '\u6dfb\u52a0\u8de8\u9875\u6216\u5173\u8054\u4f9d\u636e');
      add.type = 'button';
      add.onclick = () => addRef();
      form.append(extra, add);
      const note = field('\u590d\u6838\u8bf4\u660e\uff08\u5fc5\u586b\uff09', el('textarea'));
      note.maxLength = 1600;
      note.value = handling ? '' : candidate.decision?.note || '';
      note.placeholder =
        '\u8bf4\u660e\u9002\u7528\u8303\u56f4\u3001\u5f15\u7528\u4fee\u6b63\u6216\u4eba\u5de5\u5224\u65ad\u7684\u4f9d\u636e';
      if (handling) {
        details.open = true;
        disposition.value = handling;
      }
      const status = el('p');
      status.setAttribute('role', 'status');
      const save = el('button', '\u4fdd\u5b58\u590d\u6838\u8bb0\u5f55', 'primary');
      save.type = 'submit';
      form.append(status, save);
      form.onsubmit = async (event) => {
        event.preventDefault();
        save.disabled = true;
        try {
          await onDecision({
            text: text.value,
            quote: quote.value,
            scope: scope.value,
            note: note.value,
            disposition: disposition.value,
            segmentId: segmentSelect.value,
            references: refInputs.map((r) => ({ segmentId: r.select.value, quote: r.quote.value })),
          });
          status.textContent =
            '\u5df2\u81ea\u52a8\u4fdd\u5b58\uff0c\u8fd4\u56de\u5217\u8868\u53ef\u67e5\u770b\u66f4\u65b0\u7ed3\u679c';
        } catch (e) {
          status.textContent = e.message;
        } finally {
          save.disabled = false;
        }
      };
      details.append(form);
      body.append(details);
    }
  } catch (e) {
    body.append(el('p', e.message, 'source-warning'));
  }
  return { close };
}

export function mountSourceVerification(
  bridge,
  target,
  { onAdopted = async () => {}, beforeAdopt = async () => {} } = {},
) {
  target.classList.add('source-review');
  const header = el('div', null, 'source-review-heading'),
    heading = el('div');
  heading.append(
    el('p', '\u667a\u80fd\u4f53\u6838\u9a8c', 'eyebrow'),
    el('h3', '\u8ba9\u6bcf\u4e00\u6761\u9700\u6c42\u90fd\u6709\u53ef\u9760\u4f9d\u636e'),
    el(
      'p',
      '\u81ea\u52a8\u6838\u5bf9\u5f15\u6587\uff0c\u518d\u5224\u65ad\u672c\u6b21\u6295\u6807\u662f\u5426\u9002\u7528\u3002\u5f02\u5e38\u7559\u5f85\u590d\u6838\uff0c\u901a\u8fc7\u9879\u53ef\u6279\u91cf\u8fdb\u5165\u9700\u6c42\u786e\u8ba4\u3002',
      'muted',
    ),
  );
  header.append(heading);
  const controls = el('div', null, 'source-review-controls'),
    label = el('label', '\u672c\u6b21\u6295\u6807\u8303\u56f4'),
    scope = el('input');
  scope.maxLength = 300;
  scope.setAttribute('aria-label', '\u672c\u6b21\u6295\u6807\u8303\u56f4');
  label.append(scope);
  const start = el('button', '\u667a\u80fd\u6838\u9a8c\u6765\u6e90\u4e0e\u8303\u56f4', 'primary'),
    refresh = el('button', '\u5237\u65b0\u6838\u9a8c'),
    retry = el('button', '\u91cd\u8bd5\u5931\u8d25\u6838\u9a8c'),
    pause = el('button', '\u6682\u505c\u540e\u7eed\u6838\u9a8c'),
    resume = el('button', '\u7ee7\u7eed\u6838\u9a8c');
  controls.append(label, start, refresh, retry, pause, resume);
  const notice = el('p', null, 'source-review-notice');
  notice.setAttribute('role', 'status');
  const stats = el('div', null, 'source-review-stats');
  const toolbar = el('div', null, 'source-review-toolbar'),
    filter = el('select'),
    category = el('select'),
    search = el('input'),
    adopt = el('button', '\u91c7\u7eb3\u53ef\u7528\u9879', 'primary');
  filter.setAttribute('aria-label', '\u7b5b\u9009\u6838\u9a8c\u72b6\u6001');
  category.setAttribute('aria-label', '\u7b5b\u9009\u5019\u9009\u5206\u7c7b');
  search.placeholder = '\u641c\u7d22\u9700\u6c42\u6216\u4f9d\u636e';
  search.setAttribute('aria-label', '\u641c\u7d22\u9700\u6c42\u6216\u4f9d\u636e');
  for (const [value, text] of [
    ['all', '\u5168\u90e8\u5019\u9009'],
    ['attention', '\u9700\u5904\u7406\u7684\u5f02\u5e38'],
    ['clarification', '\u5f85\u6f84\u6e05'],
    ['ready', '\u53ef\u91c7\u7eb3'],
    ['source-error', '\u6765\u6e90\u5f02\u5e38'],
    ['excluded', '\u5df2\u6392\u9664'],
    ['pending', '\u5f85\u667a\u80fd\u6838\u9a8c'],
  ]) {
    const o = el('option', text);
    o.value = value;
    filter.append(o);
  }
  for (const [value, text] of [
    ['all', '\u5546\u52a1\u4e0e\u6280\u672f'],
    ['commercial', '\u5546\u52a1\u8981\u6c42'],
    ['technical', '\u6280\u672f\u8981\u6c42'],
  ]) {
    const o = el('option', text);
    o.value = value;
    category.append(o);
  }
  toolbar.append(filter, category, search, adopt);
  const list = el('div', null, 'source-review-list'),
    paging = el('div', null, 'source-review-paging'),
    prev = el('button', '\u4e0a\u4e00\u9875'),
    next = el('button', '\u4e0b\u4e00\u9875'),
    pageText = el('span');
  paging.append(prev, pageText, next);
  const modelIssues = el('details', null, 'source-model-issues');
  target.append(header, controls, notice, stats, toolbar, list, paging, modelIssues);
  let verification = null,
    analysis = null,
    results = [],
    rows = [],
    page = 0,
    key = '',
    busy = false,
    visible = false,
    stopped = false,
    timer,
    renderKey = '',
    scopeEdited = false,
    issuesKey = '';
  const clarificationTarget = el('div');
  stats.after(clarificationTarget);
  const clarifications = mountClarifications(bridge, clarificationTarget, {
    openSource: async (id, handling) => {
      const r = rows.find((r) => r.id === id);
      if (!r) return;
      await openSourceDrawer(bridge, {
        candidate: r,
        handling,
        segment: verification.segments.get(r.segmentId),
        sourceSegments: verification.segments,
        readingId: analysis.readingId,
        name: analysis.name,
        hash: analysis.sourceHash,
        check: r.check,
        review: r.review,
        onDecision: async (d) => {
          await verification.decide(r.id, d);
          await render();
        },
      });
    },
  });
  const say = (text) => (notice.textContent = text);
  let refreshing = false;
  async function refreshData() {
    if (!verification || refreshing) return;
    refreshing = true;
    try {
      await verification.request.sync();
      await render();
      schedule();
    } finally {
      refreshing = false;
    }
  }
  const fail = (e) => say(e.message);
  function schedule() {
    clearTimeout(timer);
    const job = verification?.request.job;
    if (visible && !stopped && job && !['completed', 'error', 'cancelled'].includes(job.state))
      timer = setTimeout(
        () =>
          refreshData().catch((e) => {
            fail(e);
            schedule();
          }),
        2500,
      );
  }
  async function render() {
    if (!verification) {
      target.hidden = true;
      return;
    }
    target.hidden = false;
    rows = await verification.ready();
    await clarifications.update(verification, rows);
    const job = verification.request.job,
      active = job && !['completed', 'error', 'cancelled'].includes(job.state),
      complete = job?.state === 'completed',
      reports = await verification.reports();
    start.disabled =
      busy ||
      !!active ||
      !!verification.problem ||
      results.some((r) => r.error) ||
      results.length !== analysis.batches.length;
    scope.disabled = !!active;
    retry.hidden = job?.state !== 'error';
    pause.hidden = !active || job.paused;
    resume.hidden = !job?.paused;
    if (verification.problem)
      say('\u6765\u6e90\u7248\u672c\u9700\u8981\u5904\u7406\uff1a' + verification.problem);
    else if (active)
      say(
        '\u540e\u53f0\u6b63\u5728\u6838\u9a8c ' +
          job.steps.filter((s) => s.state === 'done').length +
          '/' +
          job.steps.length +
          ' \u6279\uff0c\u7ed3\u679c\u9010\u6279\u81ea\u52a8\u4fdd\u5b58\uff0c\u53ef\u79bb\u5f00\u672c\u9875\u3002' +
          (job.state === 'waiting'
            ? '\u8bf7\u5728 RUYIN \u5f85\u529e\u4e2d\u6388\u6743\u672c\u6b21\u8d44\u6599\u3002'
            : ''),
      );
    else if (job?.state === 'error')
      say(
        '\u6838\u9a8c\u6682\u505c\uff1a' +
          job.error +
          '\u3002\u5df2\u5b8c\u6210\u7ed3\u679c\u4fdd\u7559\uff0c\u53ef\u91cd\u8bd5\u5931\u8d25\u6279\u6b21\u3002',
      );
    else if (reports.errors.length)
      say(
        reports.errors.length +
          ' \u4e2a\u6838\u9a8c\u7ed3\u679c\u683c\u5f0f\u5f02\u5e38\uff0c\u5df2\u4fdd\u7559\u539f\u59cb\u7ed3\u679c\uff1b\u53ef\u91cd\u65b0\u63d0\u4ea4\u6838\u9a8c\u3002',
      );
    else if (complete)
      say(
        '\u667a\u80fd\u6838\u9a8c\u7ed3\u679c\u5df2\u4fdd\u5b58\u3002\u5148\u5904\u7406\u5f02\u5e38\u4e0e\u4e0d\u9002\u7528\u5185\u5bb9\uff0c\u518d\u91c7\u7eb3\u672c\u6b21\u6295\u6807\u53ef\u7528\u9879\uff1b\u91c7\u7eb3\u540e\u4ecd\u9700\u9700\u6c42\u786e\u8ba4\u3002',
      );
    else
      say(
        '\u5f15\u6587\u5339\u914d\u5df2\u5b8c\u6210\u3002\u542f\u52a8\u667a\u80fd\u6838\u9a8c\uff0c\u5224\u65ad\u4e1a\u52a1\u542b\u4e49\u3001\u5206\u5305\u9002\u7528\u8303\u56f4\u53ca\u51b2\u7a81\u3002',
      );
    stats.replaceChildren();
    for (const [status, label] of [
      ['ready', '\u53ef\u91c7\u7eb3'],
      ['review', '\u5f85\u590d\u6838'],
      ['clarification', '\u5f85\u6f84\u6e05'],
      ['source-error', '\u6765\u6e90\u5f02\u5e38'],
      ['excluded', '\u5df2\u6392\u9664'],
      ['pending', '\u5f85\u6838\u9a8c'],
    ]) {
      const button = el(
        'button',
        rows.filter((r) => r.status === status).length + ' ' + label,
        'source-stat ' + status,
      );
      button.onclick = () => {
        filter.value = status === 'review' ? 'attention' : status;
        page = 0;
        void render();
      };
      stats.append(button);
    }
    const validQuotes = rows.filter((r) => r.check?.ok).length;
    stats.prepend(
      el(
        'span',
        '\u5f15\u6587\u5339\u914d ' + validQuotes + '/' + rows.length,
        'source-quote-count',
      ),
    );
    const ready = rows.filter((r) => r.status === 'ready');
    adopt.disabled = busy || !ready.length;
    adopt.textContent = '\u91c7\u7eb3\u53ef\u7528\u9879\uff08' + ready.length + '\uff09';
    const query = search.value.trim().toLocaleLowerCase(),
      filtered = rows.filter(
        (r) =>
          (filter.value === 'all' ||
            (filter.value === 'attention' &&
              ['review', 'source-error', 'clarification'].includes(r.status)) ||
            r.status === filter.value) &&
          (category.value === 'all' || category.value === r.category) &&
          (!query || (r.text + '\n' + r.quote).toLocaleLowerCase().includes(query)),
      );
    page = Math.max(0, Math.min(page, Math.ceil(filtered.length / 20) - 1));
    prev.disabled = page === 0;
    next.disabled = (page + 1) * 20 >= filtered.length;
    pageText.textContent =
      filtered.length +
      ' \u9879 \u00b7 ' +
      (filtered.length ? page * 20 + 1 : 0) +
      '\u2013' +
      Math.min((page + 1) * 20, filtered.length);
    const nextKey = JSON.stringify([
      rows.map((r) => [r.id, r.status, r.review, r.decision, r.check?.ok]),
      filter.value,
      category.value,
      query,
      page,
    ]);
    if (nextKey !== renderKey) {
      renderKey = nextKey;
      list.replaceChildren();
      for (const r of filtered.slice(page * 20, (page + 1) * 20)) {
        const item = el('article', null, 'source-candidate ' + r.status),
          top = el('div', null, 'source-candidate-top');
        top.append(
          el(
            'span',
            r.category === 'commercial' ? '\u5546\u52a1' : '\u6280\u672f',
            'source-category',
          ),
          el(
            'span',
            r.decision?.disposition === 'recorded'
              ? '\u6309\u8bb0\u5f55\u63a8\u8fdb'
              : states[r.status],
            'source-status',
          ),
        );
        item.append(top, el('h4', r.text));
        const foot = el('div', null, 'source-candidate-foot'),
          segment = verification.segments.get(r.segmentId),
          open = el('button', '\u67e5\u770b\u4f9d\u636e \u00b7 ' + locationLabel(r, segment));
        open.onclick = () =>
          void openSourceDrawer(bridge, {
            candidate: r,
            segment,
            sourceSegments: verification.segments,
            readingId: analysis.readingId,
            name: analysis.name,
            hash: analysis.sourceHash,
            check: r.check,
            review: r.review,
            onDecision: async (d) => {
              await verification.decide(r.id, d);
              await render();
            },
          });
        foot.append(
          open,
          el(
            'span',
            r.decision
              ? (r.decision.reviewer === 'assistant'
                  ? '\u667a\u80fd\u4f53\u539f\u9875\u590d\u6838'
                  : '\u7528\u6237\u590d\u6838') +
                  ' \u00b7 ' +
                  scopes[r.decision.scope]
              : r.review
                ? scopes[r.review.scope]
                : r.check?.ok
                  ? r.check.method === 'exact'
                    ? '\u539f\u53e5\u5339\u914d'
                    : '\u7a7a\u767d\u89c4\u8303\u5316\u5339\u914d'
                  : '\u5f15\u6587\u672a\u5339\u914d',
          ),
        );
        item.append(
          el(
            'p',
            r.status === 'source-error'
              ? '\u5f15\u7528\u672a\u5339\u914d\u6307\u5b9a\u6765\u6e90\u6216\u7248\u672c\uff0c\u9700\u8981\u5148\u4fee\u6b63\u4f9d\u636e\u3002'
              : r.decision
                ? r.decision.note
                : r.review?.reason ||
                  '\u7b49\u5f85\u667a\u80fd\u4f53\u5224\u65ad\u9002\u7528\u8303\u56f4\u3002',
            'source-candidate-reason',
          ),
          foot,
        );
        list.append(item);
      }
      if (!filtered.length)
        list.append(el('p', '\u6b64\u7b5b\u9009\u4e0b\u6ca1\u6709\u5019\u9009\u3002', 'muted'));
    }
    const nextIssuesKey =
      analysis.runId + ':' + results.map((r) => r.step.resultDocument).join('|');
    if (nextIssuesKey !== issuesKey) {
      issuesKey = nextIssuesKey;
      modelIssues.replaceChildren();
      const issues = results
        .filter((r) => !r.error)
        .flatMap((r) => r.issues.map((i) => ({ ...i, batchId: r.batchId })));
      modelIssues.append(
        el(
          'summary',
          '\u89e3\u8bfb\u65f6\u7684\u5f85\u6838\u5bf9\u63d0\u793a \u00b7 ' + issues.length,
        ),
      );
      for (const issue of issues) {
        const button = el('button', issue.detail);
        button.onclick = async () => {
          const segment = verification.segments.get(issue.segmentId);
          if (!segment) return;
          await openSourceDrawer(bridge, {
            candidate: {
              text: issue.detail,
              quote: '',
              segmentId: segment.id,
              unit: segment.unit,
              location: segment.location,
            },
            segment,
            readingId: analysis.readingId,
            name: analysis.name,
            hash: analysis.sourceHash,
          });
        };
        modelIssues.append(button);
      }
    }
  }
  scope.oninput = () => {
    scopeEdited = true;
  };
  start.onclick = async () => {
    if (busy || !verification) return;
    busy = true;
    try {
      await verification.prepare(analysis, results);
      if (!scope.value.trim())
        throw new Error('\u8bf7\u586b\u5199\u672c\u6b21\u6295\u6807\u8303\u56f4');
      start.disabled = true;
      await verification.start(
        scope.value,
        analysisSession.job.sources.find((s) => s.id.startsWith('bid_analysis_manifest_')),
      );
      await render();
      schedule();
    } catch (e) {
      fail(e);
    } finally {
      busy = false;
      start.disabled = false;
    }
  };
  let analysisSession;
  refresh.onclick = () => {
    if (verification) void verification.prepare(analysis, results).then(refreshData).catch(fail);
  };
  for (const [button, action] of [
    [retry, 'retry'],
    [pause, 'pause'],
    [resume, 'resume'],
  ])
    button.onclick = async () => {
      try {
        await verification.request.control(action);
        await render();
        schedule();
      } catch (e) {
        fail(e);
      }
    };
  adopt.onclick = async () => {
    if (busy) return;
    busy = true;
    adopt.disabled = true;
    try {
      await beforeAdopt();
      const candidates = await verification.adoptable(),
        matrix = new Requirements(bridge);
      await matrix.load();
      const count = matrix.adopt(candidates);
      if (count) await matrix.save();
      await onAdopted(matrix);
      await render();
      say(
        count
          ? '\u5df2\u81ea\u52a8\u4fdd\u5b58 ' +
              count +
              ' \u9879\u5f85\u786e\u8ba4\u9700\u6c42\u3002\u5176\u5b83\u5019\u9009\u4fdd\u7559\uff0c\u53ef\u7ee7\u7eed\u5904\u7406\u3002'
          : '\u901a\u8fc7\u9879\u5747\u5df2\u91c7\u7eb3\uff0c\u672a\u91cd\u590d\u6dfb\u52a0\u3002',
      );
    } catch (e) {
      fail(e);
    } finally {
      busy = false;
      adopt.disabled = false;
    }
  };
  for (const input of [filter, category])
    input.onchange = () => {
      page = 0;
      void render();
    };
  search.oninput = () => {
    page = 0;
    void render();
  };
  prev.onclick = () => {
    page--;
    void render();
  };
  next.onclick = () => {
    page++;
    void render();
  };
  bridge.onStage((section) => {
    const next = section === 'analysis';
    if (next === visible) return;
    visible = next;
    clarifications.setVisible(visible);
    if (visible) void refreshData().catch(fail);
    else {
      clearTimeout(timer);
      closeDrawer();
    }
  });
  window.addEventListener('pagehide', () => {
    stopped = true;
    clearTimeout(timer);
  });
  return {
    async update(session, newResults) {
      analysisSession = session;
      analysis = session.plan;
      results = newResults;
      if (!analysis || !newResults.some((r) => !r.error)) {
        target.hidden = true;
        return;
      }
      const nextKey = analysis.runId + ':' + newResults.map((r) => r.step.resultDocument).join('|');
      if (nextKey !== key) {
        key = nextKey;
        verification = new SourceVerification(bridge, analysis.readingId);
        await verification.prepare(analysis, newResults);
        await verification.load();
        if (!scopeEdited)
          scope.value = verification.plan?.target || analysis.name.replace(/\.[^.]+$/, '');
      }
      await render();
      schedule();
    },
    get session() {
      return verification;
    },
  };
}
