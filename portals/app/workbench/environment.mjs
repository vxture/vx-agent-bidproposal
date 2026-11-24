/**
 * @package @bidproposal/app
 * @layer Presentation
 * @category Runtime
 * @author AI-Generated
 * @date 2026-11-25
 */
import { StageNavigation } from '@bidproposal/workbench/runtime';

/** A same-origin transport; the server remains authoritative for identity. */
export function createRuntime({ href = location.href, fetcher = fetch, publish, review = () => { throw Error('Review unavailable'); } } = {}) {
  const page = new URL(href);
  const projectId = page.searchParams.get('project');
  if (!/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(projectId || '')) throw Error('Invalid project');
  const base = new URL('/api/workbench/projects/' + projectId + '/', page.origin);
  const navigation = new StageNavigation();
  navigation.select('analysis');
  const downloads = new Set();
  const controller = new AbortController();
  let nav;
  const buttons = new Map();
  const renderNavigation = items => {
    if (!nav) {
      nav = document.createElement('nav');
      nav.className = 'web-stage-navigation';
      nav.setAttribute('aria-label', '\u7f16\u6807\u6d41\u7a0b');
      document.querySelector('main').before(nav);
    }
    for (const item of items) {
      let button = buttons.get(item.id);
      if (!button) {
        button = document.createElement('button');
        button.type = 'button';
        button.className = 'step';
        button.onclick = () => navigation.select(item.id);
        buttons.set(item.id, button);
        nav.append(button);
      }
      button.textContent = item.label;
      button.dataset.state = item.state;
      button.classList.toggle('active', navigation.current === item.id);
      if (navigation.current === item.id) button.setAttribute('aria-current', 'step');
      else button.removeAttribute('aria-current');
    }
  };
  navigation.subscribe(section => {
    for (const [id, button] of buttons) {
      button.classList.toggle('active', id === section);
      if (id === section) button.setAttribute('aria-current', 'step');
      else button.removeAttribute('aria-current');
    }
  });
  return {
    async request(method, path, body) {
      if (!['GET', 'POST', 'PUT', 'DELETE'].includes(method) || !/^\/[a-zA-Z0-9_/-]+$/.test(path) || path.includes('//')) throw Error('Invalid runtime request');
      const response = await fetcher(new URL(path.slice(1), base).href, {
        method, credentials: 'same-origin', cache: 'no-store', redirect: 'error', signal: controller.signal,
        headers: body === undefined ? {} : { 'content-type': 'application/json' },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      });
      const value = await response.json();
      if (response.ok && method === 'POST' && /^\/renders\/[A-Za-z0-9_-]+\/downloads\/(pdf|docx|md)$/.test(path) && /^\/downloads\/[a-f0-9]{64}$/.test(value.path)) downloads.add(value.path);
      return response.ok ? { ok: true, status: response.status, body: value } : { ok: false, status: response.status, error: { message: value.error?.message || 'Request failed' } };
    },
    review,
    onStage: listener => navigation.subscribe(listener),
    navigate: section => navigation.select(section),
    replayNavigation: () => navigation.replay(),
    publishNavigation: publish || renderNavigation,
    downloadUrl(path) {
      if (!downloads.has(path)) throw Error('Unissued download');
      return new URL(path, page.origin).href;
    },
    close() { controller.abort(); navigation.close(); downloads.clear(); nav?.remove(); },
  };
}
