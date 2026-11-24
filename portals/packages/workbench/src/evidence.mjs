/**
 * @package @bidproposal/workbench
 * @layer Presentation
 * @category Business
 * @author AI-Generated
 * @date 2026-11-25
 */
import { BackgroundRequest, checked } from './background.mjs';
import { buildTenderBatches } from './batch-analysis.mjs';
import { Requirements } from './requirements.mjs';

const bytes = (v) => new TextEncoder().encode(JSON.stringify(v)).byteLength;
const clone = (v) => structuredClone(v);
const text = (v, max = 1500) => typeof v === 'string' && !!v.trim() && v.length <= max;
const norm = (v) => v.normalize('NFKC').replace(/\s+/g, '').toLowerCase();
const terminal = (j) => !j || ['completed', 'error', 'cancelled'].includes(j.state);
const today = () => {
  const d = new Date();
  return [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, '0'),
    String(d.getDate()).padStart(2, '0'),
  ].join('-');
};
export const digest = async (v) =>
  Array.from(
    new Uint8Array(
      await crypto.subtle.digest('SHA-256', new TextEncoder().encode(JSON.stringify(v))),
    ),
  )
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
const json = (raw) => {
  if (typeof raw !== 'string' || bytes(raw) > 500000) throw new Error('Invalid evidence result');
  return JSON.parse(
    raw
      .trim()
      .replace(/^```(?:json)?\s*/, '')
      .replace(/```$/, ''),
  );
};
function envelope(value, input) {
  for (const key of ['runId', 'inputDigest', 'batchId'])
    if (value?.[key] !== input[key]) throw new Error('Evidence result belongs to another input');
}
const refs = (items) =>
  items.map(({ id, version, hash, fileId, readingId, name, category }) => ({
    id,
    version,
    hash,
    fileId,
    readingId,
    name,
    category,
  }));
export const extractContext = (plan, batch) => ({
  runId: plan.runId,
  inputDigest: plan.inputDigest,
  batchId: batch.id,
  sources: plan.sources,
  segments: batch.segments,
});
export async function extractionPlan(
  sources,
  units,
  { runId = crypto.randomUUID(), budget = 21000 } = {},
) {
  if (!sources.length)
    throw new Error(
      '\u8bf7\u5148\u5728\u9879\u76ee\u57fa\u7840\u914d\u7f6e\u9009\u7528\u4f01\u4e1a\u8d44\u6599',
    );
  const plan = { schema: 1, runId, sources: refs(sources), batches: [] };
  plan.inputDigest = await digest(plan.sources);
  for (const source of plan.sources) {
    const blocks = units.get(source.readingId);
    const sub = buildTenderBatches(
      blocks,
      {
        id: source.readingId,
        fileId: source.fileId,
        hash: source.hash,
        name: source.name,
        state: 'completed',
        units: blocks?.length,
      },
      { batchBytes: Math.max(8000, budget - 4000) },
    );
    for (const batch of sub.batches) {
      const segments = batch.segments.map((s) => ({
        ...s,
        id: 's' + plan.sources.indexOf(source) + '-' + s.id,
        sourceId: source.id,
        readingId: source.readingId,
      }));
      const value = { id: 'extract-' + (plan.batches.length + 1), segments };
      if (bytes(extractContext(plan, value)) > budget)
        throw new Error('\u8d44\u6599\u8d85\u51fa\u6279\u6b21\u9884\u7b97\uff0c\u672a\u622a\u65ad');
      plan.batches.push(value);
    }
  }
  if (plan.batches.length > 80 || bytes(plan) > 850000)
    throw new Error(
      '\u8d44\u6599\u8d85\u51fa\u672c\u6b21\u5904\u7406\u4e0a\u9650\uff0c\u8bf7\u5206\u6b21\u9009\u7528\uff1b\u672a\u622a\u65ad',
    );
  return plan;
}
const segmentText = (s) =>
  s.kind === 'table-row' ? (s.cells || []).filter((v) => v !== null).join(' | ') : s.text || '';
