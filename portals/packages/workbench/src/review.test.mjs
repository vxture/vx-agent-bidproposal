/**
 * @package @bidproposal/workbench
 * @layer Presentation
 * @category Tests
 * @author AI-Generated
 * @date 2026-11-25
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { parseReview } from './review.mjs';
import { autoSave } from './autosave.mjs';
import { BackgroundRequest } from './background.mjs';
test('review enforces exact source identity, complete coverage and verbatim chapter evidence', () => {
  const expected = {
    requestId: 'r',
    chapterId: 'c',
    draftRevision: 2,
    planRevision: 3,
    requirementsRevision: 4,
    requirementIds: ['a'],
    markdown: 'The response is 20 minutes. Evidence is pending.',
  };
  const valid = {
    ...expected,
    summary: 'Check response time',
    coverage: [{ requirementId: 'a', status: 'partial', quote: 'response is 20 minutes' }],
    findings: [
      {
        severity: 'blocker',
        category: 'metric',
        title: 'Wrong threshold',
        detail: 'The response differs from the source',
        quote: '20 minutes',
        requirementIds: ['a'],
        suggestion: 'Use the exact 15-minute threshold',
      },
    ],
  };
  assert.equal(parseReview(JSON.stringify(valid), expected).findings.length, 1);
  for (const patch of [
    { draftRevision: 9 },
    { coverage: [] },
    { coverage: [{ requirementId: 'a', status: 'covered', quote: 'invented evidence' }] },
    { findings: [{ ...valid.findings[0], quote: 'fabricated' }] },
    { findings: [{ ...valid.findings[0], requirementIds: ['foreign'] }] },
  ])
    assert.throws(() => parseReview(JSON.stringify({ ...valid, ...patch }), expected));
});
test('autosave serializes edits arriving during writes, and conflicts remain visible', async () => {
  let value = 'first',
    release;
  const written = [],
    states = [];
  const save = autoSave(
    async () => {
      const snapshot = value;
      await new Promise((r) => (release = r));
      written.push(snapshot);
    },
    { delay: 10000, onState: (s) => states.push(s) },
  );
  save.change();
  const flushing = save.flush();
  await new Promise((r) => setImmediate(r));
  value = 'second';
  save.change();
  release();
  await new Promise((r) => setImmediate(r));
  release();
  await flushing;
  await save.flush();
  assert.deepEqual(written, ['first', 'second']);
  assert.equal(save.pending, false);
  const conflict = autoSave(
    async () => {
      throw new Error('revision conflict');
    },
    { delay: 10000 },
  );
  conflict.change();
  await assert.rejects(conflict.flush(), /conflict/);
  await assert.rejects(conflict.flush(), /conflict/);
  assert.equal(conflict.pending, true);
  assert.ok(states.includes('saved'));
});
test('lost background submission response reopens the durable request with the same ID', async () => {
  const docs = new Map(),
    jobs = new Map();
  let posts = 0,
    lose = true;
  const bridge = {
    request: async (method, path, body) => {
      if (path.startsWith('/documents/')) {
        if (method === 'GET')
          return docs.has(path) ? { ok: true, body: docs.get(path) } : { ok: false, status: 404 };
        const r = { markdown: body.markdown, revision: body.revision + 1 };
        docs.set(path, r);
        return { ok: true, body: r };
      }
      if (method === 'GET')
        return jobs.has(path) ? { ok: true, body: jobs.get(path) } : { ok: false, status: 404 };
      posts++;
      const job = { ...body, state: 'running' };
      jobs.set('/jobs/' + body.id, job);
      if (lose) {
        lose = false;
        throw new Error('lost response');
      }
      return { ok: true, body: job };
    },
  };
  const first = new BackgroundRequest(bridge, 'request');
  await assert.rejects(first.start({ id: 'same', steps: [] }), /lost/);
  const reopened = new BackgroundRequest(bridge, 'request');
  await reopened.load();
  assert.equal((await reopened.sync()).id, 'same');
  assert.equal(posts, 1);
});
