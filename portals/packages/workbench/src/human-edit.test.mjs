/**
 * @package @bidproposal/workbench
 * @layer Presentation
 * @category Tests
 * @author AI-Generated
 * @date 2026-11-26
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { WritingSession } from './writing.mjs';
import { DraftSession } from './draft.mjs';

async function fixture() {
  const docs = new Map();
  let conflict = false;
  const bridge = { async request(method, path, body) {
    const old = docs.get(path);
    if (method === 'GET') return old ? { ok: true, body: structuredClone(old) } : { ok: false, status: 404 };
    if (path === '/documents/bid_draft' && conflict) { conflict = false; return { ok: false, status: 409 }; }
    if ((old?.revision || 0) !== body.revision) return { ok: false, status: 409 };
    const next = { markdown: body.markdown, revision: body.revision + 1 };
    docs.set(path, next);
    return { ok: true, body: next };
  } };
  const draft = new DraftSession(bridge);
  const a = draft.add('First chapter'), b = draft.add('Second chapter');
  a.body = 'Original first chapter'; b.body = 'Original second chapter';
  await draft.save();
  const run = new WritingSession(bridge);
  run.value = { version: 1, planRevision: 1, requirementsRevision: 1,
    items: [a, b].map((c) => ({ id: c.id, title: c.title, state: 'done', history: [] })) };
  await run.save();
  run.sources = async () => { run.draft = new DraftSession(bridge); await run.draft.load(); };
  return { run, draft, docs, a, b, conflict: () => { conflict = true; } };
}

test('human revision preserves prior body and concurrent unrelated chapters', async () => {
  const f = await fixture();
  f.b.body = 'Other window updated chapter two'; await f.draft.save();
  const before = f.draft.revision;
  await f.run.saveHumanChapter(f.a.id, f.a.body, 'Human revised first chapter');
  assert.equal(f.run.draft.revision, before + 1);
  assert.equal(f.run.draft.chapters[1].body, f.b.body);
  const history = f.run.value.items[0].history;
  assert.equal(history.length, 1);
  const saved = JSON.parse(f.docs.get('/documents/' + history[0]).markdown);
  assert.equal(saved.body, 'Original first chapter');
  assert.equal(saved.reason, 'human_revision');
});

test('same chapter conflict preserves current body and does not archive a false replacement', async () => {
  const f = await fixture(), base = f.a.body;
  f.a.body = 'Someone else changed this chapter'; await f.draft.save();
  await assert.rejects(f.run.saveHumanChapter(f.a.id, base, 'My unsaved changes'), /another window/);
  assert.equal(f.run.draft.chapters[0].body, f.a.body);
  assert.equal(f.run.value.items[0].history.length, 0);
});

test('draft CAS failure can be retried without losing or duplicating original history', async () => {
  const f = await fixture(); f.conflict();
  await assert.rejects(f.run.saveHumanChapter(f.a.id, f.a.body, 'Revised body'), { status: 409 });
  assert.equal(f.run.value.items[0].history.length, 1);
  await f.run.saveHumanChapter(f.a.id, f.a.body, 'Revised body');
  assert.equal(f.run.draft.chapters[0].body, 'Revised body');
  assert.equal(f.run.value.items[0].history.length, 1);
  assert.equal(f.run.value.items[0].humanHistoryId, undefined);
});

test('active AI candidates cannot be silently replaced by a human save', async () => {
  const f = await fixture(); f.run.value.items[0].state = 'candidate'; await f.run.save();
  await assert.rejects(f.run.saveHumanChapter(f.a.id, f.a.body, 'Revised body'), /AI chapter task/);
  assert.equal(f.run.value.items[0].history.length, 0);
});

test('unchanged editor and invalid chapter markers do not write a new draft', async () => {
  const f = await fixture();
  await f.run.saveHumanChapter(f.a.id, f.a.body, f.a.body);
  assert.equal(f.run.draft.revision, 1);
  await assert.rejects(f.run.saveHumanChapter(f.a.id, f.a.body, '<!-- bidproposal:chapter:bad -->'), /Invalid chapter/);
  assert.equal(f.run.value.items[0].history.length, 0);
});
