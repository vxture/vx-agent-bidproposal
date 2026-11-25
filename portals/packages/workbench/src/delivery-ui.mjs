/**
 * @package @bidproposal/workbench
 * @layer Presentation
 * @category BusinessUi
 * @author AI-Generated
 * @date 2026-11-25
 */
import { DeliverySession, syncDeliveryWorkflow } from './delivery.mjs';
import { autoSave } from './autosave.mjs';
const labels = {
  queued: '\u7b49\u5f85\u6392\u7248',
  running: '\u540e\u53f0\u6392\u7248\u4e2d',
  completed: '\u6210\u679c\u5df2\u4fdd\u5b58',
  failed: '\u6392\u7248\u672a\u5b8c\u6210',
};
export async function mountDelivery(bridge, workflow) {
  const run = new DeliverySession(bridge);
  await run.load();
  const el = (tag, text = '', cls = '') => {
    const n = document.createElement(tag);
    n.textContent = text;
    n.className = cls;
    return n;
  };
  const panel = el('section', '', 'delivery-studio');
  panel.id = 'delivery-panel';
  panel.hidden = true;
  document.querySelector('main').append(panel);
  const heading = el('header', '', 'delivery-heading'),
    headingText = el('div');
  headingText.append(
    el('p', 'DELIVERY / \u6210\u679c\u5bfc\u51fa', 'section-label'),
    el(
      'h1',
      '\u4ece\u7ae0\u8282\uff0c\u5230\u4e00\u4efd\u53ef\u4ea4\u4ed8\u7684\u6807\u4e66',
    ),
  );
  const create = el('button', '\u5408\u7a3f\u5e76\u6392\u7248', 'primary');
  create.id = 'delivery-create';
  const toggle = el('button', '\u4ea4\u4ed8\u9762\u677f', 'delivery-toggle');
  toggle.setAttribute('aria-controls', 'delivery-controls');
  heading.append(headingText, create, toggle);
  panel.append(heading);
  const status = el('p', '', 'delivery-status');
  status.setAttribute('role', 'status');
  panel.append(status);
  const layout = el('div', '', 'delivery-layout'),
    viewer = el('article', '', 'delivery-viewer'),
    side = el('aside', '', 'delivery-controls');
  side.id = 'delivery-controls';
  panel.append(layout);
  layout.append(viewer, side);
  let controlsOpen = window.innerWidth > 1100;
  function toggleControls() {
    panel.classList.toggle('is-controls-closed', !controlsOpen);
    side.hidden = !controlsOpen;
    toggle.setAttribute('aria-expanded', String(controlsOpen));
  }
  toggle.onclick = () => {
    controlsOpen = !controlsOpen;
    toggleControls();
  };
  toggleControls();
  const bar = el('div', '', 'delivery-preview-toolbar'),
    previous = el('button', '\u2190'),
    next = el('button', '\u2192'),
    pageLabel = el('span', 'PDF / \u5b9e\u9645\u6392\u7248'),
    zoom = document.createElement('select');
  previous.setAttribute('aria-label', '\u4e0a\u4e00\u9875');
  next.setAttribute('aria-label', '\u4e0b\u4e00\u9875');
  zoom.setAttribute('aria-label', '\u9884\u89c8\u7f29\u653e');
  for (const [value, text] of [
    ['fit', '\u9002\u5408\u5bbd\u5ea6'],
    ['1', '100%'],
    ['1.25', '125%'],
  ]) {
    const o = el('option', text);
    o.value = value;
    zoom.append(o);
  }
  bar.append(previous, pageLabel, next, zoom);
  viewer.append(bar);
  const canvasWrap = el('div', '', 'delivery-paper'),
    canvas = document.createElement('canvas'),
    empty = el('div', '', 'delivery-empty');
  canvas.setAttribute(
    'aria-label',
    '\u5bfc\u51fa PDF \u539f\u4ef6\u9884\u89c8',
  );
  canvas.hidden = true;
  empty.append(
    el('span', 'MARKDOWN \u2192 WORD \u2192 PDF', 'section-label'),
    el(
      'h2',
      '\u7ae0\u8282\u5df2\u5c31\u4f4d\uff0c\u8ba9\u6392\u7248\u81ea\u52a8\u5b8c\u6210',
    ),
    el(
      'p',
      '\u6309\u786e\u8ba4\u7684\u76ee\u5f55\u5408\u5e76\u5df2\u91c7\u7eb3\u6b63\u6587\uff0c\u5e94\u7528\u4f60\u7684\u6a21\u677f\uff0c\u751f\u6210\u76ee\u5f55\u4e0e\u9875\u7801\u3002\u6b64\u5904\u663e\u793a\u7684\u5c31\u662f\u5bfc\u51fa PDF\u3002',
    ),
  );
  canvasWrap.append(canvas, empty);
  viewer.append(canvasWrap);
  const setting = el('div', '', 'delivery-setting');
  setting.append(el('h2', '\u4ea4\u4ed8\u8bbe\u7f6e'));
  const titleLabel = el('label', '\u6210\u679c\u540d\u79f0'),
    title = document.createElement('input');
  title.maxLength = 120;
  title.value = run.settings.title;
  title.setAttribute('aria-label', '\u6210\u679c\u540d\u79f0');
  titleLabel.append(title);
  const templateLabel = el('label', '\u6392\u7248\u6a21\u677f'),
    template = document.createElement('select');
  template.setAttribute('aria-label', '\u5bfc\u51fa\u6a21\u677f');
  const base = el('option', '\u6807\u51c6 A4 \u6392\u7248');
  base.value = '';
  template.append(base);
  for (const f of run.files) {
    const o = el('option', f.name);
    o.value = f.id;
    template.append(o);
  }
  if (
    run.settings.template &&
    !run.files.some((f) => f.id === run.settings.template.id)
  ) {
    const o = el(
      'option',
      run.settings.template.name + ' \u00b7 \u5df2\u4e0d\u53ef\u7528',
    );
    o.value = run.settings.template.id;
    template.append(o);
  }
  template.value = run.settings.template?.id || '';
  templateLabel.append(template);
  const saveState = el('small', '\u8bbe\u7f6e\u81ea\u52a8\u4fdd\u5b58');
  setting.append(
    titleLabel,
    templateLabel,
    saveState,
    el(
      'p',
      '\u6a21\u677f\u6cbf\u7528\u7eb8\u5f20\u3001\u6837\u5f0f\u53ca\u9875\u7709\u9875\u811a\uff1b\u793a\u4f8b\u6b63\u6587\u7531\u5f53\u524d\u6807\u4e66\u66ff\u6362\u3002\u81ea\u5b9a\u4e49 DOCX \u53ef\u5728\u9879\u76ee\u914d\u7f6e\u4e2d\u5bfc\u5165\u3002',
      'muted',
    ),
  );
  side.append(setting);
  const saver = autoSave(() => run.saveSettings(), {
    onState: (state, e) =>
      (saveState.textContent =
        state === 'error'
          ? e.message
          : state === 'saved'
            ? '\u8bbe\u7f6e\u5df2\u4fdd\u5b58'
            : '\u6b63\u5728\u4fdd\u5b58\u2026'),
  });
  title.oninput = () => {
    run.settings.title = title.value;
    saver.change();
  };
  template.onchange = () => {
    const f = run.files.find((f) => f.id === template.value);
    run.settings.template = f ? { id: f.id, name: f.name, hash: f.hash } : null;
    saver.change();
  };
  const headerFields = el('div', '', 'delivery-setting');
  headerFields.append(el('h2', '\u9875\u7709\u4fe1\u606f'));
  for (const [key, label, max] of [
    ['projectName', '\u9879\u76ee\u540d\u79f0', 120],
    ['documentName', '\u9875\u7709\u6587\u4ef6\u540d\u79f0', 80],
    ['documentNumber', '\u62db\u6807\u7f16\u53f7', 80],
  ]) {
    const wrap = el('label', label),
      input = document.createElement('input');
    input.maxLength = max;
    input.value = run.settings.fields[key];
    input.setAttribute('aria-label', label);
    if (key === 'documentNumber')
      input.placeholder =
        '\u672a\u63d0\u4f9b\u65f6\u663e\u793a\u201c\u672a\u586b\u5199\u201d';
    input.oninput = () => {
      run.settings.fields[key] = input.value;
      saver.change();
      render();
    };
    wrap.append(input);
    headerFields.append(wrap);
  }
  headerFields.append(
    el(
      'p',
      '\u81ea\u52a8\u66ff\u6362\u5f53\u524d\u6a21\u677f\u7684\u9875\u7709\u5360\u4f4d\u6587\u5b57\u3002\u81ea\u5b9a\u4e49\u6a21\u677f\u7684\u9875\u7709\u9875\u811a\u53ef\u4f7f\u7528 {{projectName}}\u3001{{documentName}}\u3001{{documentNumber}}\u3002\u7f16\u53f7\u8bf7\u6309\u62db\u6807\u6587\u4ef6\u586b\u5199\u3002',
      'muted',
    ),
  );
  side.append(headerFields);
  const preflight = el('details', '', 'delivery-checks');
  preflight.open = true;
  const checkSummary = el('summary', '\u4ea4\u4ed8\u524d\u68c0\u67e5'),
    checks = el('div');
  preflight.append(checkSummary, checks);
  side.append(preflight);
  const downloads = el('div', '', 'delivery-downloads');
  side.append(downloads);
  for (const format of ['docx', 'pdf', 'md']) {
    const b = el(
      'button',
      format === 'md' ? 'Markdown \u6e90\u6587\u4ef6' : format.toUpperCase(),
    );
    b.dataset.format = format;
    b.onclick = () => {
      if (b.disabled) return;
      const id = run.selected;
      return act(async () => {
        const ticket = checkedDownload(
          await bridge.request(
            'POST',
            '/renders/' + id + '/downloads/' + format,
          ),
        );
        const a = document.createElement('a');
        a.href = bridge.downloadUrl(ticket.path);
        a.download = ticket.filename;
        a.rel = 'noreferrer';
        a.hidden = true;
        document.body.append(a);
        a.click();
        a.remove();
        downloadNotice =
          '\u5df2\u4ea4\u7ed9\u6d4f\u89c8\u5668\u4e0b\u8f7d\uff1a' +
          ticket.filename +
          '\u3002\u8bf7\u5728\u6d4f\u89c8\u5668\u4e2d\u67e5\u770b\u4fdd\u5b58\u72b6\u6001\u3002';
      });
    };
    downloads.append(b);
  }
  function checkedDownload(reply) {
    if (!reply.ok)
      throw new Error(
        reply.error?.message || '\u4e0b\u8f7d\u6682\u4e0d\u53ef\u7528',
      );
    const v = reply.body;
    if (
      !v ||
      !/^\/downloads\/[a-f0-9]{64}$/.test(v.path) ||
      typeof v.filename !== 'string'
    )
      throw new Error('\u4e0b\u8f7d\u5730\u5740\u65e0\u6548');
    return v;
  }
  const versionsLabel = el('label', '\u6210\u679c\u7248\u672c'),
    versions = document.createElement('select');
  versions.setAttribute('aria-label', '\u6210\u679c\u7248\u672c');
  versionsLabel.append(versions);
  side.append(versionsLabel);
  const source = el('p', '', 'delivery-source'),
    outline = el('details'),
    outlineTitle = el('summary', '\u5408\u7a3f\u76ee\u5f55'),
    outlineList = el('ol');
  outline.append(outlineTitle, outlineList);
  side.append(source, outline);
  const refresh = el('button', '\u5237\u65b0\u7ed3\u679c');
  side.append(refresh);
  let busy = false,
    visible = false,
    timer,
    pdf = null,
    pdfId = null,
    page = 1,
    renderTask = null,
    previewSequence = 0,
    actionError = '',
    downloadNotice = '';
  function render() {
    const job = run.job,
      active = run.jobs.some((j) => ['queued', 'running'].includes(j.state));
    create.disabled = busy || active;
    create.textContent = active
      ? '\u6b63\u5728\u540e\u53f0\u6392\u7248'
      : run.jobs.length
        ? '\u751f\u6210\u65b0\u7248\u6210\u679c'
        : '\u5408\u7a3f\u5e76\u6392\u7248';
    status.textContent =
      actionError ||
      downloadNotice ||
      (!job
        ? '\u7ae0\u8282\u4e0e\u8d44\u6599\u5df2\u4fdd\u5b58\u3002\u4e00\u6b21\u5408\u7a3f\uff0c\u540c\u65f6\u83b7\u5f97 Markdown\u3001DOCX \u548c PDF\u3002'
        : labels[job.state] +
          (job.pages ? ' \u00b7 ' + job.pages + ' \u9875' : '') +
          (job.state === 'running' || job.state === 'queued'
            ? '\uff0c\u53ef\u79bb\u5f00\u9875\u9762\u7ee7\u7eed\u5176\u4ed6\u5de5\u4f5c\u3002'
            : job.error
              ? '\uff1a' + job.error
              : ''));
    versions.replaceChildren();
    run.jobs.forEach((j, i) => {
      const o = el(
        'option',
        'V' +
          (run.jobs.length - i) +
          ' \u00b7 ' +
          new Date(j.createdAt).toLocaleString() +
          ' \u00b7 ' +
          labels[j.state],
      );
      o.value = j.id;
      versions.append(o);
    });
    versions.value = run.selected || '';
    versions.disabled = busy || !run.jobs.length;
    downloads.querySelectorAll('[data-format]').forEach((b) => {
      b.disabled = busy || !job?.formats.includes(b.dataset.format);
      b.setAttribute('aria-disabled', String(b.disabled));
      b.tabIndex = b.disabled ? -1 : 0;
    });
    refresh.disabled = busy;
    const warnings = run.manifest
      ? [...run.manifest.warnings]
      : [...run.warnings];
    if (run.stale)
      warnings.unshift(
        '\u6b63\u6587\u6216\u4f9d\u636e\u5df2\u66f4\u65b0\uff1b\u5f53\u524d\u9884\u89c8\u4e3a\u5386\u53f2\u5feb\u7167\uff0c\u8bf7\u751f\u6210\u65b0\u7248',
      );
    if (
      job?.pages &&
      run.manifest?.targetPages &&
      Math.abs(job.pages - run.manifest.targetPages) /
        run.manifest.targetPages >
        0.2
    )
      warnings.push(
        '\u5b9e\u9645 ' +
          job.pages +
          ' \u9875\uff0c\u4e0e\u89c4\u5212 ' +
          run.manifest.targetPages +
          ' \u9875\u5b58\u5728\u5dee\u5f02',
      );
    checks.replaceChildren(...warnings.map((w) => el('p', w)));
    checks.append(
      el(
        'p',
        '\u6210\u679c\u4e3a\u5f85\u6838\u9a8c\u8349\u7a3f\uff1b\u5bfc\u51fa\u4e0d\u4ee3\u8868\u5ba1\u6838\u95ee\u9898\u5df2\u89e3\u51b3\u3002',
        'muted',
      ),
    );
    checkSummary.textContent =
      '\u4ea4\u4ed8\u524d\u68c0\u67e5 \u00b7 ' +
      warnings.length +
      ' \u9879\u63d0\u793a';
    source.textContent = run.manifest
      ? '\u6b63\u6587 v' +
        run.manifest.revisions.bid_draft +
        ' \u00b7 ' +
        (run.manifest.template?.name || '\u6807\u51c6 A4')
      : '\u4f7f\u7528\u5df2\u91c7\u7eb3\u6b63\u6587 v' + run.draft.revision;
    outlineList.replaceChildren(
      ...(run.manifest?.chapters || run.plan.value.outline).map((c) =>
        el('li', c.title),
      ),
    );
    if (run.settingsChanged)
      checks.prepend(
        el(
          'p',
          '\u9875\u7709\u6216\u4ea4\u4ed8\u8bbe\u7f6e\u5df2\u66f4\u65b0\uff1b\u5f53\u524d\u9884\u89c8\u4fdd\u7559\u539f\u7248\u4fe1\u606f\uff0c\u8bf7\u751f\u6210\u65b0\u7248\u6210\u679c',
        ),
      );
    checkSummary.textContent =
      '\u4ea4\u4ed8\u524d\u68c0\u67e5 \u00b7 ' +
      (warnings.length + Number(run.settingsChanged)) +
      ' \u9879\u63d0\u793a';
    syncDeliveryWorkflow(workflow, run.jobs, run.stale);
    previous.disabled = !pdf || page <= 1;
    next.disabled = !pdf || page >= pdf.numPages;
  }
  async function draw() {
    if (!pdf || !visible) return;
    renderTask?.cancel();
    const document = pdf,
      n = page,
      seq = ++previewSequence;
    const p = await document.getPage(n);
    if (seq !== previewSequence) return;
    const first = p.getViewport({ scale: 1 }),
      width = Math.max(240, canvasWrap.clientWidth - 48),
      scale =
        zoom.value === 'fit'
          ? Math.min(1.5, width / first.width)
          : Number(zoom.value),
      view = p.getViewport({ scale }),
      ratio = Math.min(devicePixelRatio || 1, 2);
    canvas.width = Math.round(view.width * ratio);
    canvas.height = Math.round(view.height * ratio);
    canvas.style.width = view.width + 'px';
    canvas.style.height = view.height + 'px';
    canvas.hidden = false;
    empty.hidden = true;
    renderTask = p.render({
      canvasContext: canvas.getContext('2d'),
      viewport: view,
      transform: ratio === 1 ? null : [ratio, 0, 0, ratio, 0, 0],
    });
    try {
      await renderTask.promise;
    } catch (e) {
      if (e.name !== 'RenderingCancelledException') throw e;
    }
    pageLabel.textContent = n + ' / ' + pdf.numPages + ' \u9875';
    render();
  }
  async function preview() {
    const job = run.job;
    if (pdfId === job?.id && pdf) {
      await draw();
      return;
    }
    if (job?.state !== 'completed') {
      ++previewSequence;
      renderTask?.cancel();
      if (pdf) await pdf.destroy();
      pdf = null;
      pdfId = null;
      canvas.hidden = true;
      empty.hidden = false;
      pageLabel.textContent = 'PDF / \u5b9e\u9645\u6392\u7248';
      return;
    }
    const { getDocument, GlobalWorkerOptions } =
      await import('./vendor-pdf.mjs');
    GlobalWorkerOptions.workerSrc = new URL(
      './vendor-pdf-worker.mjs',
      import.meta.url,
    ).href;
    const id = job.id,
      bytes = (await run.file('pdf')).bytes;
    const loaded = await getDocument({
      data: bytes,
      isEvalSupported: false,
      useSystemFonts: true,
    }).promise;
    if (run.selected !== id) {
      await loaded.destroy();
      return;
    }
    if (pdf) await pdf.destroy();
    pdf = loaded;
    pdfId = id;
    page = 1;
    await draw();
  }
  async function read() {
    await run.sources();
    await run.sync();
    render();
    await preview();
  }
  function schedule() {
    clearTimeout(timer);
    if (
      visible &&
      run.jobs.some((j) => ['queued', 'running'].includes(j.state))
    )
      timer = setTimeout(() => void act(read), 2200);
  }
  async function act(fn) {
    if (busy) return;
    busy = true;
    actionError = '';
    downloadNotice = '';
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
  create.onclick = () =>
    act(async () => {
      await saver.flush();
      await run.create();
      await workflow.mark('export', false, true, run.job.createdAt);
      await read();
    });
  refresh.onclick = () => act(read);
  versions.onchange = () => {
    const selected = versions.value;
    return act(async () => {
      run.selected = selected;
      await run.sync();
      await preview();
    });
  };
  previous.onclick = () => {
    page = Math.max(1, page - 1);
    void act(draw);
  };
  next.onclick = () => {
    page = Math.min(pdf.numPages, page + 1);
    void act(draw);
  };
  zoom.onchange = () => void act(draw);
  bridge.onStage((section) => {
    visible = section === 'export';
    if (visible) void act(read);
    else clearTimeout(timer);
  });
  window.addEventListener('pagehide', () => {
    clearTimeout(timer);
    void saver.flush().catch(() => {});
  });
  new ResizeObserver(() => {
    if (visible && pdf && !busy) void act(draw);
  }).observe(viewer);
  render();
  return { run, panel };
}
