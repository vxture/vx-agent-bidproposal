/**
 * @package @bidproposal/workbench
 * @layer Presentation
 * @category Business
 * @author AI-Generated
 * @date 2026-11-25
 */
import { DocumentError } from './errors.mjs';
import { BackgroundRequest, checked } from './background.mjs';

const bytes = (s) => new TextEncoder().encode(s).byteLength;
const plain = (s) => s.replace(/[ \t\r\n\f\v\u00a0\u3000]/g, '');
export const rowBinding = (r) => JSON.stringify([r.category, r.text, r.quote, r.location]);
export const evidenceDigest = async (r) =>
  Array.from(
    new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(rowBinding(r)))),
  )
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
export function matchQuote(text, quote) {
  if (typeof text !== 'string' || typeof quote !== 'string' || !plain(quote)) return null;
  let start = text.indexOf(quote);
  if (start >= 0) return { method: 'exact', start, end: start + quote.length };
  const positions = [];
  let normalized = '';
  for (let i = 0; i < text.length; i++)
    if (plain(text[i])) {
      normalized += text[i];
      positions.push(i);
    }
  const needle = plain(quote);
  start = normalized.indexOf(needle);
  return start < 0
    ? null
    : {
        method: 'whitespace',
        start: positions[start],
        end: positions[start + needle.length - 1] + 1,
      };
}
export function currentSource(plan, reading, files) {
  if (
    !reading ||
    reading.state !== 'completed' ||
    reading.id !== plan.readingId ||
    reading.hash !== plan.sourceHash ||
    reading.fileId !== plan.fileId ||
    reading.units !== plan.unitCount
  )
    return '\u539f\u6587\u5feb\u7167\u6216\u6587\u4ef6\u7248\u672c\u5df2\u53d8\u5316\uff0c\u8bf7\u91cd\u65b0\u9009\u62e9\u5e76\u6838\u9a8c';
  const file = files.find((f) => f.id === plan.fileId && f.hash === plan.sourceHash);
  if (!file)
    return '\u539f\u5bfc\u5165\u6587\u4ef6\u7248\u672c\u5df2\u79fb\u9664\uff0c\u8bf7\u91cd\u65b0\u5bfc\u5165\u5e76\u6838\u9a8c';
  if (
    files.some(
      (f) =>
        f.name === reading.name &&
        f.hash !== plan.sourceHash &&
        (!f.addedAt || !file.addedAt || f.addedAt >= file.addedAt),
    )
  )
    return '\u5b58\u5728\u540c\u540d\u6587\u4ef6\u7684\u65b0\u7248\u672c\uff0c\u8bf7\u9009\u62e9\u672c\u6b21\u4f7f\u7528\u7684\u7248\u672c\u5e76\u91cd\u65b0\u6838\u9a8c';
  return null;
}
/** Match only the designated segment and keep source character/cell positions. */
export function verifySourceQuote(candidate, segment, unit) {
  if (
    !segment ||
    !unit ||
    candidate.segmentId !== segment.id ||
    candidate.unit !== segment.unit ||
    unit.index !== segment.unit ||
    JSON.stringify(segment.location) !== JSON.stringify(unit.location) ||
    JSON.stringify(candidate.location) !== JSON.stringify(segment.location)
  )
    return {
      ok: false,
      reason: '\u6765\u6e90\u4f4d\u7f6e\u4e0e\u4fdd\u5b58\u7684\u539f\u6587\u4e0d\u4e00\u81f4',
    };
  let text,
    parts = [];
  if (segment.kind === 'text') {
    if (
      !Number.isInteger(segment.start) ||
      !Number.isInteger(segment.end) ||
      unit.text.slice(segment.start, segment.end) !== segment.text
    )
      return {
        ok: false,
        reason:
          '\u539f\u6587\u6bb5\u5185\u5bb9\u4e0e\u4fdd\u5b58\u7684\u7248\u672c\u4e0d\u4e00\u81f4',
      };
    text = segment.text;
  } else if (segment.kind === 'table-row') {
    const cells = unit.tables?.[segment.table]?.rows?.[segment.row];
    if (!cells || JSON.stringify(cells) !== JSON.stringify(segment.cells))
      return {
        ok: false,
        reason: '\u8868\u683c\u884c\u4e0e\u4fdd\u5b58\u7684\u539f\u6587\u4e0d\u4e00\u81f4',
      };
    text = '';
    cells.forEach((cell, column) => {
      if (column) text += '\n';
      const start = text.length;
      text += cell ?? '';
      parts.push({ column, start, end: text.length, merged: cell === null });
    });
  } else if (segment.kind === 'table-cell') {
    const value = unit.tables?.[segment.table]?.rows?.[segment.row]?.[segment.column];
    if (
      value === undefined ||
      segment.merged !== (value === null) ||
      (value ?? '').slice(segment.start, segment.end) !== segment.text
    )
      return {
        ok: false,
        reason:
          '\u8868\u683c\u5355\u5143\u683c\u4e0e\u4fdd\u5b58\u7684\u539f\u6587\u4e0d\u4e00\u81f4',
      };
    text = segment.text;
    parts = [{ column: segment.column, start: 0, end: text.length, merged: value === null }];
  } else return { ok: false, reason: 'Unknown source segment' };
  const match = matchQuote(text, candidate.quote);
  if (!match)
    return { ok: false, reason: '\u5f15\u6587\u672a\u5339\u914d\u6307\u5b9a\u6765\u6e90\u6bb5' };
  return {
    ok: true,
    ...match,
    sourceStart:
      segment.kind === 'text' || segment.kind === 'table-cell'
        ? segment.start + match.start
        : match.start,
    sourceEnd:
      segment.kind === 'text' || segment.kind === 'table-cell'
        ? segment.start + match.end
        : match.end,
    kind: segment.kind,
    table: segment.table,
    row: segment.row,
    column: segment.column,
    cells: parts
      .filter((p) => !p.merged && p.end > match.start && p.start < match.end)
      .map((p) => ({
        column: p.column,
        start: Math.max(0, match.start - p.start),
        end: Math.min(p.end - p.start, match.end - p.start),
      })),
    flags: unit.flags || [],
  };
}
export function collectCandidates(analysis, results) {
  const map = new Map();
  for (const result of results.filter((r) => !r.error))
    result.requirements.forEach((r, index) => {
      const key = JSON.stringify([r.category, r.text, r.quote]);
      if (!map.has(key))
        map.set(key, {
          ...r,
          id: analysis.runId + '_' + result.batchId + '_' + index,
          batchId: result.batchId,
        });
    });
  return [...map.values()];
}
const sourceCache = new WeakMap();
export async function sourceUnit(bridge, readingId, index) {
  let cache = sourceCache.get(bridge);
  if (!cache) {
    cache = new Map();
    sourceCache.set(bridge, cache);
  }
  const key = readingId + ':' + index;
  if (!cache.has(key))
    cache.set(
      key,
      bridge
        .request('GET', '/readings/' + readingId + '/units/' + index)
        .then(checked)
        .catch((e) => {
          cache.delete(key);
          throw e;
        }),
    );
  return cache.get(key);
}
export async function sourceState(bridge, plan) {
  const [files, readings] = await Promise.all([
    bridge.request('GET', '/files').then(checked),
    bridge.request('GET', '/readings').then(checked),
  ]);
  const reading = readings.items.find((r) => r.id === plan.readingId);
  return { reading, problem: currentSource(plan, reading, files.items) };
}
export function locationLabel(candidate, segment) {
  const l = candidate.location;
  let label = l.page
    ? '\u7b2c ' + l.page + ' \u9875'
    : l.block
      ? '\u7ed3\u6784\u5757 ' + l.block
      : l.lineStart
        ? '\u7b2c ' + l.lineStart + '\u2013' + l.lineEnd + ' \u884c'
        : '\u539f\u6587\u5757 ' + (candidate.unit + 1);
  if (segment?.kind !== 'text' && segment?.table != null)
    label +=
      ' / \u8868 ' +
      (segment.table + 1) +
      ' / \u884c ' +
      (segment.row + 1) +
      (segment.column != null ? ' / \u5217 ' + (segment.column + 1) : '');
  return label;
}
export function reviewedCandidate(candidate, decision, segments) {
  const segment = segments.get(decision?.segmentId || candidate.segmentId);
  return {
    ...candidate,
    ...(decision ? { text: decision.text, quote: decision.quote } : {}),
    ...(segment ? { segmentId: segment.id, unit: segment.unit, location: segment.location } : {}),
  };
}
export async function verifyReviewedCandidate(bridge, readingId, candidate, decision, segments) {
  const effective = reviewedCandidate(candidate, decision, segments),
    segment = segments.get(effective.segmentId),
    check = verifySourceQuote(
      effective,
      segment,
      await sourceUnit(bridge, readingId, effective.unit),
    );
  if (!check.ok) return check;
  const references = [];
  for (const ref of decision?.references || []) {
    const source = segments.get(ref.segmentId);
    if (!source) return { ok: false, reason: 'Supplemental source segment is unavailable' };
    const value = {
        segmentId: source.id,
        unit: source.unit,
        location: source.location,
        quote: ref.quote,
      },
      match = verifySourceQuote(value, source, await sourceUnit(bridge, readingId, source.unit));
    if (!match.ok)
      return { ok: false, reason: 'Supplemental quote does not match its source segment' };
    references.push({ ...value, match });
  }
  return { ...check, references };
}
export function evidenceLocation(name, candidate, segment, references = []) {
  return (
    name +
    ' / ' +
    [
      locationLabel(candidate, segment),
      ...references.map((r) =>
        locationLabel(r, {
          kind: r.match?.kind,
          table: r.match?.table,
          row: r.match?.row,
          column: r.match?.column,
        }),
      ),
    ]
      .filter((label, i, all) => all.indexOf(label) === i)
      .join('; ')
  );
}
export function buildSourceReview(
  analysis,
  candidates,
  issues,
  target,
  { id = crypto.randomUUID(), budget = 42000 } = {},
) {
  if (typeof target !== 'string' || !target.trim() || target.length > 300)
    throw new Error('\u8bf7\u586b\u5199\u672c\u6b21\u6295\u6807\u8303\u56f4');
  const segments = new Map(analysis.batches.flatMap((b) => b.segments).map((s) => [s.id, s]));
  const plan = {
    schema: 1,
    id,
    analysisRunId: analysis.runId,
    readingId: analysis.readingId,
    sourceHash: analysis.sourceHash,
    fileId: analysis.fileId,
    name: analysis.name,
    unitCount: analysis.unitCount,
    target: target.trim(),
    batches: [],
  };
  let batch = { id: 'review-1', candidates: [], segments: [], issues: [] };
  const append = (old, c) => {
    const group = [...old.candidates, c],
      ids = new Set(group.map((c) => c.segmentId));
    for (const item of group) {
      const segment = segments.get(item.segmentId);
      if (!segment) throw new Error('\u5019\u9009\u7f3a\u5c11\u6709\u6548\u6765\u6e90');
      for (const source of segments.values())
        if (
          source.unit === segment.unit &&
          (source.kind === 'text' || (source.table === segment.table && source.row === 0))
        )
          ids.add(source.id);
    }
    return {
      ...old,
      candidates: group,
      segments: [...ids].map((id) => segments.get(id)),
      issues: issues.filter((i) => ids.has(i.segmentId)),
    };
  };
  for (const candidate of candidates) {
    let next = append(batch, candidate);
    if (
      batch.candidates.length &&
      (next.candidates.length > 40 || bytes(JSON.stringify(reviewContext(plan, next))) > budget)
    ) {
      plan.batches.push(batch);
      batch = {
        id: 'review-' + (plan.batches.length + 1),
        candidates: [],
        segments: [],
        issues: [],
      };
      next = append(batch, candidate);
    }
    if (bytes(JSON.stringify(reviewContext(plan, next))) > budget)
      throw new Error(
        '\u5355\u9879\u6838\u9a8c\u8d44\u6599\u8d85\u51fa\u4e0a\u4e0b\u6587\u9884\u7b97\uff0c\u672a\u622a\u65ad\u5185\u5bb9',
      );
    batch = next;
  }
  if (batch.candidates.length) plan.batches.push(batch);
  if (!plan.batches.length || plan.batches.length > 80 || bytes(JSON.stringify(plan)) > 950000)
    throw new Error(
      '\u6838\u9a8c\u8d44\u6599\u8d85\u51fa\u4fdd\u5b58\u5bb9\u91cf\uff0c\u672a\u4e22\u5f03\u5019\u9009',
    );
  return plan;
}
export const reviewContext = (plan, batch) => ({
  reviewId: plan.id,
  analysisRunId: plan.analysisRunId,
  readingId: plan.readingId,
  sourceHash: plan.sourceHash,
  batchId: batch.id,
  target: plan.target,
  candidates: batch.candidates,
  segments: batch.segments,
  issues: batch.issues,
});
export function parseSourceReview(text, expected) {
  if (typeof text !== 'string' || bytes(text) > 500000)
    throw new Error('\u6838\u9a8c\u7ed3\u679c\u683c\u5f0f\u65e0\u6548');
  const result = JSON.parse(
    text
      .trim()
      .replace(/^\x60{3}(?:json)?\s*/, '')
      .replace(/\x60{3}$/, ''),
  );
  for (const key of ['reviewId', 'analysisRunId', 'readingId', 'sourceHash', 'batchId'])
    if (result[key] !== expected[key])
      throw new Error(
        '\u6838\u9a8c\u7ed3\u679c\u4e0e\u5f53\u524d\u539f\u6587\u7248\u672c\u4e0d\u4e00\u81f4',
      );
  const ids = expected.candidates.map((c) => c.id);
  if (
    !Array.isArray(result.reviews) ||
    result.reviews.length !== ids.length ||
    new Set(result.reviews.map((r) => r.id)).size !== ids.length
  )
    throw new Error(
      '\u6838\u9a8c\u7ed3\u679c\u672a\u9010\u9879\u8986\u76d6\u5168\u90e8\u5019\u9009',
    );
  return result.reviews.map((r) => {
    if (
      !ids.includes(r.id) ||
      !['supported', 'needs_review', 'unsupported'].includes(r.support) ||
      !['target', 'shared', 'other', 'uncertain'].includes(r.scope) ||
      typeof r.reason !== 'string' ||
      !r.reason.trim() ||
      r.reason.length > 1600 ||
      !Array.isArray(r.conflicts) ||
      r.conflicts.some((id) => id === r.id || !ids.includes(id))
    )
      throw new Error(
        '\u6838\u9a8c\u7ed3\u679c\u7684\u652f\u6301\u72b6\u6001\u3001\u9002\u7528\u8303\u56f4\u6216\u51b2\u7a81\u5f15\u7528\u65e0\u6548',
      );
    return {
      id: r.id,
      support: r.support,
      scope: r.scope,
      reason: r.reason,
      conflicts: [...new Set(r.conflicts)],
    };
  });
}
export class SourceVerification {
  constructor(bridge, readingId) {
    this.bridge = bridge;
    this.readingId = readingId;
    this.request = new BackgroundRequest(bridge, 'bid_source_review_' + readingId);
    this.plan = null;
    this.cache = new Map();
    this.checks = new Map();
    this.segments = new Map();
    this.decisions = {};
    this.decisionRevision = 0;
  }
  async prepare(analysis, results) {
    this.analysis = analysis;
    this.results = results;
    this.candidates = collectCandidates(analysis, results);
    this.segments = new Map(analysis.batches.flatMap((b) => b.segments).map((s) => [s.id, s]));
    const state = await sourceState(this.bridge, analysis);
    this.problem = state.problem;
    this.reading = state.reading;
    await Promise.all(
      this.candidates.map(async (c) => {
        const u = await sourceUnit(this.bridge, analysis.readingId, c.unit);
        this.checks.set(c.id, verifySourceQuote(c, this.segments.get(c.segmentId), u));
      }),
    );
  }
  async load() {
    const decisions = await this.bridge.request(
      'GET',
      '/documents/bid_source_decisions_' + this.readingId,
    );
    if (!decisions.ok && decisions.status !== 404) throw new DocumentError(decisions);
    if (decisions.ok) {
      this.decisions = JSON.parse(decisions.body.markdown);
      this.decisionRevision = decisions.body.revision;
    }
    await this.request.load();
    if (!this.request.value) return;
    const reference = this.request.value.spec.sources.find((s) =>
      s.id.startsWith('bid_source_plan_'),
    );
    if (!reference) throw new Error('Missing source review manifest');
    const doc = checked(await this.bridge.request('GET', '/documents/' + reference.id));
    if (doc.revision !== reference.revision) throw new Error('Source review manifest changed');
    this.plan = JSON.parse(doc.markdown);
    if (this.plan.readingId !== this.readingId)
      throw new Error('Review belongs to a different reading');
    await this.request.sync();
  }
  async start(target, analysisSource) {
    if (this.problem) throw new Error(this.problem);
    if (
      !analysisSource ||
      this.results.some((r) => r.error) ||
      new Set(this.results.map((r) => r.batchId)).size !== this.analysis.batches.length
    )
      throw new Error(
        '\u8bf7\u5148\u5b8c\u6210\u5168\u90e8\u89e3\u8bfb\u6279\u6b21\uff0c\u518d\u6838\u9a8c\u6765\u6e90',
      );
    if (this.request.job && !['completed', 'error', 'cancelled'].includes(this.request.job.state))
      throw new Error(
        '\u5f53\u524d\u5df2\u6709\u6838\u9a8c\u4efb\u52a1\uff0c\u8bf7\u7ee7\u7eed\u6216\u91cd\u8bd5\u539f\u4efb\u52a1',
      );
    const plan = buildSourceReview(
      this.analysis,
      this.candidates,
      this.results.filter((r) => !r.error).flatMap((r) => r.issues),
      target,
    );
    const spec = {
      id: plan.id,
      label: (
        '\u9700\u6c42\u6765\u6e90\u4e0e\u9002\u7528\u8303\u56f4\u6838\u9a8c \u00b7 ' + plan.name
      ).slice(0, 120),
      sources: [],
      steps: plan.batches.map((b) => ({
        id: b.id,
        taskId: 'verify_tender_sources',
        context: {
          id: 'bid_source_review_context',
          markdown: JSON.stringify(reviewContext(plan, b)),
        },
      })),
    };
    if (bytes(JSON.stringify({ spec })) > 950000)
      throw new Error('\u6838\u9a8c\u8bf7\u6c42\u8d85\u51fa\u4fdd\u5b58\u5bb9\u91cf');
    const doc = checked(
      await this.bridge.request('PUT', '/documents/bid_source_plan_' + plan.id, {
        markdown: JSON.stringify(plan),
        revision: 0,
      }),
    );
    spec.sources = [
      analysisSource,
      { id: doc.id || 'bid_source_plan_' + plan.id, revision: doc.revision },
    ];
    this.plan = plan;
    return this.request.start(spec);
  }
  async reports() {
    const out = new Map(),
      errors = [];
    const job = this.request.job;
    if (!job || !this.plan) return { reviews: out, errors };
    for (const step of job.steps.filter((s) => s.state === 'done')) {
      let result = this.cache.get(step.resultDocument);
      if (!result) {
        try {
          const raw = await this.request.result(step);
          if (!raw?.verified) throw new Error('Review task has not completed');
          const batch = this.plan.batches.find((b) => b.id === step.id);
          result = {
            reviews: parseSourceReview(
              raw.content.requirement_analysis,
              reviewContext(this.plan, batch),
            ),
          };
        } catch (e) {
          result = { error: e.message };
        }
        this.cache.set(step.resultDocument, result);
      }
      if (result.error) errors.push({ step: step.id, error: result.error });
      else for (const review of result.reviews) out.set(review.id, { ...review, step: step.id });
    }
    // A conflict reported by either participant blocks both participants.
    for (const r of [...out.values()])
      for (const id of r.conflicts) {
        const other = out.get(id);
        if (other && !other.conflicts.includes(r.id)) other.conflicts.push(r.id);
      }
    return { reviews: out, errors };
  }
  async ready() {
    const { reviews, errors } = await this.reports();
    const compatible =
      this.plan?.analysisRunId === this.analysis?.runId &&
      this.plan?.sourceHash === this.analysis?.sourceHash;
    return Promise.all(
      this.candidates.map(async (c) => {
        const saved = this.decisions[c.id],
          decision = saved?.target === (this.plan?.target || this.analysis.name) ? saved : null;
        const effective = reviewedCandidate(c, decision, this.segments),
          check = decision
            ? await verifyReviewedCandidate(this.bridge, this.readingId, c, decision, this.segments)
            : this.checks.get(c.id),
          review = compatible ? reviews.get(c.id) : null;
        const status = this.problem
          ? 'source-error'
          : decision?.scope === 'other'
            ? 'excluded'
            : !check?.ok
              ? 'source-error'
              : decision?.disposition === 'clarification'
                ? 'clarification'
                : decision
                  ? 'ready'
                  : !review
                    ? 'pending'
                    : review.scope === 'other'
                      ? 'excluded'
                      : review.support !== 'supported' ||
                          review.scope === 'uncertain' ||
                          review.conflicts.length
                        ? 'review'
                        : 'ready';
        return { ...effective, check, review, decision, status, reviewErrors: errors };
      }),
    );
  }
  async decide(
    id,
    {
      text,
      quote,
      scope,
      note,
      segmentId,
      references = [],
      disposition = 'resolved',
      reviewer = 'user',
    },
  ) {
    const candidate = this.candidates.find((c) => c.id === id);
    if (
      !candidate ||
      typeof text !== 'string' ||
      !text.trim() ||
      text.length > 4000 ||
      typeof quote !== 'string' ||
      !quote.trim() ||
      quote.length > 4000 ||
      !['target', 'shared', 'other'].includes(scope) ||
      typeof note !== 'string' ||
      note.trim().length < 4 ||
      note.length > 1600
    )
      throw new Error(
        '\u8bf7\u586b\u5199\u590d\u6838\u8bf4\u660e\uff0c\u5e76\u660e\u786e\u9002\u7528\u8303\u56f4',
      );
    if (
      !['resolved', 'clarification', 'recorded'].includes(disposition) ||
      !['user', 'assistant'].includes(reviewer) ||
      (segmentId && !this.segments.has(segmentId)) ||
      !Array.isArray(references) ||
      references.length > 8 ||
      references.some(
        (r) =>
          !this.segments.has(r.segmentId) ||
          typeof r.quote !== 'string' ||
          !r.quote.trim() ||
          r.quote.length > 4000,
      )
    )
      throw new Error('Invalid exception disposition or supplemental source');
    const state = await sourceState(this.bridge, this.analysis);
    if (state.problem) throw new Error(state.problem);
    const decision = {
      text: text.trim(),
      quote,
      scope,
      note: note.trim(),
      segmentId: segmentId || candidate.segmentId,
      references: references.map((r) => ({ segmentId: r.segmentId, quote: r.quote })),
      disposition,
      reviewer,
      target: this.plan?.target || this.analysis.name,
      at: new Date().toISOString(),
    };
    const check = await verifyReviewedCandidate(
      this.bridge,
      this.readingId,
      candidate,
      decision,
      this.segments,
    );
    if (scope !== 'other' && !check.ok)
      throw new Error(
        '\u4fee\u8ba2\u540e\u7684\u5f15\u6587\u5fc5\u987b\u5339\u914d\u6307\u5b9a\u6765\u6e90\u6bb5',
      );
    const old = this.decisions[id];
    if (old) {
      const { history = [], ...previous } = old;
      decision.history = [...history, previous];
    }
    const next = { ...this.decisions, [id]: decision };
    const doc = checked(
      await this.bridge.request('PUT', '/documents/bid_source_decisions_' + this.readingId, {
        markdown: JSON.stringify(next),
        revision: this.decisionRevision,
      }),
    );
    this.decisions = next;
    this.decisionRevision = doc.revision;
  }
  async adoptable() {
    await this.load();
    await this.prepare(this.analysis, this.results);
    if (this.problem) throw new Error(this.problem);
    const rows = (await this.ready()).filter((c) => c.status === 'ready');
    return Promise.all(
      rows.map(async (c) => {
        const segment = this.segments.get(c.segmentId),
          row = {
            id: crypto.randomUUID(),
            category: c.category,
            text: c.text,
            quote: c.quote,
            location: evidenceLocation(this.analysis.name, c, segment, c.check.references),
            origin: 'ai',
            confirmed: false,
          };
        row.evidence = {
          schema: 1,
          status: c.decision ? 'manual-reviewed' : 'verified',
          candidateId: c.id,
          analysisManifest: 'bid_analysis_manifest_' + this.analysis.runId,
          analysisRunId: this.analysis.runId,
          readingId: this.analysis.readingId,
          sourceHash: this.analysis.sourceHash,
          fileId: this.analysis.fileId,
          unit: c.unit,
          segmentId: c.segmentId,
          match: c.check,
          ...(c.check.references?.length ? { references: c.check.references } : {}),
          reviewId: this.plan?.id || null,
          reviewStep: c.review?.step || null,
          target: this.plan?.target || this.analysis.name,
          scope: c.decision?.scope || c.review.scope,
          decisionAt: c.decision?.at || null,
          ...(c.decision ? { reason: c.decision.note, manualReview: c.decision } : {}),
          binding: await evidenceDigest(row),
        };
        return row;
      }),
    );
  }
}
/** Recheck persisted source references before confirmation or downstream planning. */
export async function checkMatrixSources(bridge, rows, { onUnresolved = () => {} } = {}) {
  const problems = new Map(),
    groups = new Map(),
    unresolved = [];
  for (const row of rows)
    if (row.evidence) {
      const e = row.evidence;
      if (
        e.schema !== 1 ||
        e.binding !== (await evidenceDigest(row)) ||
        !['verified', 'manual-reviewed'].includes(e.status) ||
        !['target', 'shared'].includes(e.scope)
      ) {
        problems.set(
          row.id,
          '\u9700\u6c42\u6216\u4f9d\u636e\u5df2\u53d8\u5316\uff0c\u8bf7\u91cd\u65b0\u6838\u9a8c',
        );
        continue;
      }
      const key = e.analysisManifest;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(row);
    }
  await Promise.all(
    [...groups].map(async ([id, items]) => {
      try {
        const plan = JSON.parse(checked(await bridge.request('GET', '/documents/' + id)).markdown);
        const state = await sourceState(bridge, plan);
        if (state.problem) throw new Error(state.problem);
        const segments = new Map(plan.batches.flatMap((b) => b.segments).map((s) => [s.id, s]));
        const optional = async (name) => {
          const r = await bridge.request('GET', '/documents/' + name);
          if (!r.ok && r.status === 404) return null;
          return JSON.parse(checked(r).markdown);
        };
        const [decisions, pointer] = await Promise.all([
          optional('bid_source_decisions_' + plan.readingId),
          optional('bid_source_review_' + plan.readingId),
        ]);
        const reviewCache = new Map();
        const reviewReport = (reviewId) => {
          if (!reviewCache.has(reviewId))
            reviewCache.set(
              reviewId,
              (async () => {
                const job = checked(await bridge.request('GET', '/jobs/' + reviewId)),
                  reference = job.sources.find((s) => s.id.startsWith('bid_source_plan_'));
                if (!reference) throw new Error('Missing saved review manifest');
                const doc = checked(await bridge.request('GET', '/documents/' + reference.id));
                if (doc.revision !== reference.revision)
                  throw new Error('Saved review manifest changed');
                const reviewPlan = JSON.parse(doc.markdown),
                  reviews = new Map(),
                  candidates = new Map();
                if (
                  reviewPlan.readingId !== plan.readingId ||
                  reviewPlan.sourceHash !== plan.sourceHash ||
                  reviewPlan.analysisRunId !== plan.runId
                )
                  throw new Error('Saved review source changed');
                for (const step of job.steps.filter((s) => s.state === 'done')) {
                  try {
                    const batch = reviewPlan.batches.find((b) => b.id === step.id);
                    if (!batch) throw new Error('Unknown review batch');
                    const result = JSON.parse(
                      checked(await bridge.request('GET', '/documents/' + step.resultDocument))
                        .markdown,
                    );
                    if (!result.verified) throw new Error('Unverified model review');
                    for (const r of parseSourceReview(
                      result.content.requirement_analysis,
                      reviewContext(reviewPlan, batch),
                    ))
                      reviews.set(r.id, r);
                    for (const c of batch.candidates) candidates.set(c.id, c);
                  } catch {
                    continue;
                  }
                }
                for (const r of [...reviews.values()])
                  for (const id of r.conflicts) {
                    const other = reviews.get(id);
                    if (other && !other.conflicts.includes(r.id)) other.conflicts.push(r.id);
                  }
                return { plan: reviewPlan, reviews, candidates };
              })(),
            );
          return reviewCache.get(reviewId);
        };
        if (pointer) {
          const active = await reviewReport(pointer.spec.id);
          const seen = new Set();
          for (const candidate of active.candidates.values()) {
            const d =
                decisions?.[candidate.id]?.target === active.plan.target
                  ? decisions[candidate.id]
                  : null,
              r = active.reviews.get(candidate.id);
            if (d?.scope === 'other' || (!d && r?.scope === 'other')) continue;
            const effective = reviewedCandidate(candidate, d, segments),
              check = await verifyReviewedCandidate(bridge, plan.readingId, candidate, d, segments);
            if (
              !check.ok ||
              d?.disposition === 'clarification' ||
              (!d &&
                (!r || r.support !== 'supported' || r.scope === 'uncertain' || r.conflicts.length))
            ) {
              if (!seen.has(candidate.id)) {
                seen.add(candidate.id);
                unresolved.push({
                  id: candidate.id,
                  text: effective.text,
                  reason: d?.note || r?.reason || check.reason,
                  disposition: d?.disposition || 'review',
                });
              }
            }
          }
          if (
            active.candidates.size <
            active.plan.batches.reduce((n, b) => n + b.candidates.length, 0)
          )
            unresolved.push({
              id: active.plan.id,
              text: 'Incomplete source review',
              reason: 'Source review has incomplete or invalid batches',
              disposition: 'review',
            });
        }
        await Promise.all(
          items.map(async (row) => {
            try {
              const e = row.evidence;
              if (
                e.readingId !== plan.readingId ||
                e.sourceHash !== plan.sourceHash ||
                e.fileId !== plan.fileId ||
                e.analysisRunId !== plan.runId
              )
                throw new Error(
                  '\u539f\u6587\u7248\u672c\u5df2\u53d8\u5316\uff0c\u8bf7\u91cd\u65b0\u6838\u9a8c',
                );
              const segment = segments.get(e.segmentId),
                candidate = {
                  quote: row.quote,
                  segmentId: e.segmentId,
                  unit: e.unit,
                  location: e.sourceLocation || segment?.location,
                };
              if (row.location !== evidenceLocation(plan.name, candidate, segment, e.references))
                throw new Error(
                  '\u4f9d\u636e\u4f4d\u7f6e\u5df2\u53d8\u5316\uff0c\u8bf7\u4f7f\u7528\u4fdd\u5b58\u7684\u539f\u6587\u4f4d\u7f6e',
                );
              const result = verifySourceQuote(
                candidate,
                segment,
                await sourceUnit(bridge, e.readingId, e.unit),
              );
              if (!result.ok) throw new Error(result.reason);
              for (const ref of e.references || []) {
                const source = segments.get(ref.segmentId);
                if (
                  !source ||
                  ref.unit !== source.unit ||
                  JSON.stringify(ref.location) !== JSON.stringify(source.location) ||
                  !verifySourceQuote(
                    ref,
                    source,
                    await sourceUnit(bridge, e.readingId, source.unit),
                  ).ok
                )
                  throw new Error('Supplemental evidence changed');
              }
              const decision = decisions?.[e.candidateId];
              if (
                (decision?.at || null) !== (e.decisionAt || null) ||
                decision?.scope === 'other' ||
                decision?.disposition === 'clarification'
              )
                throw new Error(
                  '\u5019\u9009\u8303\u56f4\u6216\u590d\u6838\u8bb0\u5f55\u5df2\u66f4\u65b0\uff0c\u8bf7\u6838\u5bf9\u5df2\u91c7\u7eb3\u7684\u9700\u6c42',
                );
              if (e.reviewId && pointer?.spec.id !== e.reviewId)
                throw new Error(
                  '\u5df2\u6709\u65b0\u4e00\u8f6e\u6765\u6e90\u6838\u9a8c\uff0c\u8bf7\u6838\u5bf9\u5df2\u91c7\u7eb3\u7684\u9700\u6c42',
                );
              if (e.status === 'manual-reviewed') {
                if (!e.manualReview?.note || e.manualReview.note.trim().length < 4)
                  throw new Error('\u7f3a\u5c11\u4eba\u5de5\u590d\u6838\u8bf4\u660e');
              } else {
                const saved = await reviewReport(e.reviewId),
                  review = saved.reviews.get(e.candidateId),
                  original = saved.candidates.get(e.candidateId);
                if (
                  !review ||
                  review.support !== 'supported' ||
                  !['target', 'shared'].includes(review.scope) ||
                  review.conflicts.length ||
                  review.scope !== e.scope ||
                  saved.plan.target !== e.target ||
                  original?.text !== row.text ||
                  original?.quote !== row.quote ||
                  original?.category !== row.category ||
                  original?.segmentId !== e.segmentId
                )
                  throw new Error(
                    '\u4fdd\u5b58\u7684\u667a\u80fd\u6838\u9a8c\u7ed3\u679c\u4e0d\u652f\u6301\u6b64\u9879\u9700\u6c42',
                  );
              }
            } catch (error) {
              problems.set(row.id, error.message);
            }
          }),
        );
      } catch (error) {
        for (const row of items) problems.set(row.id, error.message);
      }
    }),
  );
  onUnresolved([...new Map(unresolved.map((r) => [r.id, r])).values()]);
  return problems;
}
export async function manuallyReviewMatrixRow(bridge, row, note) {
  if (!row.evidence || typeof note !== 'string' || note.trim().length < 4 || note.length > 1600)
    throw new Error('\u8bf7\u586b\u5199\u5177\u4f53\u7684\u4eba\u5de5\u590d\u6838\u8bf4\u660e');
  const e = row.evidence,
    plan = JSON.parse(
      checked(await bridge.request('GET', '/documents/' + e.analysisManifest)).markdown,
    ),
    state = await sourceState(bridge, plan);
  if (
    state.problem ||
    e.readingId !== plan.readingId ||
    e.sourceHash !== plan.sourceHash ||
    e.fileId !== plan.fileId
  )
    throw new Error(
      state.problem ||
        '\u539f\u6587\u7248\u672c\u5df2\u53d8\u5316\uff0c\u8bf7\u91cd\u65b0\u6838\u9a8c',
    );
  const segments = new Map(plan.batches.flatMap((b) => b.segments).map((s) => [s.id, s])),
    segment = segments.get(e.segmentId),
    candidate = {
      quote: row.quote,
      segmentId: e.segmentId,
      unit: e.unit,
      location: e.sourceLocation || segment?.location,
    };
  if (row.location !== evidenceLocation(plan.name, candidate, segment, e.references))
    throw new Error(
      '\u8bf7\u4f7f\u7528\u4fdd\u5b58\u7684\u6765\u6e90\u4f4d\u7f6e\uff0c\u624b\u5de5\u66f4\u6362\u7684\u4f4d\u7f6e\u65e0\u6cd5\u6838\u9a8c',
    );
  const check = verifySourceQuote(
    candidate,
    segment,
    await sourceUnit(bridge, e.readingId, e.unit),
  );
  if (!check.ok) throw new Error('\u5f15\u6587\u672a\u5339\u914d\u6307\u5b9a\u6765\u6e90\u6bb5');
  for (const ref of e.references || []) {
    const s = segments.get(ref.segmentId);
    if (
      !s ||
      !verifySourceQuote(
        { ...ref, unit: s.unit, location: s.location },
        s,
        await sourceUnit(bridge, e.readingId, s.unit),
      ).ok
    )
      throw new Error('Supplemental evidence changed');
  }
  const optional = async (id) => {
    const r = await bridge.request('GET', '/documents/' + id);
    if (!r.ok && r.status === 404) return null;
    return JSON.parse(checked(r).markdown);
  };
  const [decisions, pointer] = await Promise.all([
      optional('bid_source_decisions_' + e.readingId),
      optional('bid_source_review_' + e.readingId),
    ]),
    decision = decisions?.[e.candidateId];
  if (decision?.scope === 'other' || decision?.disposition === 'clarification')
    throw new Error(
      '\u5019\u9009\u5df2\u6392\u9664\u6216\u4ecd\u5f85\u6f84\u6e05\uff0c\u8bf7\u5148\u5728\u62db\u6807\u89e3\u8bfb\u4e2d\u5b8c\u6210\u5f02\u5e38\u5904\u7f6e',
    );
  let target = e.target;
  const latest = pointer?.spec.sources.find((s) => s.id.startsWith('bid_source_plan_'));
  if (latest) {
    const doc = checked(await bridge.request('GET', '/documents/' + latest.id));
    if (doc.revision !== latest.revision) throw new Error('Saved review manifest changed');
    target = JSON.parse(doc.markdown).target;
  }
  const scope = decision?.scope || e.scope;
  row.evidence = {
    ...e,
    status: 'manual-reviewed',
    reviewId: pointer?.spec.id || e.reviewId,
    target,
    scope,
    decisionAt: decision?.at || null,
    match: check,
    binding: await evidenceDigest(row),
    reason: note.trim(),
    manualReview: { note: note.trim(), at: new Date().toISOString(), scope, target },
  };
  row.confirmed = false;
}
