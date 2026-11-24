/**
 * @package @bidproposal/workbench
 * @layer Presentation
 * @category Tests
 * @author AI-Generated
 * @date 2026-11-25
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { WritingSession, parseChapter } from './writing.mjs';
import { PlanSession } from './plan.mjs';
import { Requirements } from './requirements.mjs';
import { DraftSession } from './draft.mjs';

async function fixture() {
  const docs = new Map(),
    tasks = [];
  let loseResponse = false,
    failDraft = false;
  const bridge = {
    request: async (method, path, body) => {
      if (path === '/tasks' && method === 'GET')
        return { ok: true, body: { items: structuredClone(tasks) } };
      if (path === '/tasks' && method === 'POST') {
        const context = JSON.parse(docs.get('/documents/bid_chapter_context').markdown);
        const task = {
          id: crypto.randomUUID(),
          taskId: 'write_chapter',
          state: 'waiting_human',
          hasResult: false,
          waitingOn: [{ kind: 'context_consent' }],
          context,
        };
        tasks.push(task);
        if (loseResponse) {
          loseResponse = false;
          throw new Error('Simulated lost response');
        }
        return { ok: true, body: task };
      }
      if (path.startsWith('/tasks/')) {
        const task = tasks.find((t) => path === '/tasks/' + t.id + '/result');
        return { ok: true, body: { content: { proposal_generation: task.result } } };
      }
      const doc = docs.get(path);
      if (method === 'GET')
        return doc ? { ok: true, body: structuredClone(doc) } : { ok: false, status: 404 };
      if (path === '/documents/bid_draft' && failDraft) {
        failDraft = false;
        return { ok: false, status: 409 };
      }
      if ((doc?.revision || 0) !== body.revision) return { ok: false, status: 409 };
      const next = { markdown: body.markdown, revision: (doc?.revision || 0) + 1 };
      docs.set(path, next);
      return { ok: true, body: next };
    },
  };
  const matrix = new Requirements(bridge);
  for (const text of ['Daily backup', 'Incident response'])
    matrix.add({ text, quote: text, location: 'Section ' + text });
  matrix.confirm();
  await matrix.save();
  const plan = new PlanSession(bridge);
  await plan.load();
  plan.build(matrix);
  plan.add();
  plan.assign(plan.value.outline[0].id, matrix.rows[1].id, false);
  plan.assign(plan.value.outline[1].id, matrix.rows[1].id, true);
  plan.approve(matrix);
  await plan.save();
  const finish = (
    task,
    body = '## Implementation\n\nA complete synthetic chapter with evidence, responsibilities and verification steps.',
  ) => {
    task.state = 'completed';
    task.hasResult = true;
    task.result = JSON.stringify({
      ...task.context,
      markdown: body,
      summary: 'Synthetic chapter summary',
      materialGaps: ['Company contact name'],
      coveredRequirementIds: task.context.chapter.requirementIds,
      evidenceDigest: task.context.enterpriseEvidence?.digest,
      usedEvidence: [],
    });
  };
  return {
    bridge,
    docs,
    tasks,
    matrix,
    plan,
    finish,
    lose: () => (loseResponse = true),
    conflictDraft: () => (failDraft = true),
  };
}
test('ordered generation persists each chapter, pause stops next scheduling and reopen continues', async () => {
  const f = await fixture(),
    run = new WritingSession(f.bridge);
  await run.load();
  await run.start();
  await run.step();
  assert.equal(f.tasks.length, 1);
  assert.equal(run.value.items[0].state, 'running');
  await run.pause();
  f.finish(f.tasks[0]);
  await run.step();
  assert.equal(run.value.items[0].state, 'done');
  await run.step();
  assert.equal(f.tasks.length, 1);
  const reopened = new WritingSession(f.bridge);
  await reopened.load();
  await reopened.start();
  await reopened.step();
  assert.equal(f.tasks.length, 2);
  assert.equal(f.tasks[1].context.precedingSummaries[0].summary, 'Synthetic chapter summary');
  f.finish(f.tasks[1]);
  await reopened.step();
  assert.equal(reopened.complete, true);
  const draft = new DraftSession(f.bridge);
  await draft.load();
  assert.deepEqual(
    draft.chapters.map((c) => c.id),
    f.plan.value.outline.map((c) => c.id),
  );
  assert.equal(draft.chapters.length, 2);
});
test('lost task response recovers the existing task without submitting a duplicate', async () => {
  const f = await fixture(),
    run = new WritingSession(f.bridge);
  await run.load();
  await run.start();
  f.lose();
  await assert.rejects(run.step(), /lost response/);
  assert.equal(f.tasks.length, 1);
  assert.equal(run.value.items[0].state, 'submitting');
  const reopened = new WritingSession(f.bridge);
  await reopened.load();
  await reopened.step();
  assert.equal(f.tasks.length, 1);
  assert.equal(reopened.value.items[0].taskId, f.tasks[0].id);
  f.finish(f.tasks[0]);
  await reopened.step();
  assert.equal(reopened.value.items[0].state, 'done');
});
test('rewrite remains a candidate, preserves the old body and records version history on adoption', async () => {
  const f = await fixture(),
    run = new WritingSession(f.bridge);
  await run.load();
  await run.start();
  await run.step();
  f.finish(f.tasks[0]);
  await run.step();
  await run.pause();
  const id = run.value.items[0].id;
  const before = f.docs.get('/documents/bid_draft').markdown;
  await run.rewrite(id, 'Expand the verification approach');
  await run.step();
  assert.match(f.tasks[1].context.currentMarkdown, /Implementation/);
  f.finish(
    f.tasks[1],
    '## Revised implementation\n\nRewritten synthetic content with measurable verification, ownership and evidence.',
  );
  await run.step();
  assert.equal(run.value.items[0].state, 'candidate');
  assert.equal(f.docs.get('/documents/bid_draft').markdown, before);
  await run.accept(id);
  assert.match(f.docs.get('/documents/bid_draft').markdown, /Revised/);
  const history = JSON.parse(f.docs.get('/documents/' + run.value.items[0].history[0]).markdown);
  assert.match(history.body, /Implementation/);
  await run.step();
  assert.equal(f.tasks.length, 2, 'adopting a single rewrite must not resume remaining chapters');
  assert.equal(run.value.paused, true);
});
test('stale source or edited chapter prevents adoption; saved candidate survives draft conflict', async () => {
  const f = await fixture(),
    run = new WritingSession(f.bridge);
  await run.load();
  await run.start();
  await run.step();
  f.finish(f.tasks[0]);
  f.conflictDraft();
  await assert.rejects(run.step(), (e) => e.status === 409);
  assert.equal(run.value.items[0].state, 'candidate');
  const reopened = new WritingSession(f.bridge);
  await reopened.load();
  await reopened.accept(reopened.value.items[0].id);
  assert.equal(reopened.value.items[0].state, 'done');
  await reopened.rewrite(reopened.value.items[0].id, 'Revise');
  await reopened.step();
  f.finish(
    f.tasks[1],
    '## Candidate\n\nThis is a rewritten synthetic candidate that must preserve newer user edits.',
  );
  await reopened.step();
  const draft = new DraftSession(f.bridge);
  await draft.load();
  draft.chapters[0].body += '\nManual update';
  await draft.save();
  await assert.rejects(reopened.accept(reopened.value.items[0].id), /edited/);
  assert.ok(reopened.value.items[0].candidate);
  f.matrix.edit(f.matrix.rows[0].id, { text: 'Changed' });
  await f.matrix.save();
  await assert.rejects(reopened.accept(reopened.value.items[0].id), /changed/);
});
test('foreign output and incomplete reference declarations are rejected before changing drafts', async () => {
  const expected = {
    requestId: 'r',
    chapterId: 'c',
    planRevision: 1,
    requirementsRevision: 2,
    requirementIds: ['a'],
  };
  const good = {
    ...expected,
    markdown: '## Body\n\nA sufficiently long synthetic model chapter for validation.',
    summary: 'summary',
    materialGaps: [],
    coveredRequirementIds: ['a'],
  };
  assert.ok(parseChapter(JSON.stringify(good), expected));
  assert.equal(
    parseChapter(JSON.stringify({ ...good, markdown: '# Synthetic title\n\n' + good.markdown }), {
      ...expected,
      title: 'Synthetic title',
    }).markdown,
    good.markdown,
    'canonical body must not repeat the chapter title inserted by the draft document',
  );
  for (const patch of [
    { chapterId: 'other' },
    { planRevision: 3 },
    { coveredRequirementIds: [] },
    { markdown: '<!-- bidproposal:chapter:injected -->\nbody' },
  ])
    assert.throws(() => parseChapter(JSON.stringify({ ...good, ...patch }), expected));
  const f = await fixture(),
    run = new WritingSession(f.bridge);
  await run.load();
  await run.start();
  await run.step();
  f.finish(f.tasks[0]);
  f.tasks[0].result = 'malformed';
  await assert.rejects(run.step());
  assert.equal(f.docs.has('/documents/bid_draft'), false);
  assert.equal(run.value.items[0].state, 'error');
});
test('another window cannot overwrite the writing queue or start a second model task', async () => {
  const f = await fixture(),
    first = new WritingSession(f.bridge);
  await first.load();
  await first.start();
  const stale = new WritingSession(f.bridge);
  await stale.load();
  await first.step();
  await assert.rejects(stale.step());
  assert.equal(f.tasks.length, 1);
});
