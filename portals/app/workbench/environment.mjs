/**
 * @package @bidproposal/app
 * @layer Presentation
 * @category Runtime
 * @author AI-Generated
 * @date 2026-11-25
 */
import { StageNavigation } from '@bidproposal/workbench/runtime';

/** A same-origin transport; the server remains authoritative for identity. */
export function createRuntime({
  href = location.href,
  fetcher = fetch,
  publish,
  review = () => {
    throw new Error('Review unavailable');
  },
} = {}) {
  const page = new URL(href);
  const projectId = page.searchParams.get('project');
  if (!/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(projectId || ''))
    throw new Error('Invalid project');
  if (typeof publish !== 'function') throw new Error('Workflow presentation is not attached');
  const base = new URL('/api/workbench/projects/' + projectId + '/', page.origin);
  const navigation = new StageNavigation();
  navigation.select('analysis');
  const downloads = new Set();
  const controller = new AbortController();
  return {
    async request(method, path, body) {
      if (
        !['GET', 'POST', 'PUT', 'DELETE'].includes(method) ||
        !/^\/[a-zA-Z0-9_/-]+$/.test(path) ||
        path.includes('//')
      )
        throw new Error('Invalid runtime request');
      const response = await fetcher(new URL(path.slice(1), base).href, {
        method,
        credentials: 'same-origin',
        cache: 'no-store',
        redirect: 'error',
        signal: controller.signal,
        headers: body === undefined ? {} : { 'content-type': 'application/json' },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      });
      const value = await response.json();
      if (
        response.ok &&
        method === 'POST' &&
        /^\/renders\/[A-Za-z0-9_-]+\/downloads\/(pdf|docx|md)$/.test(path) &&
        /^\/downloads\/[a-f0-9]{64}$/.test(value.path)
      )
        downloads.add(value.path);
      return response.ok
        ? { ok: true, status: response.status, body: value }
        : {
            ok: false,
            status: response.status,
            error: { message: value.error?.message || 'Request failed' },
          };
    },
    review,
    onStage: (listener) => navigation.subscribe(listener),
    navigate: (section) => navigation.select(section),
    replayNavigation: () => navigation.replay(),
    publishNavigation: publish,
    downloadUrl(path) {
      if (!downloads.has(path)) throw new Error('Unissued download');
      return new URL(path, page.origin).href;
    },
    close() {
      controller.abort();
      navigation.close();
      downloads.clear();
    },
  };
}
