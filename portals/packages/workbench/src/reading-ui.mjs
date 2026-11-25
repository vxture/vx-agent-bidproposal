/**
 * @package @bidproposal/workbench
 * @layer Presentation
 * @category BusinessUi
 * @author AI-Generated
 * @date 2026-11-25
 */
import { Readings, readingState, flagLabel } from './reading.mjs';
import { autoSave } from './autosave.mjs';
export async function mountReading(bridge) {
  const panel = document.createElement('section');
  panel.id = 'reading-panel';
  panel.className = 'reading-studio';
  panel.hidden = true;
  panel.innerHTML = `<div class="reading-hero"><p class="eyebrow">01 / &#25307;&#26631;&#35299;&#35835;</p><h1>&#20174;&#21407;&#20214;&#65292;&#24314;&#31435;&#21487;&#26680;&#23545;&#30340;&#38656;&#27714;</h1><p class="muted">&#20808;&#35835;&#21462;&#25307;&#26631;&#25991;&#20214;&#12290;&#21407;&#25991;&#21644;&#20301;&#32622;&#33258;&#21160;&#20445;&#23384;&#65292;&#20026;&#21518;&#32493;&#26234;&#33021;&#35299;&#35835;&#20445;&#30041;&#20381;&#25454;&#12290;</p></div>
 <div class="reading-toolbar"><label for="reading-file">&#25307;&#26631;&#36164;&#26009;</label><select id="reading-file"></select><button id="reading-start" class="primary">&#35835;&#21462;&#24182;&#20445;&#23384;&#21407;&#25991;</button><button id="reading-refresh">&#21047;&#26032;</button><button id="reading-toggle" aria-expanded="false">&#20301;&#32622;&#19982;&#24453;&#26680;&#23545;&#39033;</button></div>
 <p id="reading-notice" class="reading-notice" role="status"></p>
 <div class="reading-version"><label for="reading-version">&#24050;&#20445;&#23384;&#30340;&#29256;&#26412;</label><select id="reading-version"></select><span id="reading-progress"></span></div>
 <div class="reading-layout"><article class="reading-document"><div class="reading-pagebar"><strong id="reading-location">&#21407;&#25991;&#24555;&#29031;</strong><button id="reading-prev" aria-label="&#19978;&#19968;&#39029;">&#8592;</button><label for="reading-page">&#39029; / &#22359;</label><input id="reading-page" type="number" min="1" value="1"><span id="reading-total"></span><button id="reading-next" aria-label="&#19979;&#19968;&#39029;">&#8594;</button></div><pre id="reading-text"></pre><div id="reading-tables"></div></article>
 <aside id="reading-info" class="reading-info" hidden><h2>&#21407;&#25991;&#20301;&#32622;&#19982;&#24453;&#26680;&#23545;&#39033;</h2><p id="reading-source"></p><p id="reading-hash"></p><div id="reading-flags"></div><details><summary>&#35835;&#21462;&#29256;&#26412;</summary><pre id="reading-engine"></pre></details><p class="muted">&#36825;&#26159;&#21407;&#25991;&#36716;&#20889;&#65292;&#22270;&#29255;&#21450;&#22797;&#26434;&#34920;&#26684;&#38656;&#23545;&#29031;&#21407;&#20214;&#12290;&#35835;&#21462;&#23436;&#25104;&#19981;&#20195;&#34920;&#25152;&#26377;&#38656;&#27714;&#24050;&#23436;&#25972;&#35299;&#35835;&#12290;</p></aside></div>`;
  document.getElementById('requirements-panel').before(panel);
  const sourceConfig = document.createElement('details');
  sourceConfig.className = 'reading-source-config';
  const sourceSummary = document.createElement('summary');
  sourceSummary.textContent = '\u62db\u6807\u539f\u4ef6\u4e0e\u7248\u672c';
  sourceConfig.append(sourceSummary);
  panel.querySelector('.reading-toolbar').before(sourceConfig);
  for (const selector of ['.reading-toolbar', '#reading-notice', '.reading-version'])
    sourceConfig.append(panel.querySelector(selector));
  let configInitialized = false;
  const $ = (id) => document.getElementById(id),
    model = new Readings(bridge);
  let selected = null,
    index = 0,
    timer,
    stopped = false,
    visible = false;
  const say = (s) => {
    $('reading-notice').textContent = s;
  };
  const selectionSaver = autoSave(() => model.remember(selected), {
    onState: (state, e) => {
      if (state === 'error') say(e.message);
    },
  });
  const stream = document.createElement('div');
  stream.id = 'reading-continuous';
  stream.className = 'reading-continuous';
  stream.setAttribute('aria-label', '\u8fde\u7eed\u539f\u6587');
  $('reading-text').replaceWith(stream);
  $('reading-tables').remove();
  const units = new Map(), loaded = new Map(), loading = new Set();
  let streamJob = '', streamSequence = 0, activeLoads = 0;
  const queue = [];
  const observer = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      const n = Number(entry.target.dataset.unit);
      if (!loaded.has(n) && !loading.has(n)) {
        loading.add(n);
        queue.push(n);
      }
    }
    void loadQueue();
  }, { rootMargin: '700px 0px' });
  async function loadQueue() {
    while (activeLoads < 3 && queue.length) {
      const n = queue.shift(), sequence = streamSequence,
        job = model.jobs.find((row) => row.id === streamJob), node = units.get(n);
      if (!job || !node) continue;
      activeLoads++;
      void model.unit(job.id, n).then((unit) => {
        if (sequence !== streamSequence) return;
        loaded.set(n, unit);
        node.replaceChildren();
        const heading = document.createElement('header');
        heading.textContent = unit.location.page
          ? '\u7b2c ' + unit.location.page + ' \u9875'
          : '\u539f\u6587\u5757 ' + (n + 1);
        const content = document.createElement('pre');
        content.textContent = unit.text || '\u672c\u9875\u65e0\u53ef\u63d0\u53d6\u6587\u5b57\uff0c\u8bf7\u5bf9\u7167\u539f\u4ef6\u3002';
        node.append(heading, content);
        for (const data of unit.tables || []) {
          const table = document.createElement('table');
          table.className = 'reading-grid';
          for (const row of data.rows) {
            const tr = document.createElement('tr');
            for (const value of row) {
              const td = document.createElement('td');
              td.textContent = value === null ? '\u2196 \u5408\u5e76\u4f4d\u7f6e' : value;
              tr.append(td);
            }
            table.append(tr);
          }
          const wrap = document.createElement('div');
          wrap.className = 'reading-table-scroll';
          wrap.append(table);
          node.append(wrap);
        }
        node.classList.add('is-loaded');
        if (n === index) showFlags(job, unit);
      }).catch((error) => {
        if (sequence !== streamSequence) return;
        const retry = document.createElement('button');
        retry.textContent = '\u52a0\u8f7d\u5931\u8d25\uff0c\u70b9\u51fb\u91cd\u8bd5';
        retry.onclick = () => { loading.add(n); queue.push(n); void loadQueue(); };
        node.replaceChildren(retry);
        say(error.message);
      }).finally(() => {
        activeLoads--;
        if (sequence === streamSequence) loading.delete(n);
        void loadQueue();
      });
    }
  }
  function showFlags(job, unit) {
    $('reading-flags').replaceChildren();
    const flags = new Set([...(job.format === 'docx' ? job.flags || [] : []), ...unit.flags]);
    for (const flag of flags) {
      const note = document.createElement('p');
      note.className = 'reading-warning';
      note.textContent = flagLabel(flag);
      $('reading-flags').append(note);
    }
    $('reading-location').textContent = '\u8fde\u7eed\u539f\u6587 \u00b7 ' + (index + 1) + ' / ' + job.units;
  }
  function jumpTo(n) {
    const job = model.jobs.find((row) => row.id === selected);
    index = Math.max(0, Math.min(n, (job?.units || 1) - 1));
    units.get(index)?.scrollIntoView({ block: 'start', behavior: 'smooth' });
    $('reading-page').value = index + 1;
    if (loaded.has(index)) showFlags(job, loaded.get(index));
  }
  let scrollFrame;
  document.addEventListener('scroll', () => {
    if (!visible || scrollFrame) return;
    scrollFrame = requestAnimationFrame(() => {
      scrollFrame = null;
      const nearest = [...units].find(([, node]) => node.getBoundingClientRect().bottom > 100);
      if (!nearest) return;
      index = nearest[0];
      $('reading-page').value = index + 1;
      $('reading-prev').disabled = index === 0;
      $('reading-next').disabled = index >= units.size - 1;
      if (loaded.has(index)) showFlags(model.jobs.find((row) => row.id === streamJob), loaded.get(index));
    });
  }, true);
  function render() {
    const fileId = $('reading-file').value;
    $('reading-file').replaceChildren();
    for (const f of model.files) {
      const o = new Option(f.name, f.id);
      $('reading-file').add(o);
    }
    if (model.files.some((f) => f.id === (fileId || model.selection?.fileId)))
      $('reading-file').value = fileId || model.selection.fileId;
    const version = $('reading-version');
    version.replaceChildren();
    for (const j of model.jobs) {
      const o = new Option(
        j.name + ' / ' + new Date(j.createdAt).toLocaleString() + ' / ' + readingState(j),
        j.id,
      );
      version.add(o);
    }
    if (!model.jobs.some((j) => j.id === selected)) {
      selected =
        model.jobs.find((j) => j.id === model.selection?.readingId)?.id || model.jobs[0]?.id;
      index = 0;
    }
    version.value = selected || '';
    const j = model.jobs.find((j) => j.id === selected),
      active = model.jobs.some((j) => ['queued', 'running'].includes(j.state));
    if (!configInitialized) {
      sourceConfig.open = !j || j.state !== 'completed';
      configInitialized = true;
    }
    sourceSummary.textContent = j
      ? j.name +
        ' \u00b7 ' +
        j.units +
        (j.format === 'pdf' ? ' \u9875' : ' \u5757') +
        ' \u00b7 ' +
        readingState(j)
      : '\u9009\u62e9\u62db\u6807\u539f\u4ef6\u5f00\u59cb';
    $('reading-start').disabled = active || !model.files.length;
    $('reading-file').disabled = active;
    $('reading-start').textContent = active
      ? '\u6b63\u5728\u540e\u53f0\u8bfb\u53d6\u2026'
      : '\u8bfb\u53d6\u5e76\u4fdd\u5b58\u539f\u6587';
    $('reading-progress').textContent = j
      ? readingState(j) +
        ' \u00b7 ' +
        j.units +
        '/' +
        (j.total ?? '\u2026') +
        (j.format === 'pdf' ? ' \u9875' : ' \u5757')
      : '';
    if (!model.files.length)
      say(
        '\u8bf7\u5148\u5728\u57fa\u7840\u914d\u7f6e\u7684\u9879\u76ee\u6587\u4ef6\u4e2d\u5bfc\u5165 PDF\u3001DOCX \u6216 Markdown\u3002',
      );
    else if (j?.state === 'failed')
      say(
        (j.error || '\u8bfb\u53d6\u672a\u5b8c\u6210') +
          ' \u5df2\u4fdd\u5b58\u7684\u539f\u6587\u5757\u4ecd\u53ef\u67e5\u770b\uff0c\u53ef\u65b0\u5efa\u5feb\u7167\u91cd\u8bd5\u3002',
      );
    else if (active)
      say(
        '\u6b63\u5728\u540e\u53f0\u8bfb\u53d6\u5e76\u81ea\u52a8\u4fdd\u5b58\uff0c\u53ef\u4ee5\u79bb\u5f00\u9875\u9762\u3002',
      );
    else if (j)
      say(
        '\u539f\u6587\u5feb\u7167\u5df2\u4fdd\u5b58\u3002\u56fe\u7247\u4e0e\u8868\u683c\u5f02\u5e38\u4f1a\u4fdd\u7559\u5f85\u6838\u5bf9\u63d0\u793a\uff1b\u53ef\u542f\u52a8\u4e0b\u65b9\u7684\u667a\u80fd\u5206\u6279\u89e3\u8bfb\u3002',
      );
    else
      say(
        '\u9009\u62e9\u62db\u6807\u539f\u4ef6\u5f00\u59cb\u3002\u6392\u7248\u6a21\u677f\u4e0d\u9700\u8981\u5728\u8fd9\u91cc\u8bfb\u53d6\u3002',
      );
    index = Math.max(0, Math.min(index, (j?.units || 1) - 1));
    $('reading-page').value = index + 1;
    $('reading-page').max = j?.units || 1;
    $('reading-total').textContent = '/ ' + (j?.units || 0);
    $('reading-prev').disabled = !j || index === 0;
    $('reading-next').disabled = !j || index >= j.units - 1;
    $('reading-page').disabled = !j?.units;
    $('reading-source').textContent = j
      ? j.name +
        '\n' +
        (j.sourceAvailable === false
          ? '\u539f\u5bfc\u5165\u7248\u672c\u5df2\u79fb\u9664\uff0c\u5feb\u7167\u4ecd\u4fdd\u7559'
          : '\u5df2\u7ed1\u5b9a\u5bfc\u5165\u65f6\u7684\u7248\u672c')
      : '';
    $('reading-hash').textContent = j ? 'SHA256 ' + j.hash : '';
    $('reading-engine').textContent = JSON.stringify(j?.engine || {}, null, 2);
    const f = model.files.find((f) => f.id === $('reading-file').value);
    if (f && model.versions(f).length && !active)
      say(
        '\u540c\u540d\u6587\u4ef6\u5b58\u5728\u4e0d\u540c\u7248\u672c\u3002\u65b0\u8bfb\u53d6\u4f1a\u5355\u72ec\u4fdd\u5b58\uff0c\u65e7\u5feb\u7167\u548c\u9700\u6c42\u4fdd\u7559\u3002',
      );
    void showUnit(j);
  }
  async function showUnit(j) {
    if (streamJob !== (j?.id || '')) {
      streamJob = j?.id || '';
      streamSequence++;
      queue.length = 0;
      units.clear(); loaded.clear(); loading.clear(); observer.disconnect();
      stream.replaceChildren();
    }
    if (!j?.units) {
      stream.textContent = '\u8bfb\u53d6\u540e\uff0c\u539f\u6587\u5c06\u5728\u6b64\u8fde\u7eed\u5c55\u793a\u3002';
      return;
    }
    if (!units.size) stream.replaceChildren();
    for (let n = units.size; n < j.units; n++) {
      const node = document.createElement('section');
      node.className = 'reading-unit';
      node.dataset.unit = n;
      node.textContent = '\u539f\u6587 ' + (n + 1) + ' \u00b7 \u52a0\u8f7d\u4e2d\u2026';
      if (j.format === 'pdf') node.classList.add('is-pdf');
      units.set(n, node);
      stream.append(node);
      observer.observe(node);
    }
    if (loaded.has(index)) showFlags(j, loaded.get(index));
    else if (!loading.has(index)) { loading.add(index); queue.unshift(index); void loadQueue(); }
  }
  function schedule() {
    clearTimeout(timer);
    if (visible && !stopped && model.jobs.some((j) => ['queued', 'running'].includes(j.state)))
      timer = setTimeout(
        () =>
          refresh().catch((e) => {
            say(e.message);
            schedule();
          }),
        1500,
      );
  }
  async function refresh() {
    await model.load();
    render();
    schedule();
  }
  $('reading-refresh').onclick = () => refresh().catch((e) => say(e.message));
  $('reading-file').onchange = render;
  $('reading-version').onchange = () => {
    selected = $('reading-version').value;
    index = 0;
    selectionSaver.change();
    render();
  };
  $('reading-start').onclick = async () => {
    try {
      const f = model.files.find((f) => f.id === $('reading-file').value);
      if (!f) return;
      $('reading-start').disabled = true;
      const j = await model.start(f);
      selected = j.id;
      index = 0;
      await refresh();
      selectionSaver.change();
      await selectionSaver.flush();
    } catch (e) {
      say(e.message);
      $('reading-start').disabled = false;
    }
  };
  $('reading-prev').onclick = () => {
    jumpTo(index - 1);
  };
  $('reading-next').onclick = () => {
    jumpTo(index + 1);
  };
  $('reading-page').onchange = () => {
    const page = Number($('reading-page').value);
    jumpTo(Number.isSafeInteger(page) ? page - 1 : 0);
  };
  $('reading-page').onkeydown = (event) => { if (event.key === 'Enter') $('reading-page').onchange(); };
  $('reading-toggle').onclick = () => {
    const info = $('reading-info');
    info.hidden = !info.hidden;
    panel.classList.toggle('reading-with-info', !info.hidden);
    $('reading-toggle').setAttribute('aria-expanded', String(!info.hidden));
  };
  bridge.onStage((section) => {
    const next = section === 'analysis';
    if (next === visible) return;
    visible = next;
    if (visible) void refresh().catch((e) => say(e.message));
    else clearTimeout(timer);
  });
  window.addEventListener('pagehide', () => {
    stopped = true;
    clearTimeout(timer);
    void selectionSaver.flush().catch(() => {});
  });
  try {
    await refresh();
  } catch (e) {
    say(
      e.status === 503
        ? '\u5f53\u524d\u8fd0\u884c\u73af\u5883\u672a\u5b89\u88c5\u672c\u5730\u8bfb\u53d6\u80fd\u529b\uff0c\u8bf7\u8054\u7cfb\u7ba1\u7406\u5458\u68c0\u67e5\u8fd0\u884c\u73af\u5883\u3002'
        : e.message,
    );
    $('reading-start').disabled = true;
  }
  return { flushSelection: () => selectionSaver.flush() };
}
