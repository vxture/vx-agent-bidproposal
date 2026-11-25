/**
 * @package @bidproposal/workbench
 * @layer Presentation
 * @category Business
 * @author AI-Generated
 * @date 2026-11-25
 */
import { PlanSession } from './plan.mjs';
import { DraftSession } from './draft.mjs';
import { Requirements } from './requirements.mjs';
import { checked } from './background.mjs';
import { evidenceRevisions, reviewDate } from './evidence-review.mjs';
import { ReviewSession } from './review.mjs';

/** Project the latest real render, including a completion that preceded the next UI poll. */
export function syncDeliveryWorkflow(workflow, jobs, stale) {
  const latest = jobs[0];
  const state =
    latest?.state === 'completed' && !stale
      ? 'complete'
      : jobs.length
        ? 'active'
        : 'pending';
  if (workflow.states.export !== state) {
    workflow.states.export = state;
    workflow.emit();
  }
  if (state !== 'complete') return;
  const record = workflow.records.export;
  if (record?.completedAt === latest.updatedAt) return;
  if (!Number.isFinite(Date.parse(latest.updatedAt))) return;
  if (
    !record?.startedAt ||
    Date.parse(latest.updatedAt) < Date.parse(record.startedAt)
  ) {
    if (
      !Number.isFinite(Date.parse(latest.createdAt)) ||
      latest.createdAt > latest.updatedAt
    )
      return;
    void workflow.mark('export', false, true, latest.createdAt);
  }
  void workflow.mark('export', true, false, latest.updatedAt);
}

