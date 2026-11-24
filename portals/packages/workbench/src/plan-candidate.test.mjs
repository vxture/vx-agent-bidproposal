/**
 * @package @bidproposal/workbench
 * @layer Presentation
 * @category Tests
 * @author AI-Generated
 * @date 2026-11-25
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { PlanSession } from './plan.mjs';
import { PlanCandidate } from './plan-candidate.mjs';
test('candidate persists independently and only explicit acceptance replaces saved plan', async () => {
  const docs = new Map();
  const bridge = {
    request: async (method, path, body) => {
      const doc = docs.get(path);
      if (method === 'GET') return doc ? { ok: true, body: doc } : { ok: false, status: 404 };
      if ((doc?.revision || 0) !== body.revision) return { ok: false, status: 409 };
      const next = { markdown: body.markdown, revision: (doc?.revision || 0) + 1 };
      docs.set(path, next);
      return { ok: true, body: next };
    },
  };
  const matrix = {
    revision: 1,
    dirty: false,
    rows: [{ id: 'a', text: 'a', category: 'technical', confirmed: true }],
  };
  const p = new PlanSession(bridge);
  await p.load();
  p.build(matrix);
  p.approve(matrix);
  await p.save();
  const before = p.encode();
  const c = new PlanCandidate(bridge);
  await c.load();
  await c.stage(
    JSON.stringify({
      requirementsRevision: 1,
      chapters: [{ title: 'Candidate', requirementIds: ['a'] }],
    }),
    p,
    matrix,
  );
  assert.equal(p.encode(), before);
  const reopened = new PlanCandidate(bridge);
  await reopened.load();
  assert.equal(reopened.preview(p, matrix)[0].title, 'Candidate');
  await reopened.accept(p, matrix);
  assert.equal(p.value.outline[0].title, 'Candidate');
  assert.equal(p.value.approved, false);
  assert.equal(p.dirty, false);
  assert.equal(reopened.value, null);
});

async function fixture() {
  const docs = new Map();
  let failSave = false;
  const bridge = {
    request: async (method, path, body) => {
      const doc = docs.get(path);
      if (method === 'GET') return doc ? { ok: true, body: doc } : { ok: false, status: 404 };
      if (failSave && path === '/documents/bid_plan') return { ok: false, status: 409 };
      if ((doc?.revision || 0) !== body.revision) return { ok: false, status: 409 };
      const next = { markdown: body.markdown, revision: (doc?.revision || 0) + 1 };
      docs.set(path, next);
      return { ok: true, body: next };
    },
  };
  const matrix = {
    revision: 1,
    dirty: false,
    rows: [{ id: 'a', text: 'a', category: 'technical', confirmed: true }],
  };
  const plan = new PlanSession(bridge);
  await plan.load();
  plan.build(matrix);
  plan.approve(matrix);
  await plan.save();
  const candidate = new PlanCandidate(bridge);
  await candidate.load();
  await candidate.stage(
    JSON.stringify({
      requirementsRevision: 1,
      chapters: [{ title: 'Candidate', requirementIds: ['a'] }],
    }),
    plan,
    matrix,
  );
  return {
    bridge,
    matrix,
    plan,
    candidate,
    fail: () => {
      failSave = true;
    },
  };
}
test('candidate cannot overwrite local edits or another window saved revision', async () => {
  const { bridge, matrix, plan, candidate } = await fixture();
  const before = plan.encode();
  plan.change('pages', 90);
  await assert.rejects(candidate.accept(plan, matrix), /local edits/);
  assert.equal(plan.value.pages, 90);
  plan.value.pages = 80;
  plan.value.approved = true;
  assert.equal(plan.encode(), before);
  const other = new PlanSession(bridge);
  await other.load();
  other.change('pages', 100);
  await other.save();
  await assert.rejects(candidate.accept(plan, matrix), /another window/);
  assert.equal(plan.encode(), before);
  assert.ok(candidate.value);
});
test('discard preserves approved plan and save failure restores current outline', async () => {
  const { matrix, plan, candidate, fail } = await fixture();
  const before = plan.encode();
  fail();
  await assert.rejects(candidate.accept(plan, matrix));
  assert.equal(plan.encode(), before);
  assert.equal(plan.dirty, false);
  assert.ok(candidate.value);
  await candidate.put(null);
  assert.equal(plan.encode(), before);
  assert.equal(candidate.value, null);
});
test('changed requirement revision rejects candidate without changing plan', async () => {
  const { matrix, plan, candidate } = await fixture();
  const before = plan.encode();
  matrix.revision = 2;
  await assert.rejects(candidate.accept(plan, matrix), /revision/);
  assert.equal(plan.encode(), before);
  assert.ok(candidate.value);
});
test('malformed saved candidate cannot replace the in-memory candidate', async () => {
  for (const value of [
    { planRevision: -1, content: '{}' },
    { planRevision: 1.5, content: '{}' },
    { planRevision: 1, content: '' },
    { planRevision: 1, content: 'x'.repeat(200001) },
    false,
  ]) {
    const candidate = new PlanCandidate({
      request: async () => ({ ok: true, body: { markdown: JSON.stringify(value), revision: 8 } }),
    });
    candidate.value = { planRevision: 0, content: 'previous' };
    await assert.rejects(candidate.load(), /Invalid saved candidate/);
    assert.equal(candidate.value.content, 'previous');
    assert.equal(candidate.revision, 0);
  }
});
