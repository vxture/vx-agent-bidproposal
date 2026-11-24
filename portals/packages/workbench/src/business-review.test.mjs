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
import { Requirements } from './requirements.mjs';
import { PlanCandidate } from './plan-candidate.mjs';
import { BackgroundRequest } from './background.mjs';
import { WritingSession } from './writing.mjs';
import { DraftSession } from './draft.mjs';
import {
  waitingForBusinessReview,
  requestBusinessReview,
  syncBusinessPlan,
} from './business-review.mjs';

async function fixture() {
  const docs = new Map(),
    jobs = new Map(),
    reviews = [];
  let fail;
  const bridge = {
    review: (id) => reviews.push(id),
    request: async (method, path, body) => {
      if (path.startsWith('/jobs/'))
        return jobs.has(path.slice(6))
          ? { ok: true, body: structuredClone(jobs.get(path.slice(6))) }
          : { ok: false, status: 404 };
      const doc = docs.get(path);
      if (method === 'GET')
        return doc ? { ok: true, body: structuredClone(doc) } : { ok: false, status: 404 };
      if (fail === path) {
        fail = null;
        throw new Error('Simulated interrupted write');
      }
      if ((doc?.revision || 0) !== body.revision) return { ok: false, status: 409 };
      const next = { markdown: body.markdown, revision: (doc?.revision || 0) + 1 };
      docs.set(path, next);
      return { ok: true, body: structuredClone(next) };
    },
  };
  const matrix = new Requirements(bridge);
  matrix.add({ text: 'SYNTHETIC: daily backup', quote: 'daily backup', location: 'test' });
  matrix.confirm();
  await matrix.save();
  const plan = new PlanSession(bridge);
  await plan.load();
  plan.build(matrix);
  plan.approve(matrix);
  await plan.save();
  const result = {
    verified: false,
    content: {
      proposal_generation: JSON.stringify({
        requirementsRevision: matrix.revision,
        chapters: [
          {
            title: 'Backup design',
            purpose: 'Explain daily backup',
            requirementIds: matrix.rows.map((r) => r.id),
          },
        ],
      }),
    },
    verification: [
      { kind: 'ai_assisted', status: 'passed' },
      { kind: 'human', status: 'pending_human' },
    ],
  };
  const step = {
    id: 'outline',
    taskInstanceId: 'review-task',
    state: 'running',
    waitingOn: ['verification_review'],
    resultDocument: 'runtime_result_test',
  };
  const job = { id: 'test-job', state: 'waiting', steps: [step] };
  jobs.set(job.id, job);
  const bg = new BackgroundRequest(bridge, 'bid_plan_request');
  bg.value = {
    reviewMode: 'business',
    spec: {
      id: job.id,
      sources: [
        { id: 'bid_plan', revision: plan.revision },
        { id: 'bid_requirements', revision: matrix.revision },
      ],
    },
  };
  await bg.save();
  const candidate = new PlanCandidate(bridge);
  await candidate.load();
  const putResult = () =>
    docs.set('/documents/runtime_result_test', {
      markdown: JSON.stringify(result),
      revision: (docs.get('/documents/runtime_result_test')?.revision || 0) + 1,
    });
  putResult();
  const approve = () => {
    result.verified = true;
    result.verification[1].status = 'passed';
    step.state = 'done';
    step.waitingOn = [];
    job.state = 'completed';
    putResult();
  };
  return {
    bridge,
    docs,
    jobs,
    reviews,
    matrix,
    plan,
    candidate,
    bg,
    result,
    step,
    job,
    approve,
    putResult,
    fail: (path) => (fail = path),
  };
}
test('only exclusively pending human verification permits candidate preview', () => {
  const step = { taskInstanceId: 't', waitingOn: ['verification_review'] },
    r = { verified: false, verification: [{ kind: 'human', status: 'pending_human' }] };
  assert.equal(waitingForBusinessReview(r, step), true);
  for (const result of [
    { ...r, verified: true },
    { ...r, verification: [] },
    { ...r, verification: [...r.verification, { kind: 'ai_assisted', status: 'failed' }] },
    null,
  ])
    assert.equal(waitingForBusinessReview(result, step), false);
  assert.equal(waitingForBusinessReview(r, { ...step, taskInstanceId: null }), false);
  assert.equal(waitingForBusinessReview(r, { ...step, waitingOn: ['tool_ask'] }), false);
  assert.equal(
    waitingForBusinessReview(r, { ...step, waitingOn: ['verification_review', 'tool_ask'] }),
    false,
  );
  assert.throws(() => requestBusinessReview({}, 't'));
  const requests = [];
  requestBusinessReview({ review: (id) => requests.push(id) }, 't');
  assert.deepEqual(requests, ['t']);
});
test('plan preview changes no plan; one host decision locks and saves the exact candidate', async () => {
  const f = await fixture(),
    before = f.plan.encode();
  assert.equal((await syncBusinessPlan(f.bg, f.plan, f.candidate, f.matrix)).review, true);
  assert.equal(f.plan.encode(), before);
  assert.equal(f.candidate.value.review.taskInstanceId, 'review-task');
  const candidateRevision = f.candidate.revision;
  await syncBusinessPlan(f.bg, f.plan, f.candidate, f.matrix);
  assert.equal(f.candidate.revision, candidateRevision);
  requestBusinessReview(f.bridge, 'review-task');
  assert.deepEqual(f.reviews, ['review-task']);
  assert.equal(f.plan.encode(), before);
  f.approve();
  assert.equal((await syncBusinessPlan(f.bg, f.plan, f.candidate, f.matrix)).applied, true);
  assert.equal(f.plan.value.approved, true);
  assert.equal(f.plan.value.outline[0].title, 'Backup design');
  assert.equal(f.candidate.value, null);
  assert.equal(f.bg.value.applied, true);
});
test('plan acceptance recovers after plan commit and before clearing candidate, with stable chapter IDs', async () => {
  const f = await fixture();
  await syncBusinessPlan(f.bg, f.plan, f.candidate, f.matrix);
  f.approve();
  f.fail('/documents/bid_plan_candidate');
  await assert.rejects(syncBusinessPlan(f.bg, f.plan, f.candidate, f.matrix), /interrupted/);
  const saved = f.docs.get('/documents/bid_plan'),
    bg = new BackgroundRequest(f.bridge, 'bid_plan_request'),
    plan = new PlanSession(f.bridge),
    candidate = new PlanCandidate(f.bridge);
  await bg.load();
  await plan.load();
  await candidate.load();
  assert.ok(bg.value.acceptance);
  assert.equal(bg.value.applied, undefined);
  await syncBusinessPlan(bg, plan, candidate, f.matrix);
  assert.deepEqual(f.docs.get('/documents/bid_plan'), saved);
  assert.equal(candidate.value, null);
  assert.equal(bg.value.applied, true);
});
test('unverified, rejected and changed-source results cannot replace the plan', async () => {
  for (const mode of ['unverified', 'rejected', 'dirty', 'remote']) {
    const f = await fixture(),
      before = f.docs.get('/documents/bid_plan');
    if (mode === 'unverified') {
      f.step.state = 'done';
      await assert.rejects(syncBusinessPlan(f.bg, f.plan, f.candidate, f.matrix), /verification/);
    }
    if (mode === 'rejected') {
      await syncBusinessPlan(f.bg, f.plan, f.candidate, f.matrix);
      f.job.state = 'error';
      await assert.rejects(syncBusinessPlan(f.bg, f.plan, f.candidate, f.matrix));
      assert.equal(f.candidate.value.review.invalid, true);
    }
    if (mode === 'dirty') {
      f.plan.change('pages', 22);
      await assert.rejects(syncBusinessPlan(f.bg, f.plan, f.candidate, f.matrix), /changed/);
    }
    if (mode === 'remote') {
      f.approve();
      const remote = new PlanSession(f.bridge);
      await remote.load();
      remote.change('pages', 33);
      await remote.save();
      await assert.rejects(syncBusinessPlan(f.bg, f.plan, f.candidate, f.matrix), /another window/);
      assert.equal(f.docs.get('/documents/bid_plan').markdown, remote.encode());
      continue;
    }
    assert.deepEqual(f.docs.get('/documents/bid_plan'), before);
  }
});
test('host confirmation cannot adopt a plan with an unavailable pinned template', async () => {
  const f = await fixture();
  f.plan.value.template = { id: 'missing', name: 'synthetic.docx', hash: 'a'.repeat(64) };
  await f.plan.save();
  f.bg.value.spec.sources[0].revision = f.plan.revision;
  await f.bg.save();
  f.approve();
  const before = f.docs.get('/documents/bid_plan');
  await assert.rejects(syncBusinessPlan(f.bg, f.plan, f.candidate, f.matrix), /template/);
  assert.deepEqual(f.docs.get('/documents/bid_plan'), before);
});
async function writingFixture() {
  const f = await fixture(),
    run = new WritingSession(f.bridge);
  run.backgroundEnabled = true;
  run.businessReviewEnabled = true;
  await run.start();
  const item = run.value.items[0],
    input = {
      requestId: 'chapter-request',
      chapterId: item.id,
      planRevision: f.plan.revision,
      requirementsRevision: f.matrix.revision,
    };
  const draft = new DraftSession(f.bridge);
  await draft.load();
  draft.chapters = [
    {
      id: item.id,
      title: item.title,
      body: '## Old text\n\nSYNTHETIC original chapter with daily backup and enough content for validation.',
    },
  ];
  await draft.save();
  const digest = [
    ...new Uint8Array(
      await crypto.subtle.digest('SHA-256', new TextEncoder().encode(draft.chapters[0].body)),
    ),
  ]
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
  input.baseBodyHash = digest;
  Object.assign(item, { rewrite: true, requestId: input.requestId, baseBodyHash: digest });
  run.value.jobId = f.job.id;
  await run.save();
  f.bg.documentId = 'bid_writing_request';
  f.bg.revision = 0;
  await f.bg.save();
  await run.background.load();
  f.step.id = item.id;
  f.step.context = { markdown: JSON.stringify(input) };
  f.result.content.proposal_generation = JSON.stringify({
    ...input,
    markdown:
      '## New text\n\nSYNTHETIC revised daily backup with clear ownership, verification steps and evidence.',
    summary: 'Revised synthetic chapter',
    materialGaps: [],
    coveredRequirementIds: f.matrix.rows.map((r) => r.id),
  });
  f.putResult();
  return { ...f, run, item };
}
test('chapter preview is read only; host confirmation adopts once and preserves original history', async () => {
  const f = await writingFixture(),
    before = f.docs.get('/documents/bid_draft');
  await f.run.syncBackground();
  assert.equal(f.item.state, 'candidate');
  assert.deepEqual(f.docs.get('/documents/bid_draft'), before);
  await f.run.accept(f.item.id);
  assert.deepEqual(f.reviews, ['review-task']);
  assert.deepEqual(f.docs.get('/documents/bid_draft'), before);
  f.approve();
  await f.run.syncBackground();
  assert.equal(f.item.state, 'done');
  assert.equal(f.item.history.length, 1);
  assert.match(f.docs.get('/documents/' + f.item.history[0]).markdown, /Old text/);
  assert.match(f.docs.get('/documents/bid_draft').markdown, /New text/);
  assert.equal(f.reviews.length, 1);
  const reopened = new WritingSession(f.bridge);
  reopened.backgroundEnabled = true;
  await reopened.load();
  assert.equal(reopened.complete, true);
  assert.equal(reopened.value.items[0].history.length, 1);
  assert.equal(await reopened.step(), false);
});
test('approved chapter retries interrupted adoption automatically without a second decision', async () => {
  const f = await writingFixture();
  f.approve();
  f.fail('/documents/bid_draft');
  await assert.rejects(f.run.syncBackground(), /interrupted/);
  const reopened = new WritingSession(f.bridge);
  reopened.backgroundEnabled = true;
  await reopened.load();
  await reopened.background.load();
  assert.equal(reopened.value.items[0].reviewAccepted, 'review-task');
  await reopened.syncBackground();
  assert.equal(reopened.complete, true);
  assert.equal(reopened.value.items[0].history.length, 1);
  assert.deepEqual(f.reviews, []);
});
test('rejected chapter preserves candidate and original; changed draft blocks approved adoption', async () => {
  const f = await writingFixture();
  await f.run.syncBackground();
  f.job.state = 'cancelled';
  await f.run.syncBackground();
  assert.equal(f.item.state, 'error');
  assert.ok(f.item.candidate);
  assert.equal(f.item.reviewTaskId, undefined);
  assert.match(f.docs.get('/documents/bid_draft').markdown, /Old text/);
  const g = await writingFixture(),
    draft = new DraftSession(g.bridge);
  await draft.load();
  draft.chapters[0].body += '\nOperator update';
  await draft.save();
  g.approve();
  await assert.rejects(g.run.syncBackground(), /edited/);
  assert.ok(g.item.candidate);
  assert.match(g.docs.get('/documents/bid_draft').markdown, /Operator update/);
});