export function parseFacts(raw, input) {
  const value = json(raw);
  envelope(value, input);
  const ids = input.segments.map((s) => s.id),
    seen = value.processedSegmentIds;
  if (
    !Array.isArray(seen) ||
    seen.length !== ids.length ||
    new Set(seen).size !== ids.length ||
    seen.some((id) => !ids.includes(id))
  )
    throw new Error('Not all evidence source blocks were inspected');
  if (!Array.isArray(value.facts) || value.facts.length > 40)
    throw new Error('Evidence fact limit exceeded');
  if (value.facts.length === 40)
    throw new Error(
      '\u672c\u6279\u4e8b\u5b9e\u8fbe\u5230\u8f93\u51fa\u4e0a\u9650\uff0c\u8bf7\u7f29\u5c0f\u9009\u7528\u8d44\u6599\u91cd\u8bd5\uff1b\u672a\u5ba3\u79f0\u5b8c\u6574',
    );
  return value.facts.map((f, index) => {
    const segment = input.segments.find((s) => s.id === f.segmentId),
      source = segment && input.sources.find((s) => s.id === segment.sourceId),
      body = segment && segmentText(segment);
    if (
      !source ||
      ['subject', 'attribute', 'value', 'quote'].some(
        (k) => !text(f[k], k === 'quote' ? 3000 : 1000),
      ) ||
      !['qualification', 'person', 'product', 'solution', 'case'].includes(f.kind) ||
      typeof f.uncertainty !== 'string' ||
      f.uncertainty.length > 1500
    )
      throw new Error('Fact has invalid fields or source');
    if (!body.includes(f.quote))
      throw new Error('Fact quote is absent from its exact source block');
    if (
      !['dated', 'unknown', 'not_applicable'].includes(f.validity) ||
      typeof f.dateQuote !== 'string' ||
      f.dateQuote.length > 1200
    )
      throw new Error('Invalid fact validity');
    if (f.kind === 'qualification' && f.validity === 'not_applicable')
      throw new Error('Qualification validity must be stated or unknown');
    if (f.validity === 'dated') {
      if (
        typeof f.validUntil !== 'string' ||
        !/^\d{4}-\d{2}-\d{2}$/.test(f.validUntil) ||
        !f.dateQuote ||
        !body.includes(f.dateQuote) ||
        new Date(f.validUntil + 'T00:00:00Z').toISOString().slice(0, 10) !== f.validUntil
      )
        throw new Error('Validity date has no exact source');
      const [y, m, d] = f.validUntil.split('-');
      const dates = new RegExp(
        y +
          '(?:[-/.]|\\s*\u5e74\\s*)0?' +
          Number(m) +
          '(?:[-/.]|\\s*\u6708\\s*)0?' +
          Number(d) +
          '(?:\u65e5)?',
      );
      if (!dates.test(f.dateQuote)) throw new Error('Validity date differs from cited source');
    } else if (f.validUntil !== null || f.dateQuote)
      throw new Error('Unstated date must remain absent');
    return {
      id: input.runId + '-' + input.batchId + '-' + index,
      kind: f.kind,
      subject: f.subject,
      attribute: f.attribute,
      value: f.value,
      quote: f.quote,
      validity: f.validity,
      validUntil: f.validUntil,
      dateQuote: f.dateQuote,
      uncertainty: f.uncertainty,
      source: clone(source),
      segment: clone(segment),
    };
  });
}
export function factFlags(facts, asOf = today()) {
  const groups = new Map();
  for (const f of facts) {
    const key = norm(f.subject) + '|' + norm(f.attribute);
    if (!groups.has(key)) groups.set(key, new Set());
    groups.get(key).add(norm(f.value));
  }
  return facts.map((f) => ({
    ...f,
    flags: [
      ...(f.validUntil && f.validUntil < asOf ? ['expired'] : []),
      ...(f.validity === 'unknown' ? ['undated'] : []),
      ...(groups.get(norm(f.subject) + '|' + norm(f.attribute)).size > 1 ? ['conflict'] : []),
      ...(f.uncertainty ? ['uncertain'] : []),
      ...(f.segment.flags?.length ? ['source-warning'] : []),
    ],
  }));
}
export const matchContext = (plan, batch) => ({
  runId: plan.runId,
  inputDigest: plan.inputDigest,
  batchId: batch.id,
  asOf: plan.asOf,
  requirements: batch.requirements,
  facts: batch.facts,
});
export async function matchingPlan(
  requirements,
  facts,
  binding,
  { runId = crypto.randomUUID(), budget = 26000 } = {},
) {
  if (!requirements.length)
    throw new Error('\u8bf7\u5148\u6dfb\u52a0\u6216\u89e3\u8bfb\u62db\u6807\u9700\u6c42');
  const plan = {
    schema: 1,
    runId,
    asOf: today(),
    binding,
    requirements: requirements.map(({ id, category, text, quote, location }) => ({
      id,
      category,
      text,
      quote,
      location,
    })),
    batches: [],
  };
  plan.inputDigest = await digest({ binding, requirements: plan.requirements, facts });
  // Cross every requirement group with every fact partition; a missing result
  // only becomes a gap when every partition has been inspected.
  const partitions = [];
  let current = [];
  for (const f of facts) {
    const item = {
      id: f.id,
      kind: f.kind,
      subject: f.subject,
      attribute: f.attribute,
      value: f.effectiveValue || f.value,
      quote: f.quote,
      sourceName: f.source.name,
      version: f.source.version,
      validUntil: f.validUntil,
      flags: f.flags,
      decision: f.decision || null,
    };
    if (current.length && (current.length >= 30 || bytes([...current, item]) > budget / 2)) {
      partitions.push(current);
      current = [];
    }
    if (bytes([item]) > budget / 2)
      throw new Error('\u5355\u9879\u4e8b\u5b9e\u8d85\u51fa\u9884\u7b97\uff0c\u672a\u622a\u65ad');
    current.push(item);
  }
  if (current.length || !partitions.length) partitions.push(current);
  for (const partition of partitions) {
    let group = [];
    const add = () => {
      if (group.length)
        plan.batches.push({
          id: 'match-' + (plan.batches.length + 1),
          requirements: group,
          facts: partition,
        });
      group = [];
    };
    for (const r of plan.requirements) {
      const candidate = { id: 'match-next', requirements: [...group, r], facts: partition };
      if (group.length && (group.length >= 8 || bytes(matchContext(plan, candidate)) > budget)) {
        add();
        candidate.requirements = [r];
      }
      if (bytes(matchContext(plan, candidate)) > budget)
        throw new Error('\u5355\u9879\u9700\u6c42\u8d85\u51fa\u9884\u7b97\uff0c\u672a\u622a\u65ad');
      group.push(r);
    }
    add();
  }
  if (plan.batches.length > 80 || bytes(plan) > 850000)
    throw new Error(
      '\u5339\u914d\u8d85\u51fa\u672c\u6b21\u9884\u7b97\uff0c\u8bf7\u7f29\u5c0f\u9009\u7528\u8d44\u6599\uff1b\u672a\u622a\u65ad',
    );
  return plan;
}
export function parseMatches(raw, input) {
  const value = json(raw);
  envelope(value, input);
  if (
    !Array.isArray(value.recommendations) ||
    value.recommendations.length !== input.requirements.length ||
    new Set(value.recommendations.map((r) => r.requirementId)).size !== input.requirements.length
  )
    throw new Error('Every requirement must be matched exactly once');
  return value.recommendations.map((r) => {
    if (
      !input.requirements.some((q) => q.id === r.requirementId) ||
      !['potential', 'review', 'missing', 'not_required'].includes(r.status) ||
      !text(r.reason, 2000) ||
      !Array.isArray(r.factIds) ||
      new Set(r.factIds).size !== r.factIds.length ||
      r.factIds.some((id) => !input.facts.some((f) => f.id === id)) ||
      (['missing', 'not_required'].includes(r.status) && r.factIds.length) ||
      (['potential', 'review'].includes(r.status) && !r.factIds.length)
    )
      throw new Error('Invalid requirement evidence reference');
    return clone(r);
  });
}
export function mergeMatches(plan, results, facts) {
  return plan.requirements.map((r) => {
    const batches = plan.batches.filter((b) => b.requirements.some((q) => q.id === r.id)),
      matches = results
        .filter((v) => batches.some((b) => b.id === v.batchId))
        .flatMap((v) => v.items.filter((i) => i.requirementId === r.id));
    const factIds = [...new Set(matches.flatMap((v) => v.factIds))],
      candidates = factIds.map((id) => facts.find((f) => f.id === id)).filter(Boolean);
    const pending = matches.length !== batches.length;
    const status = pending
      ? 'pending'
      : matches.every((m) => m.status === 'not_required')
        ? 'not_required'
        : !candidates.length
          ? matches.some((m) => m.status === 'not_required')
            ? 'review'
            : 'missing'
          : matches.some(
                (m) =>
                  m.status === 'potential' &&
                  m.factIds.some((id) =>
                    candidates.some(
                      (f) =>
                        f.id === id &&
                        !(f.flags || []).length &&
                        f.decision?.action === 'adopt' &&
                        !f.decision.value,
                    ),
                  ),
              )
            ? 'available'
            : 'review';
    return { requirement: r, status, factIds, reasons: [...new Set(matches.map((v) => v.reason))] };
  });
}
export class EvidenceSession {
  constructor(bridge) {
    this.bridge = bridge;
    this.extract = new BackgroundRequest(bridge, 'bid_evidence_extraction');
    this.match = new BackgroundRequest(bridge, 'bid_evidence_matching');
    this.decisions = {};
    this.decisionRevision = 0;
    this.facts = [];
    this.results = [];
    this.errors = [];
    this.cache = new Map();
    this.selection = { revision: 0, items: [] };
    this.matrix = new Requirements(bridge);
  }
  async doc(id) {
    const r = await this.bridge.request('GET', '/documents/' + id);
    if (!r.ok && r.status === 404) return null;
    return checked(r);
  }
  async load() {
    this.selection = checked(await this.bridge.request('GET', '/library-selection'));
    await this.matrix.load();
    const decisions = await this.doc('bid_evidence_decisions');
    this.decisionRevision = decisions?.revision || 0;
    this.decisions = decisions ? JSON.parse(decisions.markdown) : {};
    for (const [key, request] of [
      ['extractPlan', this.extract],
      ['matchPlan', this.match],
    ]) {
      await request.load();
      if (request.value) {
        const ref = request.value.spec.sources.find((s) =>
          s.id.startsWith('bid_evidence_manifest_'),
        );
        if (!ref) throw new Error('Missing evidence manifest');
        const d = await this.doc(ref.id);
        if (d?.revision !== ref.revision) throw new Error('Evidence manifest changed');
        this[key] = JSON.parse(d.markdown);
      }
    }
    return this.sync();
  }
  async sync() {
    this.errors = [];
    this.facts = [];
    this.results = [];
    for (const [plan, request, parser, target] of [
      [this.extractPlan, this.extract, parseFacts, 'facts'],
      [this.matchPlan, this.match, parseMatches, 'results'],
    ]) {
      if (!plan) continue;
      await request.sync();
      for (const step of request.job.steps) {
        if (step.state !== 'done') continue;
        const batch = plan.batches.find((b) => b.id === step.id);
        const key = step.resultDocument;
        let parsed = this.cache.get(key);
        if (!parsed) {
          try {
            const raw = await request.result(step);
            if (!raw?.verified) throw new Error('Model result is not verified');
            parsed = {
              items: parser(
                raw.content.requirement_analysis,
                target === 'facts' ? extractContext(plan, batch) : matchContext(plan, batch),
              ),
            };
          } catch (e) {
            parsed = { error: e.message };
          }
          this.cache.set(key, parsed);
        }
        if (parsed.error)
          this.errors.push({ phase: target, batchId: step.id, message: parsed.error });
        else if (target === 'facts') this.facts.push(...parsed.items);
        else this.results.push({ batchId: step.id, items: parsed.items });
      }
    }
    this.facts = factFlags(this.facts).map((f) => ({
      ...f,
      decision: this.decisions[f.id] || null,
      ...(this.decisions[f.id]?.value
        ? { effectiveValue: this.decisions[f.id].value, flags: [...f.flags, 'operator-supplement'] }
        : {}),
      ...(this.decisions[f.id]?.action === 'exclude' ? { flags: [...f.flags, 'excluded'] } : {}),
    }));
    this.extractStale =
      !!this.extractPlan &&
      this.extractPlan.inputDigest !== (await digest(refs(this.selection.items)));
    this.matchStale =
      !!this.matchPlan &&
      (this.extractStale ||
        this.matchPlan.binding.extraction !== this.extractPlan?.runId ||
        this.matchPlan.binding.decisions !== this.decisionRevision ||
        this.matchPlan.binding.requirements !== this.matrix.revision ||
        this.matchPlan.asOf !== today());
    return this;
  }
  get complete() {
    return (
      this.extract.job?.state === 'completed' &&
      !this.errors.some((e) => e.phase === 'facts') &&
      !this.extractStale
    );
  }
  get recommendations() {
    return this.matchPlan ? mergeMatches(this.matchPlan, this.results, this.facts) : [];
  }
  async submit(plan, request, taskId, contextId, sourceRefs = []) {
    if (!terminal(request.job))
      throw new Error(
        '\u540e\u53f0\u4efb\u52a1\u4ecd\u5728\u6267\u884c\uff0c\u8bf7\u7ee7\u7eed\u539f\u4efb\u52a1',
      );
    const id = 'bid_evidence_manifest_' + plan.runId,
      doc = checked(
        await this.bridge.request('PUT', '/documents/' + id, {
          markdown: JSON.stringify(plan),
          revision: 0,
        }),
      );
    if (request.value)
      checked(
        await this.bridge.request('PUT', '/documents/bid_evidence_archive_' + crypto.randomUUID(), {
          markdown: JSON.stringify(request.value),
          revision: 0,
        }),
      );
    return request.start({
      id: plan.runId,
      label:
        taskId === 'extract_enterprise_facts'
          ? '\u4f01\u4e1a\u8d44\u6599\u667a\u80fd\u6574\u7406'
          : '\u62db\u6807\u9700\u6c42\u8bc1\u636e\u5339\u914d',
      sources: [{ id, revision: doc.revision }, ...sourceRefs],
      steps: plan.batches.map((b) => ({
        id: b.id,
        taskId,
        context: {
          id: contextId,
          markdown: JSON.stringify(
            taskId === 'extract_enterprise_facts' ? extractContext(plan, b) : matchContext(plan, b),
          ),
        },
      })),
    });
  }
  async startExtraction() {
    await this.load();
    if (!terminal(this.match.job))
      throw new Error(
        '\u8bf7\u5148\u5b8c\u6210\u6216\u53d6\u6d88\u5f53\u524d\u5339\u914d\u4efb\u52a1',
      );
    if (this.complete) return this.extract.job;
    const units = new Map();
    for (const source of this.selection.items) {
      const reading = checked(await this.bridge.request('GET', '/readings/' + source.readingId));
      if (
        reading.state !== 'completed' ||
        reading.fileId !== source.fileId ||
        reading.hash !== source.hash
      )
        throw new Error('Selected source snapshot unavailable');
      const blocks = [];
      for (let index = 0; index < reading.units; index++)
        blocks.push(
          checked(
            await this.bridge.request('GET', '/readings/' + source.readingId + '/units/' + index),
          ),
        );
      units.set(source.readingId, blocks);
    }
    const plan = await extractionPlan(this.selection.items, units);
    await this.submit(plan, this.extract, 'extract_enterprise_facts', 'enterprise_fact_snapshot');
    this.extractPlan = plan;
    return this.extract.job;
  }
  async startMatching() {
    await this.load();
    if (!this.complete)
      throw new Error(
        '\u8bf7\u5148\u5b8c\u6210\u5f53\u524d\u9009\u7528\u8d44\u6599\u7684\u667a\u80fd\u6574\u7406',
      );
    if (
      this.match.job?.state === 'completed' &&
      !this.matchStale &&
      !this.errors.some((e) => e.phase === 'results')
    )
      return this.match.job;
    const facts = this.facts.filter((f) => f.decision?.action !== 'exclude'),
      binding = {
        extraction: this.extractPlan.runId,
        requirements: this.matrix.revision,
        decisions: this.decisionRevision,
      };
    const plan = await matchingPlan(this.matrix.rows, facts, binding);
    await this.submit(plan, this.match, 'match_enterprise_evidence', 'enterprise_match_snapshot', [
      { id: 'bid_requirements', revision: this.matrix.revision },
      { id: 'bid_evidence_decisions', revision: this.decisionRevision },
    ]);
    this.matchPlan = plan;
    return this.match.job;
  }
  async decide(ids, { action, note = '', value = '' } = {}) {
    await this.load();
    if (this.extractStale || !this.complete || !terminal(this.match.job))
      throw new Error(
        '\u8d44\u6599\u5df2\u66f4\u65b0\u6216\u4efb\u52a1\u8fd0\u884c\u4e2d\uff0c\u8bf7\u5148\u6838\u5bf9',
      );
    if (
      !Array.isArray(ids) ||
      !ids.length ||
      new Set(ids).size !== ids.length ||
      !['adopt', 'exclude'].includes(action) ||
      typeof note !== 'string' ||
      note.length > 1600 ||
      typeof value !== 'string' ||
      value.length > 1500
    )
      throw new Error('Invalid evidence decision');
    const next = clone(this.decisions);
    for (const id of ids) {
      const f = this.facts.find((f) => f.id === id);
      if (!f) throw new Error('Unknown evidence fact');
      if ((f.flags.length || value) && !note.trim())
        throw new Error(
          '\u5f02\u5e38\u4e8b\u5b9e\u6216\u4eba\u5de5\u4fee\u8ba2\u9700\u8bb0\u5f55\u5904\u7406\u8bf4\u660e',
        );
      const old = next[id],
        entry = { action, note: note.trim(), value: value.trim(), at: new Date().toISOString() };
      next[id] = {
        ...entry,
        history: [
          ...(old?.history || []),
          ...(old ? [{ action: old.action, note: old.note, value: old.value, at: old.at }] : []),
        ],
      };
    }
    if (bytes(next) > 850000)
      throw new Error('Evidence decision history exceeds the storage budget');
    const doc = checked(
      await this.bridge.request('PUT', '/documents/bid_evidence_decisions', {
        markdown: JSON.stringify(next),
        revision: this.decisionRevision,
      }),
    );
    this.decisions = next;
    this.decisionRevision = doc.revision;
    return this.sync();
  }
  async retryInvalid(phase) {
    const request = phase === 'facts' ? this.extract : this.match;
    await this.load();
    const bad = this.errors.filter((e) => e.phase === phase).map((e) => e.batchId);
    if (!bad.length) {
      await request.control('retry');
      return this.sync();
    }
    // A new run archives the immutable old job instead of modifying its results.
    throw new Error(
      '\u7ed3\u679c\u672a\u901a\u8fc7\u6765\u6e90\u6821\u9a8c\uff0c\u8bf7\u7f29\u5c0f\u9009\u7528\u8d44\u6599\u5e76\u91cd\u65b0\u6574\u7406\uff1b\u539f\u7ed3\u679c\u5df2\u4fdd\u7559',
    );
  }
}
