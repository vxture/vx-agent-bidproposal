/**
 * @package @bidproposal/workbench
 * @layer Presentation
 * @category Business
 * @author AI-Generated
 * @date 2026-11-25
 */
import { DocumentError } from './errors.mjs';
export const STAGES = [
  { id: 'analysis', label: '\u62db\u6807\u89e3\u8bfb' },
  { id: 'requirements', label: '\u9700\u6c42\u786e\u8ba4' },
  { id: 'planning', label: '\u7f16\u5199\u89c4\u5212' },
  { id: 'chapters', label: '\u6807\u4e66\u7f16\u5199' },
  { id: 'review', label: '\u5ba1\u6838\u4fee\u8ba2' },
  { id: 'export', label: '\u6210\u679c\u5bfc\u51fa' },
];
const prefix = '# Bid workflow\n\n';
export class WorkflowRecords {
  constructor(bridge, publish, clock = () => new Date().toISOString(), onError = () => {}) {
    this.bridge = bridge;
    this.publish = publish;
    this.clock = clock;
    this.onError = onError;
    this.records = {};
    this.states = {};
    this.revision = 0;
    this.queue = Promise.resolve();
    this.seen = new Set();
  }
  async load() {
    const r = await this.bridge.request('GET', '/documents/bid_workflow');
    if (!r.ok && r.status !== 404) throw new DocumentError(r);
    if (r.ok) {
      if (!r.body.markdown.startsWith(prefix)) throw new Error('Unsupported workflow record');
      const records = JSON.parse(r.body.markdown.slice(prefix.length));
      for (const [id, v] of Object.entries(records)) {
        if (
          !STAGES.some((s) => s.id === id) ||
          !v ||
          typeof v.startedAt !== 'string' ||
          !Number.isFinite(Date.parse(v.startedAt)) ||
          (v.completedAt &&
            (!Number.isFinite(Date.parse(v.completedAt)) || v.completedAt < v.startedAt))
        )
          throw new Error('Invalid workflow record');
      }
      this.records = records;
      this.revision = r.body.revision;
    }
    this.emit();
  }
  emit() {
    this.publish(
      STAGES.map((s) => {
        const state = this.states[s.id] ?? 'pending';
        const r = this.records[s.id];
        return {
          ...s,
          state,
          ...(r?.startedAt ? { startedAt: r.startedAt } : {}),
          ...(state === 'complete' && r?.completedAt ? { completedAt: r.completedAt } : {}),
        };
      }),
    );
  }
  mark(id, complete = false, restart = false, recordedAt) {
    const key = id + (complete ? ':complete' : ':start');
    if (this.seen.has(key)) return this.queue;
    if (!complete && !restart && this.records[id]?.startedAt) return this.queue;
    this.seen.add(key);
    const at = recordedAt || this.clock();
    if (!Number.isFinite(Date.parse(at))) return Promise.reject(new Error('Invalid workflow time'));
    const operation = this.queue.then(async () => {
      const next = structuredClone(this.records);
      if (restart) next[id] = { startedAt: at };
      else next[id] ??= { startedAt: at };
      if (complete) next[id].completedAt = at;
      const r = await this.bridge.request('PUT', '/documents/bid_workflow', {
        markdown: prefix + JSON.stringify(next),
        revision: this.revision,
      });
      if (!r.ok) throw new DocumentError(r);
      this.records = next;
      this.revision = r.body.revision;
      this.emit();
    });
    this.queue = operation
      .catch((e) => {
        this.onError(e);
      })
      .finally(() => this.seen.delete(key));
    return this.queue;
  }
  matrix(m) {
    if (m.dirty) {
      this.states.requirements = 'active';
      this.emit();
      void this.mark('requirements');
      return;
    }
    const confirmed =
      m.rows.length > 0 && m.rows.every((r) => r.confirmed) && !m.unresolvedSources?.length;
    this.states.analysis = m.rows.some((r) => r.origin === 'ai')
      ? 'complete'
      : m.rows.length
        ? 'active'
        : 'pending';
    this.states.requirements = confirmed ? 'complete' : m.rows.length ? 'active' : 'pending';
    this.emit();
    // Existing saved data is projected without fabricating historic timestamps.
    if (this.lastMatrixRevision !== undefined && m.revision !== this.lastMatrixRevision) {
      if (
        this.states.analysis === 'complete' &&
        this.records.analysis?.startedAt &&
        !this.records.analysis?.completedAt
      )
        void this.mark('analysis', true);
      void this.mark('requirements', confirmed);
    }
    this.lastMatrixRevision = m.revision;
  }
  draft(session, record = false) {
    this.states.chapters = session.chapters.length ? 'active' : 'pending';
    this.emit();
    if (record) void this.mark('chapters');
  }
  analysisStarted() {
    this.states.analysis = 'active';
    this.emit();
    return this.mark('analysis', false, true);
  }
}
