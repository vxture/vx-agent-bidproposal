/**
 * @package @bidproposal/workbench
 * @layer Presentation
 * @category Tests
 * @author AI-Generated
 * @date 2026-11-25
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildTenderBatches,
  batchContext,
  parseBatchResult,
  BatchAnalysisSession,
} from './batch-analysis.mjs';
const reading = {
  id: 'reading',
  fileId: 'file',
  hash: 'a'.repeat(64),
  state: 'completed',
  units: 2,
  name: 'synthetic.md',
};
const units = [
  {
    index: 0,
    text: 'Bid value 12.34 and >=5 \u4e2d\u6587\r\n'.repeat(500),
    location: { page: 1 },
    flags: ['images-not-transcribed'],
    tables: [
      {
        rows: [
          ['metric', null, 'value'],
          ['latency', '<=', '5ms'],
        ],
      },
    ],
  },
  {
    index: 1,
    text: '',
    location: { page: 2 },
    flags: ['sparse-text-needs-review'],
    tables: [{ rows: [['Long', '\u4e2d\u6587'.repeat(6000), null]] }],
  },
];
test('bounded Unicode batches preserve every exact text offset, row/cell and empty flagged unit', () => {
  const plan = buildTenderBatches(units, reading, { runId: 'fixed' }),
    all = plan.batches.flatMap((b) => b.segments);
  assert.ok(plan.batches.length > 2);
  for (const b of plan.batches)
    assert.ok(Buffer.byteLength(JSON.stringify(batchContext(plan, b))) <= 24000);
  for (const u of units) {
    const text = all.filter((s) => s.unit === u.index && s.kind === 'text');
    assert.equal(text.map((s) => s.text).join(''), u.text);
    for (const s of text) assert.equal(u.text.slice(s.start, s.end), s.text);
  }
  assert.deepEqual(all.find((s) => s.kind === 'table-row').cells, units[0].tables[0].rows[0]);
  assert.equal(
    all
      .filter((s) => s.kind === 'table-cell' && s.column === 1)
      .map((s) => s.text)
      .join(''),
    units[1].tables[0].rows[0][1],
  );
  assert.equal(all.find((s) => s.kind === 'table-cell' && s.column === 2).merged, true);
  assert.ok(all.some((s) => s.unit === 1 && s.text === '' && s.flags.length));
  assert.deepEqual(buildTenderBatches(units, reading, { runId: 'fixed' }), plan);
  assert.throws(() => buildTenderBatches(units.slice(0, 1), reading));
  assert.throws(() =>
    buildTenderBatches(
      Array.from({ length: 81 }, (_, i) => ({ index: i, text: 'x'.repeat(24000) })),
      { ...reading, units: 81 },
    ),
  );
});
test('empty extraction is valid; stale IDs, missing coverage, unknown sources and malformed results fail', () => {
  const expected = batchContext(
    buildTenderBatches(units, reading, { runId: 'fixed' }),
    buildTenderBatches(units, reading, { runId: 'fixed' }).batches[0],
  );
  const valid = {
    ...expected,
    processedSegmentIds: expected.segments.map((s) => s.id),
    requirements: [],
    issues: [],
  };
  delete valid.segments;
  assert.deepEqual(parseBatchResult(JSON.stringify(valid), expected), {
    requirements: [],
    issues: [],
  });
  for (const patch of [
    { sourceHash: 'wrong' },
    { processedSegmentIds: [] },
    { processedSegmentIds: [...valid.processedSegmentIds, valid.processedSegmentIds[0]] },
    {
      requirements: [{ category: 'technical', text: 'text', quote: 'quote', segmentId: 'foreign' }],
    },
    { issues: [{ segmentId: 'foreign', detail: 'wrong' }] },
  ])
    assert.throws(() => parseBatchResult(JSON.stringify({ ...valid, ...patch }), expected));
});
function bridgeRig() {
  const docs = new Map(),
    jobs = new Map();
  let lose = false,
    posted = [];
  const bridge = {
    request: async (method, path, body) => {
      if (path === '/jobs' && method === 'GET')
        return { ok: true, body: { items: [...jobs.values()] } };
      if (path === '/jobs' && method === 'POST') {
        posted.push(body);
        let job = jobs.get(body.id);
        if (!job) {
          job = {
            ...body,
            createdAt: new Date().toISOString(),
            state: 'running',
            steps: body.steps.map((s) => ({ ...s, state: 'pending' })),
          };
          jobs.set(body.id, job);
        }
        if (lose) {
          lose = false;
          throw new Error('Lost response');
        }
        return { ok: true, body: job };
      }
      if (path.startsWith('/jobs/')) {
        const job = jobs.get(path.split('/')[2]);
        return job ? { ok: true, body: job } : { ok: false, status: 404 };
      }
      const id = path.split('/').pop();
      if (method === 'PUT') {
        const old = docs.get(id);
        if ((old?.revision || 0) !== body.revision) return { ok: false, status: 409 };
        const doc = { ...body, id, revision: body.revision + 1 };
        docs.set(id, doc);
        return { ok: true, body: doc };
      }
      const doc = docs.get(id);
      return doc ? { ok: true, body: doc } : { ok: false, status: 404 };
    },
  };
  return { bridge, docs, jobs, posted, loseNext: () => (lose = true) };
}
test('lost job POST response reopens the same durable job without duplicate task requests', async () => {
  const r = bridgeRig(),
    s = new BatchAnalysisSession(r.bridge);
  r.loseNext();
  await assert.rejects(s.start(reading, units), /Lost/);
  const reopened = new BatchAnalysisSession(r.bridge);
  await reopened.load(reading.id);
  assert.equal(r.jobs.size, 1);
  assert.equal(reopened.plan.readingId, reading.id);
  assert.equal(reopened.job.id, s.plan.runId);
});
test('only invalid result batches are resubmitted and prior successful candidates survive', async () => {
  const r = bridgeRig(),
    s = new BatchAnalysisSession(r.bridge);
  await s.start(reading, units);
  const original = s.job;
  for (const step of original.steps) {
    step.state = 'done';
    step.resultDocument = 'result-' + step.id;
    const b = s.plan.batches.find((b) => b.id === step.id);
    r.docs.set(step.resultDocument, {
      markdown: JSON.stringify({
        verified: true,
        content: {
          requirement_analysis: JSON.stringify({
            runId: s.plan.runId,
            readingId: reading.id,
            sourceHash: reading.hash,
            batchId: step.id,
            processedSegmentIds: b.segments.map((s) => s.id),
            requirements: [],
            issues: [],
          }),
        },
      }),
    });
  }
  original.state = 'completed';
  const invalid = original.steps[1];
  r.docs.set(invalid.resultDocument, {
    markdown: JSON.stringify({ verified: true, content: { requirement_analysis: 'invalid' } }),
  });
  assert.equal((await s.results()).filter((r) => r.error).length, 1);
  await s.retryInvalid();
  assert.equal(s.job.steps.length, 1);
  assert.equal(s.job.steps[0].id, invalid.id);
  assert.equal((await s.results()).length, original.steps.length);
});
