/**
 * @package @bidproposal/workbench
 * @layer Presentation
 * @category Business
 * @author AI-Generated
 * @date 2026-11-25
 */
import { Requirements } from './requirements.mjs';
import { PlanSession } from './plan.mjs';
import { DraftSession } from './draft.mjs';
import { BackgroundRequest, checked } from './background.mjs';
import {
  EVIDENCE_CATEGORIES,
  evidenceRevisions,
  prepareEvidenceReview,
  reviewDate,
  validateReviewEvidence,
  structuralEvidenceFindings,
} from './evidence-review.mjs';
export function parseReview(text, expected) {
  if (typeof text !== 'string' || text.length > 160000) throw new Error('Invalid review size');
  const v = JSON.parse(
    text
      .trim()
      .replace(/^```(?:json)?\s*/, '')
      .replace(/```$/, ''),
  );
  for (const k of [
    'requestId',
    'chapterId',
    'draftRevision',
    'requirementsRevision',
    'planRevision',
  ])
    if (v[k] !== expected[k]) throw new Error('Review belongs to another source revision');
  if (
    typeof v.summary !== 'string' ||
    v.summary.length > 1800 ||
    !Array.isArray(v.coverage) ||
    v.coverage.length !== expected.requirementIds.length ||
    new Set(v.coverage.map((c) => c.requirementId)).size !== v.coverage.length ||
    !Array.isArray(v.findings) ||
    v.findings.length > 40
  )
    throw new Error('Invalid review structure');
  for (const c of v.coverage)
    if (
      !expected.requirementIds.includes(c.requirementId) ||
      !['covered', 'partial', 'missing'].includes(c.status) ||
      typeof c.quote !== 'string' ||
      c.quote.length > 2000 ||
      (c.quote && !expected.markdown.includes(c.quote))
    )
      throw new Error('Invalid review coverage evidence');
  for (const f of v.findings) {
    if (
      !['blocker', 'warning', 'info'].includes(f.severity) ||
      ![
        'omission',
        'metric',
        'unsupported',
        'consistency',
        'quality',
        ...EVIDENCE_CATEGORIES,
      ].includes(f.category) ||
      !Array.isArray(f.requirementIds) ||
      f.requirementIds.some((id) => !expected.requirementIds.includes(id))
    )
      throw new Error('Invalid finding references');
    for (const [k, max] of Object.entries({
      title: 160,
      detail: 2400,
      quote: 2000,
      suggestion: 2400,
    }))
      if (typeof f[k] !== 'string' || f[k].length > max || (k !== 'quote' && !f[k].trim()))
        throw new Error('Invalid finding text');
    if (f.quote && !expected.markdown.includes(f.quote))
      throw new Error('Finding quote is not present in the reviewed draft');
  }
  if (expected.enterpriseAudit)
    validateReviewEvidence(v, expected.enterpriseAudit, expected.markdown);
  return { summary: v.summary, coverage: v.coverage, findings: v.findings };
}
export class ReviewSession {
  constructor(bridge) {
    this.bridge = bridge;
    this.request = new BackgroundRequest(bridge, 'bid_review');
    this.plan = new PlanSession(bridge);
    this.matrix = new Requirements(bridge);
    this.draft = new DraftSession(bridge);
    this.reports = [];
    this.decisions = {};
    this.decisionRevision = 0;
  }
  async sources() {
    await this.plan.load();
    await this.matrix.load();
    await this.draft.load();
    this.enterpriseRevisions = await evidenceRevisions(this.bridge);
  }
  get stale() {
    const spec = this.request.value?.spec;
    if (!spec) return false;
    const revisions = {
        bid_plan: this.plan.revision,
        bid_requirements: this.matrix.revision,
        bid_draft: this.draft.revision,
        ...this.enterpriseRevisions,
      },
      audit = spec.steps[0]?.context && JSON.parse(spec.steps[0].context.markdown).enterpriseAudit;
    return (
      spec.sources.some((s) => s.revision !== revisions[s.id]) ||
      (!!audit &&
        (audit.asOf !== reviewDate() ||
          Object.entries(audit.binding || {}).some(
            ([id, rev]) => this.enterpriseRevisions[id] !== rev,
          )))
    );
  }
  async load() {
    await this.sources();
    await this.request.load();
    const d = await this.bridge.request('GET', '/documents/bid_review_decisions');
    if (d.ok) {
      this.decisions = JSON.parse(d.body.markdown);
      this.decisionRevision = d.body.revision;
    } else if (d.status !== 404) checked(d);
    if (this.request.value) await this.sync();
    return this;
  }
  async start(instruction = '') {
    if (typeof instruction !== 'string' || instruction.length > 4000)
      throw new Error('Invalid review instruction');
    await this.sources();
    const tasks = this.plan.writingTasks(this.matrix);
    if (tasks.some((t) => !this.draft.chapters.find((c) => c.id === t.id)?.body))
      throw new Error('Generate and save every planned chapter before review');
    if (this.request.value) {
      await this.request.sync();
      if (!['completed', 'error', 'cancelled'].includes(this.request.job.state))
        throw new Error('A review is already running');
      checked(
        await this.bridge.request('PUT', '/documents/bid_review_archive_' + crypto.randomUUID(), {
          markdown: JSON.stringify(this.request.value),
          revision: 0,
        }),
      );
    }
    const writing = await this.bridge.request('GET', '/documents/bid_writing');
    const progress = writing.ok
      ? JSON.parse(writing.body.markdown.slice('# Bid writing progress\n\n'.length))
      : null;
    if (
      progress?.jobId ||
      progress?.items.some((i) => ['submitting', 'running', 'candidate'].includes(i.state))
    )
      throw new Error(
        '\u8bf7\u5148\u5b8c\u6210\u6216\u4fdd\u7559\u5f53\u524d\u4fee\u8ba2\u5019\u9009\uff0c\u518d\u5ba1\u6838\u5df2\u4fdd\u5b58\u6b63\u6587',
      );
    const evidence = await prepareEvidenceReview(this.bridge, tasks, this.draft, progress);
    const outline = this.plan.value.outline.map((c) => ({
      title: c.title,
      purpose: c.purpose || '',
      summary: progress?.items.find((i) => i.id === c.id)?.summary || '',
    }));
    const spec = {
      id: crypto.randomUUID(),
      label: 'Bid review',
      sources: [
        { id: 'bid_requirements', revision: this.matrix.revision },
        { id: 'bid_plan', revision: this.plan.revision },
        { id: 'bid_draft', revision: this.draft.revision },
        ...Object.entries(this.enterpriseRevisions)
          .filter(
            ([id, revision]) =>
              id !== 'bid_writing' && !id.startsWith('runtime_') && Number.isSafeInteger(revision),
          )
          .map(([id, revision]) => ({ id, revision })),
      ],
      steps: tasks.map((t) => {
        const chapter = this.draft.chapters.find((c) => c.id === t.id);
        const context = {
          requestId: crypto.randomUUID(),
          chapterId: t.id,
          draftRevision: this.draft.revision,
          requirementsRevision: this.matrix.revision,
          planRevision: this.plan.revision,
          chapter: {
            title: chapter.title,
            markdown: chapter.body,
            purpose: this.plan.value.outline.find((c) => c.id === t.id).purpose || '',
          },
          requirements: t.requirements,
          configuration: t.configuration,
          outline,
          instruction,
        };
        context.enterpriseAudit = {
          ...evidence.get(t.id),
          binding: Object.fromEntries(
            Object.entries(this.enterpriseRevisions).filter(([id]) => id !== 'bid_writing'),
          ),
        };
        const markdown = JSON.stringify(context);
        if (new TextEncoder().encode(markdown).length > 180000)
          throw new Error('Review chapter context is too large; split the chapter');
        return {
          id: t.id,
          taskId: 'review_chapter',
          context: { id: 'bid_review_context', markdown },
        };
      }),
    };
    await this.request.start(spec);
    this.reports = [];
    return this;
  }
  async sync() {
    const job = await this.request.sync();
    this.reports = [];
    for (const step of job?.steps || []) {
      if (step.state !== 'done') continue;
      const result = await this.request.result(step);
      const input = JSON.parse(step.context.markdown);
      try {
        if (!result?.verified)
          throw new Error('Model review did not pass verification; saved output retained');
        const report = parseReview(result.content.proposal_review, {
            ...input,
            markdown: input.chapter.markdown,
            requirementIds: input.requirements.map((r) => r.id),
          }),
          structural = input.enterpriseAudit
            ? structuralEvidenceFindings(input.enterpriseAudit, input.chapter.markdown)
            : [];
        this.reports.push({
          chapterId: step.id,
          title: input.chapter.title,
          ...report,
          enterpriseAudit: input.enterpriseAudit,
          findings: [...report.findings.map((f) => ({ ...f, origin: 'model' })), ...structural].map(
            (f, i) => ({ ...f, id: job.id + ':' + step.id + ':' + i, chapterId: step.id }),
          ),
        });
      } catch (e) {
        this.reports.push({
          chapterId: step.id,
          title: input.chapter.title,
          error: e.message,
          findings: [],
          coverage: [],
        });
      }
    }
    return job;
  }
  get findings() {
    return this.reports.flatMap((r) => r.findings);
  }
  async decide(id, value) {
    await this.sources();
    if (this.stale)
      throw new Error('\u62a5\u544a\u5df2\u8fc7\u671f\uff0c\u8bf7\u91cd\u65b0\u5ba1\u6838');
    if (!this.findings.some((f) => f.id === id)) throw new Error('Unknown review finding');
    if (
      !value ||
      !['dismissed', 'open'].includes(value.state) ||
      typeof value.note !== 'string' ||
      value.note.length > 1600 ||
      (value.state === 'dismissed' && !value.note.trim())
    )
      throw new Error(
        '\u8bf7\u8bb0\u5f55\u6682\u7f13\u539f\u56e0\uff08\u6700\u591a1600\u5b57\uff09',
      );
    const old = this.decisions[id],
      entry = { state: value.state, note: value.note, at: new Date().toISOString() },
      next = {
        ...this.decisions,
        [id]: {
          ...entry,
          history: [
            ...(old?.history || []),
            ...(old ? [{ state: old.state, note: old.note, at: old.at }] : []),
          ],
        },
      };
    const r = checked(
      await this.bridge.request('PUT', '/documents/bid_review_decisions', {
        markdown: JSON.stringify(next),
        revision: this.decisionRevision,
      }),
    );
    this.decisions = next;
    this.decisionRevision = r.revision;
  }
  rewriteInstruction(chapterId) {
    const findings = this.findings.filter(
      (f) => f.chapterId === chapterId && this.decisions[f.id]?.state !== 'dismissed',
    );
    if (!findings.length) throw new Error('No actionable findings for this chapter');
    const instruction = findings
      .sort(
        (a, b) =>
          ({ blocker: 0, warning: 1, info: 2 })[a.severity] -
          { blocker: 0, warning: 1, info: 2 }[b.severity],
      )
      .map((f) => f.title + '\n' + f.detail + '\n' + f.suggestion)
      .join('\n\n');
    if (instruction.length > 3800)
      throw new Error(
        '\u672c\u7ae0\u95ee\u9898\u5efa\u8bae\u8fc7\u957f\uff0c\u8bf7\u5148\u9009\u62e9\u672c\u6b21\u5904\u7406\u7684\u95ee\u9898\uff1b\u672a\u622a\u65ad\u5efa\u8bae',
      );
    return instruction;
  }
}
