/**
 * @package @bidproposal/workbench
 * @layer Presentation
 * @category DocumentViewer
 * @author AI-Generated
 * @date 2026-11-26
 */
/** Continuous PDF.js pages with a real selectable text layer and bounded canvases. */
export class ContinuousPdfViewer {
  constructor(container, onPage, onError) {
    this.container = container;
    this.onPage = onPage;
    this.onError = onError;
    this.pages = new Map();
    this.queue = [];
    this.active = 0;
    this.generation = 0;
    this.current = 1;
    this.observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        const row = this.pages.get(Number(entry.target.dataset.page));
        if (!row) continue;
        if (entry.isIntersecting && !row.ready && !row.loading) {
          row.loading = true;
          this.queue.push(row);
        }
      }
      this.releaseDistant(this.container.getBoundingClientRect().top);
      this.pump();
    }, { root: container, rootMargin: '650px 0px' });
    container.tabIndex = 0;
    container.setAttribute('aria-label', '\u8fde\u7eed PDF \u9605\u8bfb\u533a');
    container.addEventListener('scroll', () => {
      if (this.scrollFrame) return;
      this.scrollFrame = requestAnimationFrame(() => {
        this.scrollFrame = null;
        const top = container.getBoundingClientRect().top;
        for (const [number, row] of this.pages) {
          if (row.node.getBoundingClientRect().bottom > top + 60) {
            this.current = number;
            this.onPage(number, this.pdf?.numPages || 0);
            break;
          }
        }
        // An observer emits only on boundary crossings. Pages already outside
        // its margin still need eviction as scrolling carries them farther away.
        this.releaseDistant(top);
      });
    });
  }
  releaseDistant(top) {
    const selection = window.getSelection();
    for (const row of this.pages.values()) {
      if (!row.ready || Math.abs(row.node.getBoundingClientRect().top - top) <= 3000) continue;
      if (selection && !selection.isCollapsed && selection.containsNode(row.node, true)) continue;
      row.canvas.width = row.canvas.height = 0;
      row.node.replaceChildren();
      row.ready = false;
    }
  }
  reset() {
    this.generation++;
    this.observer.disconnect();
    for (const row of this.pages.values()) {
      row.task?.cancel();
      row.textTask?.cancel();
      if (row.canvas) row.canvas.width = row.canvas.height = 0;
    }
    this.queue.length = 0;
    this.pages.clear();
    this.container.querySelectorAll('.pdf-page').forEach((node) => node.remove());
    this.pdf = null;
    this.key = '';
  }
  async show(pdf, zoom = 'fit') {
    const width = Math.round(this.container.clientWidth);
    const key = zoom + ':' + width;
    if (this.pdf === pdf && this.key === key) return;
    const page = this.pdf === pdf ? this.current : 1;
    this.reset();
    if (!pdf) return;
    this.pdf = pdf;
    this.key = key;
    const generation = this.generation, first = await pdf.getPage(1);
    if (generation !== this.generation) return;
    const base = first.getViewport({ scale: 1 });
    this.scale = zoom === 'fit' ? Math.min(1.5, Math.max(160, width - 48) / base.width) : Number(zoom);
    const view = first.getViewport({ scale: this.scale });
    for (let number = 1; number <= pdf.numPages; number++) {
      const node = document.createElement('section');
      node.className = 'pdf-page';
      node.dataset.page = number;
      node.setAttribute('aria-label', '\u7b2c ' + number + ' \u9875');
      node.style.width = view.width + 'px';
      node.style.height = view.height + 'px';
      this.container.append(node);
      this.pages.set(number, { number, node, generation, pdf, scale: this.scale });
      this.observer.observe(node);
    }
    this.jump(page, false);
  }
  jump(number, smooth = true) {
    const row = this.pages.get(Math.max(1, Math.min(Number(number) || 1, this.pdf?.numPages || 1)));
    if (!row) return;
    this.current = row.number;
    this.container.scrollTo({ top: row.node.offsetTop - 24, behavior: smooth ? 'smooth' : 'instant' });
    this.onPage(this.current, this.pdf.numPages);
  }
  pump() {
    while (this.active < 2 && this.queue.length) {
      const row = this.queue.shift();
      if (row.generation !== this.generation) continue;
      this.active++;
      void this.render(row).catch((error) => {
        if (row.generation !== this.generation || error.name === 'RenderingCancelledException') return;
        const retry = document.createElement('button');
        retry.textContent = '\u672c\u9875\u52a0\u8f7d\u5931\u8d25\uff0c\u70b9\u51fb\u91cd\u8bd5';
        retry.onclick = () => { row.loading = true; this.queue.push(row); this.pump(); };
        row.node.replaceChildren(retry);
        this.onError(error);
      }).finally(() => {
        row.loading = false;
        this.active--;
        this.pump();
      });
    }
  }
  async render(row) {
    const page = await row.pdf.getPage(row.number);
    if (row.generation !== this.generation) return;
    const viewport = page.getViewport({ scale: row.scale }),
      ratio = Math.min(devicePixelRatio || 1, 2), canvas = document.createElement('canvas'),
      layer = document.createElement('div');
    layer.className = 'textLayer';
    canvas.setAttribute('aria-hidden', 'true');
    canvas.width = Math.ceil(viewport.width * ratio);
    canvas.height = Math.ceil(viewport.height * ratio);
    canvas.style.width = viewport.width + 'px';
    canvas.style.height = viewport.height + 'px';
    row.node.style.width = viewport.width + 'px';
    row.node.style.height = viewport.height + 'px';
    row.node.style.setProperty('--total-scale-factor', row.scale);
    row.node.replaceChildren(canvas, layer);
    row.canvas = canvas;
    row.task = page.render({ canvasContext: canvas.getContext('2d'), viewport,
      transform: ratio === 1 ? null : [ratio, 0, 0, ratio, 0, 0] });
    await row.task.promise;
    if (row.generation !== this.generation) return;
    const { TextLayer } = await import('./vendor-pdf.mjs');
    row.textTask = new TextLayer({ textContentSource: page.streamTextContent(), container: layer, viewport });
    await row.textTask.render();
    row.ready = true;
  }
}
