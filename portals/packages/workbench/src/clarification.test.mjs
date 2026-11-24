/**
 * @package @bidproposal/workbench
 * @layer Presentation
 * @category Tests
 * @author AI-Generated
 * @date 2026-11-25
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { buildTenderBatches } from './batch-analysis.mjs';
import { SourceVerification } from './source-verification.mjs';
import {
  ClarificationSession,
  clarificationItems,
  buildClarifications,
  clarificationContext,
  parseClarifications,
} from './clarification.mjs';
const text =
  'The scope says nine entrances but lists eight names.\nHumidity parameter is (953), without a unit.';
const unit = { index: 0, text, location: { page: 1 }, flags: [], tables: [] },
  reading = {
    id: 'reading',
    fileId: 'file',
    hash: 'a'.repeat(64),
    name: 'synthetic.pdf',
    units: 1,
    state: 'completed',
  },
  analysis = buildTenderBatches([unit], reading, { runId: 'analysis' }),
  segment = analysis.batches[0].segments[0],
  segments = new Map([[segment.id, segment]]);
const row = (i) => ({
  id: 'issue-' + i,
  category: 'technical',
  text: 'Clarify quantity ' + i,
  quote: text,
  segmentId: segment.id,
  unit: 0,
  location: unit.location,
  status: 'clarification',
  decision: { note: 'Contradictory quantity needs a decision', at: '2026-11-20' },
  check: { ok: true, references: [] },
});
const reply = (input) => ({
  ...input,
  items: input.items.map((i) => ({
    id: i.id,
    title: 'Clarify original quantity',
    impact: 'Scope and price may vary.',
    question: 'Please confirm the complete scope and quantity.',
    inquiryDraft: 'We intend to bid. Please confirm the final quantity and full list in writing.',
    reason: 'Avoid assuming which number is authoritative.',
    attention: 'normal',
    attentionReason: '',
    requestedClarifications: ['Issuer must confirm the quantity and complete names.'],
  })),
});
function rig() {
  const docs = new Map([
      ['bid_analysis_manifest_analysis', { markdown: JSON.stringify(analysis), revision: 1 }],
    ]),
    jobs = new Map();
  let lost = false,
    files = [{ id: reading.fileId, hash: reading.hash, name: reading.name }],
    posts = 0;
  const bridge = {
    request: async (method, path, body) => {
      if (path === '/files') return { ok: true, body: { items: files } };
      if (path === '/readings') return { ok: true, body: { items: [reading] } };
      if (path.includes('/units/')) return { ok: true, body: unit };
      if (path === '/jobs' && method === 'POST') {
        posts++;
        if (!jobs.has(body.id))
          jobs.set(body.id, {
            ...structuredClone(body),
            state: 'running',
            steps: body.steps.map((s) => ({ ...s, state: 'pending' })),
          });
        if (lost) {
          lost = false;
          throw new Error('Lost submission response');
        }
        return { ok: true, body: structuredClone(jobs.get(body.id)) };
      }
      if (path.startsWith('/jobs/')) {
        const job = jobs.get(path.split('/')[2]);
        if (method === 'POST' && path.endsWith('/control')) {
          assert.equal(body.action, 'retry');
          job.state = 'running';
          for (const s of job.steps) if (s.state === 'error') s.state = 'pending';
        }
        return job ? { ok: true, body: structuredClone(job) } : { ok: false, status: 404 };
      }
      const id = path.split('/').at(-1),
        old = docs.get(id);
      if (method === 'GET')
        return old ? { ok: true, body: structuredClone(old) } : { ok: false, status: 404 };
      if ((old?.revision || 0) !== body.revision) return { ok: false, status: 409 };
      const doc = { id, markdown: body.markdown, revision: body.revision + 1 };
      docs.set(id, doc);
      return { ok: true, body: structuredClone(doc) };
    },
  };
  const finish = (job, index) => {
    const step = job.steps[index],
      input = JSON.parse(step.context.markdown);
    step.state = 'done';
    step.resultDocument = 'result-' + job.id + '-' + step.id;
    docs.set(step.resultDocument, {
      revision: 1,
      markdown: JSON.stringify({
        verified: true,
        content: {
          requirement_analysis: JSON.stringify(
            step.taskId === 'verify_tender_sources'
              ? {
                  ...input,
                  reviews: input.candidates.map((c) => ({
                    id: c.id,
                    support: 'needs_review',
                    scope: 'target',
                    reason: 'The original source is ambiguous.',
                    conflicts: [],
                  })),
                }
              : reply(input),
          ),
        },
      }),
    });
    if (job.steps.every((s) => s.state === 'done')) job.state = 'completed';
  };
  return {
    bridge,
    docs,
    jobs,
    finish,
    lose() {
      lost = true;
    },
    setFiles(value) {
      files = value;
    },
    get posts() {
      return posts;
    },
  };
}
async function verified(r, count = 2) {
  const requirements = Array.from({ length: count }, (_, i) => ({
      category: 'technical',
      text: 'Ambiguous clause ' + i,
      quote: text,
      segmentId: segment.id,
      unit: 0,
      location: unit.location,
    })),
    results = [
      { batchId: 'batch-1', requirements, issues: [], step: { resultDocument: 'extracted' } },
    ],
    v = new SourceVerification(r.bridge, reading.id);
  await v.prepare(analysis, results);
  await v.start('Synthetic lot', { id: 'bid_analysis_manifest_analysis', revision: 1 });
  const job = r.jobs.get(v.request.job.id);
  for (let i = 0; i < job.steps.length; i++) r.finish(job, i);
  await v.load();
  return v;
}
test('99 issues split by byte and output budgets without count constants, lost IDs or evidence', async () => {
  const rows = Array.from({ length: 99 }, (_, i) => row(i));
  rows[3].check.references = [
    {
      segmentId: 'supplement',
      unit: 0,
      location: { page: 2 },
      quote: 'Additional exact evidence',
      match: { kind: 'text' },
    },
  ];
  const plan = await buildClarifications(analysis, rows, segments, 'Synthetic lot');
  assert.equal(plan.batches.length, 13);
  assert.deepEqual(
    plan.batches.flatMap((b) => b.items.map((i) => i.id)),
    rows.map((r) => r.id),
  );
  for (const b of plan.batches) {
    assert.ok(b.items.length <= 8);
    assert.ok(Buffer.byteLength(JSON.stringify(clarificationContext(plan, b))) <= 28000);
  }
  assert.equal(plan.batches[0].items[3].evidence.length, 2);
  assert.equal(
    clarificationItems(
      [{ ...row(1), status: 'source-error', check: { ok: false } }, row(2)],
      segments,
    ).length,
    1,
  );
  const huge = [{ ...row(0), text: 'x'.repeat(50000) }];
  await assert.rejects(
    buildClarifications(analysis, huge, segments, 'Synthetic lot', { budget: 8000 }),
    /\u672a\u622a\u65ad/,
  );
});
test('parser requires the exact source/version and every issue once; evidence comes only from saved inputs', async () => {
  const plan = await buildClarifications(analysis, [row(0), row(1)], segments, 'Synthetic lot'),
    input = clarificationContext(plan, plan.batches[0]),
    value = reply(input);
  const parsed = parseClarifications(JSON.stringify(value), input);
  assert.deepEqual(parsed[0].evidence, input.items[0].evidence);
  assert.equal(parsed[0].status, 'draft');
  for (const key of [
    'perspective',
    'requestId',
    'inputDigest',
    'readingId',
    'sourceHash',
    'batchId',
  ])
    assert.throws(() => parseClarifications(JSON.stringify({ ...value, [key]: 'foreign' }), input));
  assert.throws(() =>
    parseClarifications(
      JSON.stringify({ ...value, items: [value.items[0], value.items[0]] }),
      input,
    ),
  );
  assert.throws(() =>
    parseClarifications(JSON.stringify({ ...value, items: value.items.slice(1) }), input),
  );
  assert.throws(() =>
    parseClarifications(
      JSON.stringify({ ...value, items: [{ ...value.items[0], id: 'foreign' }, value.items[1]] }),
      input,
    ),
  );
  assert.throws(() =>
    parseClarifications(
      JSON.stringify({
        ...value,
        items: [{ ...value.items[0], inquiryDraft: '' }, value.items[1]],
      }),
      input,
    ),
  );
});
test('lost submission reopens the same durable job; saved bidder inquiries do not resolve or alter requirements', async () => {
  const r = rig(),
    v = await verified(r),
    before = new Map([...r.docs].map(([id, d]) => [id, JSON.stringify(d)])),
    s = new ClarificationSession(r.bridge, reading.id);
  r.lose();
  await assert.rejects(s.start(v, await v.ready()), /Lost/);
  const id = s.request.value.spec.id,
    posts = r.posts;
  const reopened = await new ClarificationSession(r.bridge, reading.id).load();
  assert.equal(reopened.request.job.id, id);
  assert.equal(r.posts, posts);
  const job = r.jobs.get(id);
  for (let i = 0; i < job.steps.length; i++) r.finish(job, i);
  await reopened.sync();
  await reopened.check(v, await v.ready());
  assert.equal(reopened.items.length, 2);
  assert.ok(reopened.markdown().includes('\u6295\u6807\u65b9'));
  assert.ok(reopened.markdown().includes('Please confirm'));
  assert.ok((await v.ready()).every((r) => r.status === 'review'));
  for (const [id, value] of before) assert.equal(JSON.stringify(r.docs.get(id)), value);
  assert.ok(!r.docs.has('bid_requirements'));
  await reopened.start(v, await v.ready());
  assert.equal(r.posts, posts);
});
test('changed issue decisions or removed files make earlier inquiry drafts historical and prevent current-list export', async () => {
  const r = rig(),
    v = await verified(r),
    s = new ClarificationSession(r.bridge, reading.id);
  await s.start(v, await v.ready());
  r.finish(r.jobs.get(s.request.job.id), 0);
  await s.sync();
  await s.check(v, await v.ready());
  assert.equal(s.stale, false);
  const c = v.candidates[0];
  await v.decide(c.id, {
    text: c.text,
    quote: c.quote,
    scope: 'target',
    note: 'A new issuer clarification is pending',
    disposition: 'clarification',
  });
  await s.check(v, await v.ready());
  assert.equal(s.stale, true);
  assert.throws(() => s.markdown());
  assert.equal(s.items.length, 2);
  r.setFiles([]);
  await assert.rejects(s.start(v, await v.ready()));
});
test('failure retry retains successful batches and reopens their exact results', async () => {
  const r = rig(),
    v = await verified(r, 9),
    s = new ClarificationSession(r.bridge, reading.id);
  await s.start(v, await v.ready());
  const job = r.jobs.get(s.request.job.id);
  assert.equal(job.steps.length, 2);
  r.finish(job, 0);
  const first = job.steps[0].resultDocument,
    saved = structuredClone(r.docs.get(first));
  job.steps[1].state = 'error';
  job.state = 'error';
  await s.sync();
  assert.equal(s.items.length, 8);
  await s.control('retry');
  assert.equal(job.steps[0].state, 'done');
  assert.equal(job.steps[0].resultDocument, first);
  r.finish(job, 1);
  const reopened = await new ClarificationSession(r.bridge, reading.id).load();
  assert.equal(reopened.items.length, 9);
  assert.deepEqual(r.docs.get(first), saved);
});
