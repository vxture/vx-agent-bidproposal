/**
 * @package @bidproposal/workbench
 * @layer Presentation
 * @category BusinessUi
 * @author AI-Generated
 * @date 2026-11-25
 */
import { ClarificationSession, clarificationItems } from './clarification.mjs';
const el = (tag, text, className) => {
  const n = document.createElement(tag);
  if (text != null) n.textContent = text;
  if (className) n.className = className;
  return n;
};
const terminal = (job) => !job || ['completed', 'error', 'cancelled'].includes(job.state);
/** Agent-led suggestions stay beside the source review, never replace its decisions. */
export function mountClarifications(bridge, target, { openSource = () => {} } = {}) {
  const panel = el('section', null, 'clarification-studio'),
    head = el('div', null, 'clarification-heading'),
    intro = el('div');
  intro.append(
    el('p', '\u6f84\u6e05\u8be2\u95ee', 'eyebrow'),
    el('h3', '\u5411\u91c7\u8d2d\u4eba\uff0f\u62db\u6807\u4ee3\u7406\u95ee\u6e05\u8981\u6c42'),
    el(
      'p',
      '\u7ad9\u5728\u6295\u6807\u65b9\u6574\u7406\u7591\u70b9\u3001\u6295\u6807\u5f71\u54cd\u548c\u8be2\u95ee\u51fd\u8349\u7a3f\uff0c\u5411\u91c7\u8d2d\u4eba\uff0f\u62db\u6807\u4ee3\u7406\u8bf7\u6c42\u6f84\u6e05\u3002',
      'muted',
    ),
  );
  const generate = el('button', '\u751f\u6210\u8be2\u95ee\u8349\u7a3f', 'primary');
  head.append(intro, generate);
  panel.append(head);
  const tools = el('div', null, 'clarification-tools'),
    summary = el('strong'),
    refresh = el('button', '\u5237\u65b0\u6f84\u6e05'),
    retry = el('button', '\u91cd\u8bd5\u5931\u8d25\u6279\u6b21'),
    pause = el('button', '\u6682\u505c\u540e\u7eed\u6279\u6b21'),
    resume = el('button', '\u7ee7\u7eed\u6f84\u6e05'),
    copy = el('button', '\u67e5\u770b / \u590d\u5236\u6e05\u5355');
  tools.append(summary, refresh, retry, pause, resume, copy);
  const status = el('p', null, 'clarification-status');
  status.setAttribute('role', 'status');
  const layout = el('div', null, 'clarification-layout'),
    list = el('div', null, 'clarification-list'),
    detail = el('article', null, 'clarification-detail');
  layout.append(list, detail);
  const exportBox = el('textarea', null, 'clarification-export');
  exportBox.readOnly = true;
  exportBox.hidden = true;
  exportBox.setAttribute('aria-label', '\u6f84\u6e05\u6e05\u5355 Markdown');
  panel.append(tools, status, layout, exportBox);
  target.append(panel);
  let session,
    verifier,
    rows = [],
    busy = false,
    visible = false,
    stopped = false,
    refreshing = false,
    timer,
    selected = null,
    viewKey = '',
    loadedKey = '';
  const say = (text) => (status.textContent = text);
  function schedule() {
    clearTimeout(timer);
    if (visible && !stopped && session && !terminal(session.request.job))
      timer = setTimeout(
        () =>
          void refreshData().catch((e) => {
            say(e.message);
            schedule();
          }),
        2500,
      );
  }
  function render() {
    if (!session) return;
    const count = clarificationItems(rows, verifier.segments).length,
      job = session.request.job,
      active = !terminal(job),
      total = session.plan?.batches.reduce((n, b) => n + b.items.length, 0) || 0;
    panel.hidden = !count && !session.plan;
    summary.textContent =
      count +
      ' \u9879\u539f\u6587\u7591\u70b9 \u00b7 \u5df2\u751f\u6210 ' +
      session.items.length +
      ' \u9879\u8be2\u95ee\u8349\u7a3f';
    generate.disabled = busy || active || !!verifier.problem || !count;
    generate.textContent = active
      ? '\u540e\u53f0\u751f\u6210\u4e2d\u2026'
      : session.plan && !session.stale && !session.errors.length
        ? '\u8be2\u95ee\u8349\u7a3f\u5df2\u4fdd\u5b58'
        : '\u751f\u6210\u8be2\u95ee\u8349\u7a3f';
    if (session.plan && !session.stale && !session.errors.length && job?.state === 'completed')
      generate.disabled = true;
    retry.hidden = job?.state !== 'error';
    pause.hidden = !active || job?.paused;
    resume.hidden = !job?.paused;
    copy.disabled = !session.items.length || session.stale;
    refresh.disabled = busy;
    if (session.stale)
      say(
        '\u539f\u6587\u6216\u7591\u70b9\u5df2\u66f4\u65b0\uff1b\u4e0b\u65b9\u4e3a\u5386\u53f2\u8349\u6848\uff0c\u8bf7\u91cd\u65b0\u751f\u6210\u3002',
      );
    else if (active)
      say(
        '\u540e\u53f0\u5df2\u4fdd\u5b58 ' +
          session.items.length +
          '/' +
          total +
          ' \u9879\u8be2\u95ee\u8349\u7a3f\uff0c\u53ef\u79bb\u5f00\u672c\u9875\u3002' +
          (job?.state === 'waiting'
            ? '\u8bf7\u5728\u5f85\u529e\u4e2d\u6388\u6743\u672c\u6b21\u8d44\u6599\u3002'
            : ''),
      );
    else if (job?.state === 'error')
      say(
        '\u672c\u6279\u6267\u884c\u5931\u8d25\uff0c\u5df2\u751f\u6210\u5185\u5bb9\u4fdd\u7559\uff1b\u53ef\u91cd\u8bd5\u5931\u8d25\u6279\u6b21\u3002',
      );
    else if (session.errors.length)
      say(
        session.errors.length +
          ' \u6279\u7ed3\u679c\u672a\u901a\u8fc7\u683c\u5f0f\u6838\u9a8c\uff0c\u53ef\u91cd\u65b0\u751f\u6210\uff1b\u539f\u7ed3\u679c\u4fdd\u7559\u3002',
      );
    else if (session.items.length)
      say(
        '\u6295\u6807\u65b9\u8be2\u95ee\u8349\u7a3f\u5df2\u81ea\u52a8\u4fdd\u5b58\uff0c\u5c1a\u672a\u53d1\u9001\u3002\u7531\u4f60\u51b3\u5b9a\u662f\u5426\u8be2\u95ee\uff1b\u8bb0\u5f55\u5904\u7406\u9009\u62e9\u540e\u53ef\u7ee7\u7eed\u6d41\u7a0b\u3002',
      );
    else
      say(
        '\u4ece\u6709\u6548\u539f\u6587\u7591\u70b9\u751f\u6210\u5efa\u8bae\uff1b\u5f15\u6587\u9519\u8bef\u9700\u5148\u4fee\u6b63\uff0c\u6570\u91cf\u968f\u672c\u9879\u76ee\u53d8\u5316\u3002',
      );
    if (!session.items.some((i) => i.id === selected)) selected = session.items[0]?.id;
    const key = JSON.stringify([session.items, selected, session.stale]);
    if (key === viewKey) return;
    viewKey = key;
    list.replaceChildren();
    detail.replaceChildren();
    for (const [i, item] of session.items.entries()) {
      const button = el('button', null, 'clarification-item');
      button.setAttribute('aria-current', String(item.id === selected));
      button.append(
        el('small', String(i + 1).padStart(2, '0') + ' \u00b7 ' + item.evidence[0].location),
        el('strong', item.title),
        el('span', '\u6295\u6807\u65b9\u8be2\u95ee\u8349\u7a3f'),
      );
      button.onclick = async () => {
        try {
          selected = item.id;
          render();
        } catch (e) {
          say(e.message);
        }
      };
      list.append(button);
    }
    const item = session.items.find((i) => i.id === selected);
    layout.hidden = !item;
    if (!item) return;
    detail.append(
      el(
        'p',
        session.stale
          ? '\u5386\u53f2\u8349\u6848 \u00b7 \u539f\u4f9d\u636e\u5df2\u66f4\u65b0'
          : '\u6295\u6807\u65b9\u8be2\u95ee\u8349\u7a3f \u00b7 \u672a\u53d1\u9001',
        'clarification-badge',
      ),
      el('h3', item.title),
    );
    for (const [label, value, cls] of [
      ['\u7591\u70b9\u53ca\u4e1a\u52a1\u5f71\u54cd', item.impact, ''],
      ['\u62df\u8be2\u95ee\u4e8b\u9879', item.question, 'clarification-question'],
      ['\u8be2\u95ee\u51fd\u8349\u7a3f', item.inquiryDraft, 'clarification-letter'],
      ['\u8be2\u95ee\u4f9d\u636e\u4e0e\u7406\u7531', item.reason, ''],
    ]) {
      const section = el('section');
      section.append(el('h4', label), el('p', value, cls));
      detail.append(section);
    }
    const pending = el('section');
    pending.append(el('h4', '\u8bf7\u91c7\u8d2d\u4eba\uff0f\u62db\u6807\u4ee3\u7406\u660e\u786e'));
    if (item.requestedClarifications.length) {
      const ul = el('ul');
      for (const value of item.requestedClarifications) ul.append(el('li', value));
      pending.append(ul);
    } else
      pending.append(
        el(
          'p',
          '\u8bf7\u91c7\u8d2d\u4eba\uff0f\u62db\u6807\u4ee3\u7406\u4e66\u9762\u660e\u786e\u4e0a\u8ff0\u4e8b\u9879\u3002',
        ),
      );
    detail.append(pending);
    const evidence = el('details');
    evidence.append(
      el('summary', '\u539f\u6587\u4f9d\u636e \u00b7 ' + item.evidence.length + ' \u6bb5'),
    );
    for (const ref of item.evidence)
      evidence.append(el('p', ref.location), el('blockquote', ref.quote));
    const source = el('button', '\u56de\u770b\u539f\u6587');
    source.disabled = session.stale;
    source.onclick = () => openSource(item.id);
    evidence.append(source);
    detail.append(evidence);
    const actions = el('div', null, 'clarification-handling');
    for (const [label, choice] of [
      ['\u7531\u6211\u6f84\u6e05\uff0f\u8865\u5145\u8bf4\u660e', 'resolved'],
      ['\u8bb0\u5f55\u8be2\u95ee\u5904\u7406', 'recorded'],
    ]) {
      const button = el('button', label);
      button.disabled = session.stale;
      button.onclick = () => openSource(item.id, choice);
      actions.append(button);
    }
    detail.append(
      actions,
      el(
        'p',
        '\u7531\u4f60\u51b3\u5b9a\u662f\u5426\u5bf9\u5916\u8be2\u95ee\u3002\u8bb0\u5f55\u5904\u7406\u9009\u62e9\u540e\u53ef\u7ee7\u7eed\u540e\u7eed\u6d41\u7a0b\uff0c\u4e0d\u5f3a\u5236\u7b49\u5f85\u7b54\u590d\u3002',
        'muted',
      ),
    );
    if (item.attention === 'important')
      detail.append(
        el(
          'p',
          '\u5efa\u8bae\u8fdb\u4e00\u6b65\u8d28\u8be2\u8bc4\u4f30\uff1a' + item.attentionReason,
          'source-warning',
        ),
      );
  }
  async function refreshData() {
    if (!session || refreshing) return;
    refreshing = true;
    try {
      await verifier.prepare(verifier.analysis, verifier.results);
      await verifier.load();
      rows = await verifier.ready();
      await session.sync();
      await session.check(verifier, rows);
      render();
    } finally {
      refreshing = false;
      schedule();
    }
  }
  generate.onclick = async () => {
    if (busy || !session) return;
    busy = true;
    generate.disabled = true;
    try {
      await verifier.prepare(verifier.analysis, verifier.results);
      await verifier.load();
      rows = await verifier.ready();
      await session.start(verifier, rows);
      await session.sync();
      render();
      schedule();
    } catch (e) {
      say(e.message);
    } finally {
      busy = false;
      generate.disabled =
        !terminal(session.request.job) ||
        !clarificationItems(rows, verifier.segments).length ||
        (session.request.job?.state === 'completed' && !session.stale && !session.errors.length);
    }
  };
  refresh.onclick = () => void refreshData().catch((e) => say(e.message));
  for (const [button, action] of [
    [retry, 'retry'],
    [pause, 'pause'],
    [resume, 'resume'],
  ])
    button.onclick = async () => {
      try {
        await session.control(action);
        await session.check(verifier, rows);
        render();
        schedule();
      } catch (e) {
        say(e.message);
      }
    };
  copy.onclick = async () => {
    try {
      await refreshData();
      exportBox.value = session.markdown();
      exportBox.hidden = false;
      exportBox.focus();
      exportBox.select();
      if (navigator.clipboard?.writeText) {
        try {
          await navigator.clipboard.writeText(exportBox.value);
          say(
            '\u6f84\u6e05\u6e05\u5355\u5df2\u590d\u5236\uff0c\u4ec5\u5305\u542b\u5efa\u8bae\u8349\u6848\u3002',
          );
          return;
        } catch {}
      }
      say(
        '\u6e05\u5355\u5df2\u5c55\u5f00\u5e76\u9009\u4e2d\uff0c\u53ef\u6309 Ctrl+C \u590d\u5236\u3002',
      );
    } catch (e) {
      say(e.message);
    }
  };
  window.addEventListener('pagehide', () => {
    stopped = true;
    clearTimeout(timer);
  });
  return {
    panel,
    get session() {
      return session;
    },
    setVisible(value) {
      visible = value;
      if (value) void refreshData().catch((e) => say(e.message));
      else {
        clearTimeout(timer);
      }
    },
    async update(next, values) {
      verifier = next;
      rows = values;
      const key = verifier.analysis.readingId;
      if (loadedKey !== key) {
        clearTimeout(timer);
        loadedKey = key;
        session = new ClarificationSession(bridge, key);
        viewKey = '';
        exportBox.hidden = true;
        await session.load();
      }
      await session.check(verifier, rows);
      render();
      schedule();
    },
  };
}
