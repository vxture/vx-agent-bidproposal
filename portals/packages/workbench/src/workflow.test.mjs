/**
 * @package @bidproposal/workbench
 * @layer Presentation
 * @category Tests
 * @author AI-Generated
 * @date 2026-11-25
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { WorkflowRecords } from './workflow.mjs';
test('historic state is projected without inventing timestamps or writing on page view', async () => {
  const requests = [];
  let items;
  const bridge = {
    request: async (method, path) => {
      requests.push([method, path]);
      return { ok: false, status: 404 };
    },
  };
  const w = new WorkflowRecords(bridge, (v) => (items = v));
  await w.load();
  w.matrix({ rows: [{ origin: 'ai', confirmed: true }], revision: 2, dirty: false });
  w.draft({ chapters: [{}] });
  assert.equal(items[0].state, 'complete');
  assert.equal(items[1].state, 'complete');
  assert.equal(items[3].state, 'active');
  assert.equal(items[0].startedAt, undefined);
  assert.equal(items[1].completedAt, undefined);
  assert.equal(items[2].state, 'pending');
  assert.equal(items[4].state, 'pending');
  assert.equal(requests.length, 1);
});
test('new work records actual milestones and restores them after reopen', async () => {
  let doc, items;
  let now = '2026-11-19T01:00:00.000Z';
  const bridge = {
    request: async (method, path, body) => {
      if (method === 'GET') return doc ? { ok: true, body: doc } : { ok: false, status: 404 };
      assert.equal(path, '/documents/bid_workflow');
      assert.equal(body.revision, doc?.revision ?? 0);
      doc = { markdown: body.markdown, revision: body.revision + 1 };
      return { ok: true, body: doc };
    },
  };
  const w = new WorkflowRecords(
    bridge,
    (v) => (items = v),
    () => now,
  );
  await w.load();
  w.matrix({ rows: [], revision: 0, dirty: false });
  w.matrix({ rows: [{}], revision: 0, dirty: true });
  await w.queue;
  now = '2026-11-19T01:05:00.000Z';
  w.matrix({ rows: [{ origin: 'manual', confirmed: true }], revision: 1, dirty: false });
  await w.queue;
  assert.equal(items[1].startedAt, '2026-11-19T01:00:00.000Z');
  assert.equal(items[1].completedAt, now);
  const reopened = new WorkflowRecords(bridge, (v) => (items = v));
  await reopened.load();
  reopened.matrix({ rows: [{ confirmed: true }], revision: 1, dirty: false });
  assert.equal(items[1].completedAt, now);
  assert.equal(doc.revision, 2);
});
test('a conflict does not claim a timestamp was saved', async () => {
  let failure, items;
  const bridge = {
    request: async (method) =>
      method === 'GET'
        ? { ok: false, status: 404 }
        : { ok: false, status: 409, error: { message: 'Conflict' } },
  };
  const w = new WorkflowRecords(
    bridge,
    (v) => (items = v),
    undefined,
    (e) => (failure = e),
  );
  await w.load();
  await w.mark('chapters');
  assert.equal(failure.status, 409);
  assert.equal(w.revision, 0);
  assert.equal(items[3].startedAt, undefined);
});
