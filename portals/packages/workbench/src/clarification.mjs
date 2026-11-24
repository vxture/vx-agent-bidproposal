/**
 * @package @bidproposal/workbench
 * @layer Presentation
 * @category Business
 * @author AI-Generated
 * @date 2026-11-25
 */
import { BackgroundRequest, checked } from './background.mjs';
import { locationLabel, sourceState } from './source-verification.mjs';
const bytes = (value) => new TextEncoder().encode(value).byteLength;
const digest = async (value) =>
  Array.from(
    new Uint8Array(
      await crypto.subtle.digest('SHA-256', new TextEncoder().encode(JSON.stringify(value))),
    ),
  )
    .map((n) => n.toString(16).padStart(2, '0'))
    .join('');
const terminal = (job) => !job || ['completed', 'error', 'cancelled'].includes(job.state);
export function clarificationItems(rows, segments) {
  return rows
    .filter(
      (r) =>
        (['review', 'clarification'].includes(r.status) ||
          r.decision?.disposition === 'recorded') &&
        r.check?.ok,
    )
    .map((r) => ({
      id: r.id,
      category: r.category,
      text: r.text,
      reason: r.decision?.note || r.review?.reason || '',
      decisionAt: r.decision?.at || null,
      evidence: [
        {
          segmentId: r.segmentId,
          quote: r.quote,
          location: locationLabel(r, segments.get(r.segmentId)),
        },
        ...(r.check.references || []).map((ref) => ({
          segmentId: ref.segmentId,
          quote: ref.quote,
          location: locationLabel(ref, {
            kind: ref.match.kind,
            table: ref.match.table,
            row: ref.match.row,
            column: ref.match.column,
          }),
        })),
      ],
    }));
}
export const clarificationContext = (plan, batch) => ({
  perspective: 'bidder',
  requestId: plan.id,
  inputDigest: plan.inputDigest,
  readingId: plan.readingId,
  sourceHash: plan.sourceHash,
  batchId: batch.id,
  target: plan.target,
  items: batch.items,
});
/** Bound input and output budgets; every source-backed issue is retained. */
export async function buildClarifications(
  analysis,
  rows,
  segments,
  target,
  { id = crypto.randomUUID(), budget = 28000 } = {},
) {
  const items = clarificationItems(rows, segments);
  if (!items.length)
    throw new Error(
      '\u6682\u65e0\u6709\u6548\u539f\u6587\u4f9d\u636e\u7684\u5f85\u6f84\u6e05\u7591\u70b9',
    );
  if (
    new Set(items.map((i) => i.id)).size !== items.length ||
    !Number.isInteger(budget) ||
    budget < 8000 ||
    budget > 100000
  )
    throw new Error('Invalid clarification inputs');
  const plan = {
    schema: 2,
    perspective: 'bidder',
    id,
    analysisRunId: analysis.runId,
    readingId: analysis.readingId,
    fileId: analysis.fileId,
    sourceHash: analysis.sourceHash,
    name: analysis.name,
    target,
    inputDigest: await digest({
      perspective: 'bidder',
      run: analysis.runId,
      hash: analysis.sourceHash,
      target,
      items,
    }),
    batches: [],
  };
  let batch = { id: 'clarify-1', items: [] };
  for (const item of items) {
    let next = { ...batch, items: [...batch.items, item] };
    if (
      batch.items.length &&
      (next.items.length > 8 || bytes(JSON.stringify(clarificationContext(plan, next))) > budget)
    ) {
      plan.batches.push(batch);
      batch = { id: 'clarify-' + (plan.batches.length + 1), items: [] };
      next = { ...batch, items: [item] };
    }
    if (bytes(JSON.stringify(clarificationContext(plan, next))) > budget)
      throw new Error(
        '\u5355\u9879\u7591\u70b9\u8d44\u6599\u8d85\u51fa\u4e0a\u4e0b\u6587\u9884\u7b97\uff0c\u672a\u622a\u65ad',
      );
    batch = next;
  }
  if (batch.items.length) plan.batches.push(batch);
  if (plan.batches.length > 80 || bytes(JSON.stringify(plan)) > 950000)
    throw new Error(
      '\u6f84\u6e05\u6e05\u5355\u8d85\u51fa\u672c\u6b21\u5bb9\u91cf\uff0c\u672a\u4e22\u5f03\u7591\u70b9',
    );
  return plan;
}
export function parseClarifications(text, input) {
  if (typeof text !== 'string' || bytes(text) > 150000)
    throw new Error('Invalid clarification result size');
  const value = JSON.parse(
    text
      .trim()
      .replace(/^\x60{3}(?:json)?\s*/, '')
      .replace(/\x60{3}$/, ''),
  );
  for (const key of [
    'perspective',
    'requestId',
    'inputDigest',
    'readingId',
    'sourceHash',
    'batchId',
  ])
    if (value[key] !== input[key] || (key === 'perspective' && value[key] !== 'bidder'))
      throw new Error(
        '\u8be2\u95ee\u8349\u7a3f\u89d2\u8272\u6216\u4f9d\u636e\u7248\u672c\u4e0d\u4e00\u81f4',
      );
  if (
    !Array.isArray(value.items) ||
    value.items.length !== input.items.length ||
    new Set(value.items.map((i) => i.id)).size !== input.items.length
  )
    throw new Error(
      '\u6f84\u6e05\u5efa\u8bae\u672a\u9010\u9879\u8986\u76d6\u672c\u6279\u7591\u70b9',
    );
  return value.items.map((item) => {
    const source = input.items.find((i) => i.id === item.id);
    if (!source) throw new Error('Unknown clarification issue');
    for (const [key, max] of Object.entries({
      title: 120,
      impact: 1600,
      question: 2400,
      inquiryDraft: 3000,
      reason: 1600,
    }))
      if (typeof item[key] !== 'string' || !item[key].trim() || item[key].length > max)
        throw new Error('Invalid clarification ' + key);
    if (
      !Array.isArray(item.requestedClarifications) ||
      item.requestedClarifications.length > 12 ||
      item.requestedClarifications.some(
        (s) => typeof s !== 'string' || !s.trim() || s.length > 600,
      ) ||
      !['normal', 'important'].includes(item.attention) ||
      typeof item.attentionReason !== 'string' ||
      item.attentionReason.length > 1000 ||
      (item.attention === 'important' && !item.attentionReason.trim())
    )
      throw new Error('Invalid inquiry attention or requested clarification');
    return {
      id: item.id,
      title: item.title,
      impact: item.impact,
      question: item.question,
      inquiryDraft: item.inquiryDraft,
      reason: item.reason,
      requestedClarifications: item.requestedClarifications,
      attention: item.attention,
      attentionReason: item.attentionReason,
      evidence: structuredClone(source.evidence),
      status: 'draft',
    };
  });
}
export class ClarificationSession {
  constructor(bridge, readingId) {
    this.bridge = bridge;
    this.readingId = readingId;
    this.request = new BackgroundRequest(bridge, 'bid_clarification_' + readingId);
    this.plan = null;
    this.items = [];
    this.errors = [];
    this.cache = new Map();
    this.stale = false;
  }
  async load() {
    await this.request.load();
    if (this.request.value) {
      const ref = this.request.value.spec.sources.find((s) =>
        s.id.startsWith('bid_clarification_manifest_'),
      );
      if (!ref) throw new Error('Missing clarification manifest');
      const doc = checked(await this.bridge.request('GET', '/documents/' + ref.id));
      if (doc.revision !== ref.revision) throw new Error('Clarification manifest changed');
      this.plan = JSON.parse(doc.markdown);
      if (this.plan.readingId !== this.readingId)
        throw new Error('Clarification belongs to another reading');
      await this.sync();
    }
    return this;
  }
  async check(verifier, rows) {
    this.verifier = verifier;
    const inputs = clarificationItems(rows, verifier.segments),
      target = verifier.plan?.target || verifier.analysis.name;
    this.stale =
      !!this.plan &&
      (!!verifier.problem ||
        this.plan.inputDigest !==
          (await digest({
            perspective: 'bidder',
            run: verifier.analysis.runId,
            hash: verifier.analysis.sourceHash,
            target,
            items: inputs,
          })));
    return this.stale;
  }
  async start(verifier) {
    await this.load();
    if (!terminal(this.request.job))
      throw new Error(
        '\u6f84\u6e05\u4efb\u52a1\u5df2\u5728\u6267\u884c\uff0c\u8bf7\u7ee7\u7eed\u539f\u4efb\u52a1',
      );
    await verifier.prepare(verifier.analysis, verifier.results);
    await verifier.load();
    const rows = await verifier.ready();
    const state = await sourceState(this.bridge, verifier.analysis);
    if (state.problem) throw new Error(state.problem);
    await this.check(verifier, rows);
    if (this.plan && !this.stale && this.request.job?.state === 'completed' && !this.errors.length)
      return this.request.job;
    const plan = await buildClarifications(
      verifier.analysis,
      rows,
      verifier.segments,
      verifier.plan?.target || verifier.analysis.name,
    );
    const id = 'bid_clarification_manifest_' + plan.id,
      doc = checked(
        await this.bridge.request('PUT', '/documents/' + id, {
          markdown: JSON.stringify(plan),
          revision: 0,
        }),
      );
    if (this.request.value)
      checked(
        await this.bridge.request(
          'PUT',
          '/documents/bid_clarification_archive_' + crypto.randomUUID(),
          { markdown: JSON.stringify(this.request.value), revision: 0 },
        ),
      );
    this.plan = plan;
    this.stale = false;
    this.items = [];
    this.errors = [];
    return this.request.start({
      id: plan.id,
      label: ('\u6f84\u6e05\u8be2\u95ee \u00b7 ' + plan.name).slice(0, 120),
      sources: [{ id, revision: doc.revision }],
      steps: plan.batches.map((batch) => ({
        id: batch.id,
        taskId: 'draft_tender_clarifications',
        context: {
          id: 'tender_clarification_snapshot',
          markdown: JSON.stringify(clarificationContext(plan, batch)),
        },
      })),
    });
  }
  async sync() {
    const job = await this.request.sync();
    this.items = [];
    this.errors = [];
    for (const step of job?.steps || []) {
      if (step.state !== 'done') continue;
      const batch = this.plan.batches.find((b) => b.id === step.id);
      if (!batch) {
        this.errors.push({ batchId: step.id, message: 'Unknown clarification batch' });
        continue;
      }
      const key = step.resultDocument;
      let result = this.cache.get(key);
      if (!result) {
        try {
          const raw = await this.request.result(step);
          if (!raw?.verified) throw new Error('Unverified clarification result');
          result = {
            items: parseClarifications(
              raw.content.requirement_analysis,
              clarificationContext(this.plan, batch),
            ),
          };
        } catch (e) {
          result = { error: e.message };
        }
        this.cache.set(key, result);
      }
      if (result.error) this.errors.push({ batchId: step.id, message: result.error });
      else this.items.push(...result.items);
    }
    return job;
  }
  async control(action) {
    await this.request.control(action);
    return this.sync();
  }
  markdown() {
    if (this.stale)
      throw new Error(
        '\u539f\u6587\u6216\u7b54\u590d\u5df2\u66f4\u65b0\uff0c\u8bf7\u91cd\u65b0\u5206\u6790',
      );
    const lines = [
      '# \u62db\u6807\u6587\u4ef6\u6f84\u6e05\u8be2\u95ee\u6e05\u5355',
      '',
      this.plan?.name || '',
      '',
      '> \u6295\u6807\u65b9\u8be2\u95ee\u8349\u7a3f\uff0c\u62df\u5411\u91c7\u8d2d\u4eba\uff0f\u62db\u6807\u4ee3\u7406\u8bf7\u6c42\u4e66\u9762\u6f84\u6e05\uff0c\u5c1a\u672a\u53d1\u9001\u3002',
      '',
      '\u5df2\u751f\u6210 ' +
        this.items.length +
        ' / ' +
        (this.plan?.batches.reduce((n, b) => n + b.items.length, 0) || 0) +
        ' \u9879\u8be2\u95ee\u8349\u7a3f\u3002',
    ];
    for (const [i, item] of this.items.entries()) {
      lines.push('', '## ' + (i + 1) + '. ' + item.title);
      for (const [label, value] of [
        ['\u6295\u6807\u5f71\u54cd', item.impact],
        ['\u62df\u8be2\u95ee\u4e8b\u9879', item.question],
        ['\u6295\u6807\u65b9\u8be2\u95ee\u51fd\u8349\u7a3f', item.inquiryDraft],
        ['\u8be2\u95ee\u4f9d\u636e\u4e0e\u7406\u7531', item.reason],
      ])
        lines.push('', '### ' + label, '', value);
      lines.push(
        '',
        '### \u8bf7\u91c7\u8d2d\u4eba\uff0f\u62db\u6807\u4ee3\u7406\u660e\u786e',
        '',
        ...item.requestedClarifications.map((v) => '- ' + v),
      );
      if (item.attention === 'important')
        lines.push(
          '',
          '\u5efa\u8bae\u8fdb\u4e00\u6b65\u8d28\u8be2\u8bc4\u4f30\uff1a' + item.attentionReason,
        );
      lines.push('', '### \u539f\u62db\u6807\u6587\u4ef6\u4f9d\u636e', '');
      for (const ref of item.evidence)
        lines.push(ref.location, '', ...ref.quote.split('\n').map((v) => '> ' + v), '');
    }
    lines.push('', '\u539f\u4ef6 SHA256: ' + (this.plan?.sourceHash || ''));
    return lines.join('\n');
  }
}
