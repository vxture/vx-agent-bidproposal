/**
 * @package @bidproposal/workbench
 * @layer Presentation
 * @category BusinessUi
 * @author AI-Generated
 * @date 2026-11-25
 */
import { BatchAnalysisSession } from './batch-analysis.mjs';
import { mountSourceVerification } from './source-verification-ui.mjs';
export async function mountBatchAnalysis(
  bridge,
  {
    onStarted = async () => {},
    onJob = () => {},
    onAdopted = async () => {},
    beforeAdopt = async () => {},
    beforeStart = async () => {},
  } = {},
) {
  const panel = document.createElement('section');
  panel.className = 'batch-studio';
  panel.innerHTML =
    '<div class="batch-heading"><div><p class="eyebrow">\u667a\u80fd\u4f53\u4efb\u52a1</p><h2>\u5206\u6279\u89e3\u8bfb\u62db\u6807\u6587\u4ef6</h2><p class="muted">\u667a\u80fd\u4f53\u6309\u539f\u6587\u5757\u4e0e\u4e0a\u4e0b\u6587\u9884\u7b97\u81ea\u52a8\u62c6\u6279\uff0c\u9010\u6279\u4fdd\u5b58\u9700\u6c42\u5019\u9009\u3002\u79bb\u5f00\u9875\u9762\u540e\uff0c\u540e\u53f0\u7ee7\u7eed\u6267\u884c\u3002</p></div><button class="primary" id="batch-start">\u5f00\u59cb\u667a\u80fd\u89e3\u8bfb</button></div><p id="batch-notice" role="status"></p><div class="batch-controls"><button id="batch-pause">\u6682\u505c\u540e\u7eed\u6279\u6b21</button><button id="batch-resume">\u7ee7\u7eed\u6267\u884c</button><button id="batch-retry">\u91cd\u8bd5\u5931\u8d25\u6279\u6b21</button><button id="batch-invalid">\u8865\u8dd1\u5f02\u5e38\u7ed3\u679c</button><button id="batch-refresh">\u5237\u65b0\u7ed3\u679c</button></div><div id="batch-progress"></div><details id="batch-list"><summary>\u539f\u6587\u5904\u7406\u6e05\u5355</summary><div id="batch-rows"></div></details><div id="batch-candidates"></div>';
  const readingPanel = document.getElementById('reading-panel');
  (
    readingPanel.querySelector('.reading-source-config') ||
    readingPanel.querySelector('.reading-version')
  ).after(panel);
  const $ = (id) => document.getElementById(id),
    session = new BatchAnalysisSession(bridge);
  const verification = mountSourceVerification(bridge, $('batch-candidates'), {
    onAdopted,
    beforeAdopt,
  });
  let visible = false,
    stopped = false,
    timer,
    busy = false,
    refreshing = false,
    readingId = null,
    results = [];
  const preview = document.createElement('button');
  preview.textContent = '\u5173\u95ed\u539f\u6587\u56de\u770b';
  preview.className = 'batch-source-close';
  preview.onclick = () =>
    document.getElementById('reading-panel').classList.remove('reading-source-open');
  document.querySelector('.reading-document').prepend(preview);
  function showSource(unit) {
    const page = $('reading-page');
    page.value = unit + 1;
    page.onchange();
    document.getElementById('reading-panel').classList.add('reading-source-open');
  }
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') preview.onclick();
  });
  const say = (s) => {
    $('batch-notice').textContent = s;
  };
  const el = (tag, text) => {
    const n = document.createElement(tag);
    n.textContent = text;
    return n;
  };
  function selectedReading() {
    return $('reading-version').value;
  }
  async function render() {
    const j = session.job,
      plan = session.plan;
    if (j) onJob(j);
    results = await session.results();
    const good = results.filter((r) => !r.error),
      done = new Set(good.map((r) => r.batchId)),
      errors = results.filter((r) => r.error);
    readingPanel.classList.toggle('has-analysis-results', done.size > 0);
    const active = j && !['completed', 'cancelled', 'error'].includes(j.state);
    $('batch-start').disabled = busy || active || !selectedReading();
    $('batch-pause').hidden = !active || j.paused;
    $('batch-resume').hidden = !j?.paused;
    $('batch-retry').hidden = j?.state !== 'error';
    $('batch-invalid').hidden = !errors.length || active;
    $('batch-progress').textContent = plan
      ? good.reduce((n, r) => n + plan.batches.find((b) => b.id === r.batchId).segments.length, 0) +
        '/' +
        plan.batches.reduce((n, b) => n + b.segments.length, 0) +
        ' \u6765\u6e90\u6bb5 \u00b7 ' +
        done.size +
        '/' +
        plan.batches.length +
        ' \u6279\u6b21\u7ed3\u679c\u6709\u6548 \u00b7 ' +
        plan.unitCount +
        ' \u539f\u6587\u5757 \u00b7 ' +
        good.reduce((n, r) => n + r.requirements.length, 0) +
        ' \u9879\u5019\u9009\uff08\u53bb\u91cd\u524d\uff09'
      : '';
    $('batch-rows').replaceChildren();
    for (const b of plan?.batches || []) {
      const step = j.steps.find((s) => s.id === b.id),
        r = results.find((r) => r.batchId === b.id),
        row = el('button', '');
      row.className = 'batch-row';
      const units = [...new Set(b.segments.map((s) => s.unit + 1))];
      const states = {
        pending: '\u5f85\u5904\u7406',
        submitting: '\u63d0\u4ea4\u4e2d',
        running: '\u6267\u884c\u4e2d',
        done: '\u5df2\u4fdd\u5b58',
      };
      row.append(
        el('strong', b.id.replace('batch-', '\u6279\u6b21 ')),
        el(
          'span',
          '\u539f\u6587 ' + units.join('\u3001') + ' \u00b7 ' + b.segments.length + ' \u6bb5',
        ),
        el(
          'span',
          r?.error
            ? '\u7ed3\u679c\u5f85\u4fee\u590d'
            : r
              ? r.requirements.length + ' \u9879\u5019\u9009'
              : states[step?.state] || '\u5df2\u4fdd\u7559',
        ),
      );
      row.onclick = () => showSource(units[0] - 1);
      $('batch-rows').append(row);
      if (r?.error) $('batch-rows').append(el('p', r.error));
    }
    await verification.update(session, results);
    if (!j)
      say(
        '\u5b8c\u6210\u539f\u6587\u8bfb\u53d6\u540e\uff0c\u5373\u53ef\u63d0\u4ea4\u667a\u80fd\u4f53\u4efb\u52a1\u3002',
      );
    else if (j.state === 'error')
      say(
        j.error +
          '\u3002\u5df2\u5b8c\u6210\u6279\u6b21\u4fdd\u7559\uff0c\u53ea\u91cd\u8bd5\u672a\u5b8c\u6210\u90e8\u5206\u3002',
      );
    else if (
      j.state === 'waiting' &&
      j.steps.some((s) => s.waitingOn?.includes('verification_review'))
    )
      say(
        '\u7ed3\u679c\u68c0\u67e5\u9700\u8981\u4eba\u5de5\u786e\u8ba4\uff0c\u8bf7\u5904\u7406\u5f85\u529e\u3002',
      );
    else if (j.state === 'waiting')
      say(
        '\u7b49\u5f85\u6388\u6743\u672c\u6b21\u6279\u6b21\u8d44\u6599\u3002\u6388\u6743\u540e\u540e\u53f0\u81ea\u52a8\u7ee7\u7eed\u3002',
      );
    else if (j.state === 'completed')
      say(
        errors.length
          ? '\u90e8\u5206\u6279\u6b21\u8f93\u51fa\u683c\u5f0f\u5f02\u5e38\uff0c\u53ef\u4ec5\u8865\u8dd1\u5f02\u5e38\u7ed3\u679c\u3002'
          : '\u5206\u6279\u89e3\u8bfb\u7ed3\u679c\u5df2\u81ea\u52a8\u4fdd\u5b58\u3002\u5168\u90e8\u8f93\u5165\u5757\u5df2\u6709\u5904\u7406\u8bb0\u5f55\uff1b\u8fd9\u4e0d\u4ee3\u8868\u6240\u6709\u4e1a\u52a1\u8981\u6c42\u65e0\u9057\u6f0f\u3002',
      );
    else if (j.paused)
      say(
        '\u5df2\u6682\u505c\u540e\u7eed\u6279\u6b21\uff1b\u5f53\u524d\u5df2\u63d0\u4ea4\u4efb\u52a1\u4f1a\u4fdd\u5b58\u7ed3\u679c\u3002',
      );
    else
      say(
        '\u6b63\u5728\u540e\u53f0\u5206\u6279\u6267\u884c\u5e76\u81ea\u52a8\u4fdd\u5b58\uff0c\u53ef\u4ee5\u79bb\u5f00\u672c\u9875\u9762\u3002',
      );
  }
  async function refresh() {
    if (refreshing || stopped) return;
    refreshing = true;
    try {
      const selected = selectedReading();
      if (selected !== readingId || !session.job) {
        readingId = selected;
        await session.load(selected);
      } else await session.refresh();
      await render();
    } finally {
      refreshing = false;
      schedule();
    }
  }
  function schedule() {
    clearTimeout(timer);
    if (
      visible &&
      !stopped &&
      session.job &&
      !['completed', 'cancelled', 'error'].includes(session.job.state)
    )
      timer = setTimeout(
        () =>
          refresh().catch((e) => {
            say(e.message);
            schedule();
          }),
        2500,
      );
  }
  $('batch-start').onclick = async () => {
    if (busy) return;
    busy = true;
    try {
      await beforeStart();
      await session.load(selectedReading());
      if (session.job && !['completed', 'error', 'cancelled'].includes(session.job.state))
        throw new Error(
          '\u5f53\u524d\u5df2\u6709\u89e3\u8bfb\u4efb\u52a1\uff0c\u8bf7\u7ee7\u7eed\u6216\u91cd\u8bd5\u539f\u4efb\u52a1',
        );
      const jobs = await session.request('GET', '/readings'),
        reading = jobs.items.find((r) => r.id === selectedReading());
      if (!reading || reading.state !== 'completed')
        throw new Error('\u8bf7\u5148\u5b8c\u6210\u539f\u6587\u8bfb\u53d6');
      const units = [];
      say('\u6b63\u5728\u51c6\u5907\u5b8c\u6574\u539f\u6587\u6e05\u5355\u2026');
      $('batch-start').disabled = true;
      for (let i = 0; i < reading.units; i++)
        units.push(await session.request('GET', '/readings/' + reading.id + '/units/' + i));
      await session.start(reading, units);
      await onStarted();
      await render();
      schedule();
    } catch (e) {
      say(e.message);
    } finally {
      busy = false;
      $('batch-start').disabled =
        !!session.job && !['completed', 'error', 'cancelled'].includes(session.job.state);
    }
  };
  for (const [id, action] of [
    ['batch-pause', 'pause'],
    ['batch-resume', 'resume'],
    ['batch-retry', 'retry'],
  ])
    $(id).onclick = async () => {
      try {
        await session.control(action);
        await render();
        schedule();
      } catch (e) {
        say(e.message);
      }
    };
  $('batch-invalid').onclick = async () => {
    try {
      await session.retryInvalid();
      await render();
      schedule();
    } catch (e) {
      say(e.message);
    }
  };
  $('batch-refresh').onclick = () => refresh().catch((e) => say(e.message));
  $('reading-version').addEventListener('change', () => {
    void refresh().catch((e) => say(e.message));
  });
  bridge.onStage((section) => {
    const next = section === 'analysis';
    if (next === visible) return;
    visible = next;
    if (visible) void refresh().catch((e) => say(e.message));
    else {
      clearTimeout(timer);
      preview.onclick();
    }
  });
  window.addEventListener('pagehide', () => {
    stopped = true;
    clearTimeout(timer);
  });
  await refresh();
}