export function assemble(plan, draft, title) {
  if (!plan.approved || !plan.outline.length)
    throw new Error('\u8bf7\u5148\u786e\u8ba4\u7ae0\u8282\u76ee\u5f55');
  if (!title.trim() || title.length > 120 || /[\r\n]/.test(title))
    throw new Error('\u6210\u679c\u540d\u79f0\u9700\u8981 1-120 \u5b57');
  const ordered = plan.outline.map((c) => {
    const d = draft.find((d) => d.id === c.id);
    if (!d?.body.trim())
      throw new Error('\u7ae0\u8282\u5c1a\u672a\u5b8c\u6210\uff1a' + c.title);
    return { ...d, title: c.title };
  });
  // Keep fenced code intact; reserve heading level one for approved chapters.
  const normalize = (body) => {
    let fence = null;
    return body
      .split('\n')
      .map((line) => {
        const f = /^\s{0,3}(`{3,}|~{3,})/.exec(line);
        if (f) {
          if (!fence) fence = f[1][0];
          else if (fence === f[1][0]) fence = null;
          return line;
        }
        return fence
          ? line
          : line.replace(
              /^(#{1,6})(\s+)/,
              (_, h, s) => (h.length === 1 ? '##' : h) + s,
            );
      })
      .join('\n');
  };
  const safeTitle = title.trim().replace(/[\\`*_{}[\]<>#!|]/g, '\\$&');
  const markdown =
    safeTitle +
    '\n\n::ry-pagebreak\n\n::ry-toc{depth="3" title="\u76ee\u5f55"}\n\n' +
    ordered
      .map(
        (c) =>
          '::ry-pagebreak\n\n# ' +
          c.title.replace(/[\\`*_{}[\]<>#!|]/g, '\\$&') +
          '\n\n' +
          normalize(c.body.trim()),
      )
      .join('\n\n') +
    '\n';
  if (new TextEncoder().encode(markdown).length > 1024 * 1024)
    throw new Error('\u5408\u7a3f\u8d85\u8fc7 1 MiB');
  return {
    markdown,
    chapters: ordered.map((c) => ({
      id: c.id,
      title: c.title,
      characters: c.body.length,
    })),
  };
}
export class DeliverySession {
  constructor(bridge) {
    this.bridge = bridge;
    this.plan = new PlanSession(bridge);
    this.matrix = new Requirements(bridge);
    this.draft = new DraftSession(bridge);
    this.settings = { title: '', template: null };
    this.settingsRevision = 0;
    this.jobs = [];
    this.selected = null;
    this.manifest = null;
    this.warnings = [];
  }
  async doc(id) {
    const r = await this.bridge.request('GET', '/documents/' + id);
    if (r.status === 404) return null;
    return checked(r);
  }
  async put(id, value, revision = 0) {
    return checked(
      await this.bridge.request('PUT', '/documents/' + id, {
        markdown: typeof value === 'string' ? value : JSON.stringify(value),
        revision,
      }),
    );
  }
  async sources() {
    await this.plan.load();
    await this.matrix.load();
    await this.draft.load();
    this.writing = await this.doc('bid_writing');
    this.review = await this.doc('bid_review');
    this.warnings = [];
    if (
      this.plan.value.requirementsRevision !== this.matrix.revision ||
      this.matrix.rows.some((r) => !r.confirmed)
    )
      this.warnings.push(
        '\u9700\u6c42\u5df2\u53d8\u66f4\u6216\u5c1a\u672a\u5168\u90e8\u786e\u8ba4',
      );
    const writing = this.writing
      ? JSON.parse(
          this.writing.markdown.slice('# Bid writing progress\n\n'.length),
        )
      : null;
    const pending = writing?.items.filter((i) => i.state !== 'done') || [];
    if (pending.length)
      this.warnings.push(
        pending.length +
          ' \u7ae0\u4ecd\u6709\u7f16\u5199\u6216\u5019\u9009\u7a3f\u5f85\u5904\u7406\uff1b\u672c\u6b21\u4f7f\u7528\u5df2\u91c7\u7eb3\u6b63\u6587',
      );
    const gaps = writing?.items.flatMap((i) => i.materialGaps || []) || [];
    if (gaps.length)
      this.warnings.push(
        gaps.length +
          ' \u9879\u4f01\u4e1a\u8d44\u6599\u7f3a\u53e3\u9700\u8865\u9f50',
      );
    const review = this.review ? JSON.parse(this.review.markdown) : null;
    if (!review)
      this.warnings.push('\u5c1a\u672a\u5f00\u59cb\u667a\u80fd\u5ba1\u6838');
    else {
      const current = {
          bid_plan: this.plan.revision,
          bid_requirements: this.matrix.revision,
          bid_draft: this.draft.revision,
          ...(await evidenceRevisions(this.bridge)),
        },
        audit =
          review.spec.steps?.[0]?.context &&
          JSON.parse(review.spec.steps[0].context.markdown).enterpriseAudit;
      if (
        review.spec.sources.some((s) => current[s.id] !== s.revision) ||
        (audit &&
          (audit.asOf !== reviewDate() ||
            Object.entries(audit.binding || {}).some(
              ([id, rev]) => current[id] !== rev,
            )))
      )
        this.warnings.push(
          '\u6b63\u6587\u6216\u4f9d\u636e\u5df2\u66f4\u65b0\uff0c\u73b0\u6709\u5ba1\u6838\u62a5\u544a\u5df2\u8fc7\u671f',
        );
      else {
        const r = await this.bridge.request('GET', '/jobs/' + review.spec.id);
        if (!r.ok || r.body.state !== 'completed')
          this.warnings.push(
            '\u667a\u80fd\u5ba1\u6838\u5c1a\u672a\u5b8c\u6210',
          );
      }
    }
    if (review) {
      const response = await this.bridge.request(
        'GET',
        '/jobs/' + review.spec.id,
      );
      if (response.ok && response.body.state === 'completed') {
        const audit = new ReviewSession(this.bridge);
        audit.request.value = review;
        await audit.sync();
        if (
          audit.reports.length !== response.body.steps.length ||
          audit.reports.some((r) => r.error)
        )
          this.warnings.push(
            '\u5ba1\u6838\u62a5\u544a\u672a\u901a\u8fc7\u7ed3\u679c\u6216\u6765\u6e90\u6821\u9a8c\uff0c\u8bf7\u56de\u5230\u5ba1\u6838\u4fee\u8ba2\u91cd\u8bd5',
          );
        const decisions = JSON.parse(
            (await this.doc('bid_review_decisions'))?.markdown || '{}',
          ),
          count = audit.findings.filter(
            (f) => decisions[f.id]?.state !== 'dismissed',
          ).length;
        if (count)
          this.warnings.push(
            count +
              ' \u9879\u5ba1\u6838\u5efa\u8bae\u5c1a\u672a\u5904\u7406\uff0c\u8bf7\u6838\u5bf9\u6216\u8bb0\u5f55\u5904\u7406\u8bf4\u660e',
          );
      }
    }
    return this;
  }
  revisions() {
    return {
      bid_plan: this.plan.revision,
      bid_requirements: this.matrix.revision,
      bid_draft: this.draft.revision,
      bid_writing: this.writing?.revision || 0,
      bid_review: this.review?.revision || 0,
    };
  }
  async load() {
    await this.sources();
    const saved = await this.doc('bid_delivery_settings');
    if (saved) {
      this.settings = JSON.parse(saved.markdown);
      this.settingsRevision = saved.revision;
    } else {
      const p = checked(await this.bridge.request('GET', '/project'));
      this.settings = {
        title: p.name || '\u6295\u6807\u6587\u4ef6',
        template: structuredClone(this.plan.value.template),
      };
    }
    const project = checked(await this.bridge.request('GET', '/project'));
    this.settings.fields = {
      projectName: project.name || this.settings.title,
      documentName:
        this.plan.value.volume === 'technical'
          ? '\u6280\u672f\u6807'
          : this.plan.value.volume === 'commercial'
            ? '\u5546\u52a1\u6807'
            : '\u6295\u6807\u6587\u4ef6',
      documentNumber: '',
      ...this.settings.fields,
    };
    this.files = checked(
      await this.bridge.request('GET', '/files'),
    ).items.filter((f) => /\.docx$/i.test(f.name));
    await this.sync();
    return this;
  }
  async saveSettings() {
    const r = await this.put(
      'bid_delivery_settings',
      this.settings,
      this.settingsRevision,
    );
    this.settingsRevision = r.revision;
  }
  async sync() {
    const request = await this.doc('bid_delivery_request');
    this.jobs = checked(await this.bridge.request('GET', '/renders')).items;
    if (request) {
      const input = JSON.parse(request.markdown);
      if (!this.jobs.some((j) => j.id === input.id)) {
        checked(await this.bridge.request('POST', '/renders', input));
        this.jobs = checked(await this.bridge.request('GET', '/renders')).items;
      }
    }
    if (!this.selected || !this.jobs.some((j) => j.id === this.selected))
      this.selected = this.jobs[0]?.id || null;
    this.manifest = this.selected
      ? JSON.parse(
          (await this.doc('bid_delivery_manifest_' + this.selected))
            ?.markdown || 'null',
        )
      : null;
    return this.job;
  }
  get job() {
    return this.jobs.find((j) => j.id === this.selected);
  }
  get stale() {
    return (
      !!this.manifest &&
      Object.entries(this.manifest.revisions).some(
        ([k, v]) => this.revisions()[k] !== v,
      )
    );
  }
  get settingsChanged() {
    const job = this.job;
    return (
      !!job &&
      (job.title !== this.settings.title ||
        JSON.stringify(job.template || null) !==
          JSON.stringify(
            this.settings.template
              ? {
                  fileId: this.settings.template.id,
                  hash: this.settings.template.hash,
                }
              : null,
          ) ||
        JSON.stringify(job.fields || null) !==
          JSON.stringify(this.settings.fields || null))
    );
  }
  async create() {
    await this.sources();
    if (this.jobs.some((j) => ['queued', 'running'].includes(j.state)))
      throw new Error(
        '\u5f53\u524d\u5408\u7a3f\u6b63\u5728\u6392\u7248\uff0c\u8bf7\u7a0d\u5019',
      );
    const settings = structuredClone(this.settings),
      fields = settings.fields;
    for (const [key, max] of Object.entries({
      projectName: 120,
      documentName: 80,
      documentNumber: 80,
    }))
      if (
        typeof fields[key] !== 'string' ||
        fields[key].length > max ||
        /[\x00-\x1f\x7f]/.test(fields[key]) ||
        (key !== 'documentNumber' && !fields[key].trim())
      )
        throw new Error(
          '\u8bf7\u8865\u9f50\u9875\u7709\u9879\u76ee\u540d\u79f0\u548c\u6587\u4ef6\u540d\u79f0\uff0c\u4f7f\u7528\u5355\u884c\u6587\u5b57',
        );
    for (const key of Object.keys(fields)) fields[key] = fields[key].trim();
    const content = assemble(
        this.plan.value,
        this.draft.chapters,
        settings.title,
      ),
      id = crypto.randomUUID(),
      manifest = {
        revisions: this.revisions(),
        chapters: content.chapters,
        warnings: [...this.warnings],
        targetPages: this.plan.value.pages,
        template: settings.template,
        fields,
      };
    await this.saveSettings();
    const source = await this.put(
      'bid_delivery_source_' + id,
      content.markdown,
    );
    await this.put('bid_delivery_manifest_' + id, manifest);
    const input = {
      id,
      title: settings.title,
      source: {
        id: source.id || 'bid_delivery_source_' + id,
        revision: source.revision,
      },
      ...(settings.template
        ? {
            template: {
              fileId: settings.template.id,
              hash: settings.template.hash,
            },
          }
        : {}),
      fields,
    };
    const old = await this.doc('bid_delivery_request');
    await this.put('bid_delivery_request', input, old?.revision || 0);
    checked(await this.bridge.request('POST', '/renders', input));
    this.selected = id;
    await this.sync();
    return this.job;
  }
  async file(format) {
    const value = checked(
      await this.bridge.request(
        'GET',
        '/renders/' + this.selected + '/files/' + format,
      ),
    );
    const bytes = Uint8Array.from(atob(value.base64), (c) => c.charCodeAt(0));
    const hash = [
      ...new Uint8Array(await crypto.subtle.digest('SHA-256', bytes)),
    ]
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
    if (hash !== value.sha256 || bytes.length !== value.size)
      throw new Error('\u6210\u679c\u6587\u4ef6\u6821\u9a8c\u5931\u8d25');
    return { ...value, bytes };
  }
}
