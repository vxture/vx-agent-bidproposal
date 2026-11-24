/**
 * @package @bidproposal/workbench
 * @layer Presentation
 * @category Business
 * @author AI-Generated
 * @date 2026-11-25
 */
import { PlanSession } from './plan.mjs';
export function waitingForBusinessReview(result, step) {
  return (
    !!step?.taskInstanceId &&
    step.waitingOn?.length === 1 &&
    step.waitingOn[0] === 'verification_review' &&
    result?.verified === false &&
    Array.isArray(result.verification) &&
    result.verification.some((v) => v.kind === 'human' && v.status === 'pending_human') &&
    result.verification.every(
      (v) => v.status === 'passed' || (v.kind === 'human' && v.status === 'pending_human'),
    )
  );
}
export function requestBusinessReview(bridge, taskInstanceId) {
  if (typeof bridge.review !== 'function')
    throw new Error(
      '\u8bf7\u4ece RUYIN \u5f85\u529e\u9762\u677f\u6253\u5f00\u672c\u6b21\u6210\u679c\u786e\u8ba4',
    );
  bridge.review(taskInstanceId);
}
/** The host human checkpoint is the decision. This only fulfills its verified result. */
export async function syncBusinessPlan(bg, plan, candidate, matrix) {
  const job = await bg.sync(),
    step = job.steps[0];
  if (['error', 'cancelled'].includes(job.state)) {
    if (candidate.value?.review)
      await candidate.put({
        ...candidate.value,
        review: { ...candidate.value.review, invalid: true },
      });
    throw new Error(
      job.error || '\u89c4\u5212\u5df2\u53d6\u6d88\uff0c\u539f\u65b9\u6848\u4fdd\u7559',
    );
  }
  const result = step.resultDocument ? await bg.result(step) : null;
  if (step.state !== 'done' && waitingForBusinessReview(result, step)) {
    const pinned = bg.value.spec.sources.find((source) => source.id === 'bid_plan').revision;
    if (plan.dirty || plan.revision !== pinned)
      throw new Error('Planning changed; saved result preserved');
    const content = result.content.proposal_generation;
    if (
      candidate.value?.content !== content ||
      candidate.value?.review?.taskInstanceId !== step.taskInstanceId
    )
      await candidate.stage(content, plan, matrix, {
        taskInstanceId: step.taskInstanceId,
        jobId: job.id,
      });
    return { job, review: true };
  }
  if (step.state !== 'done') return { job };
  if (!result?.verified) throw new Error('Planning result did not pass verification');
  if (plan.value.template) {
    const files = await plan.bridge.request('GET', '/files');
    if (
      !files.ok ||
      !files.body.items.some(
        (file) => file.id === plan.value.template.id && file.hash === plan.value.template.hash,
      )
    )
      throw new Error('Selected template is unavailable; reviewed candidate preserved');
  }
  const content = result.content.proposal_generation,
    pinned = bg.value.spec.sources.find((source) => source.id === 'bid_plan').revision;
  if (!bg.value.acceptance) {
    if (plan.dirty || plan.revision !== pinned)
      throw new Error('Planning changed; saved result preserved');
    const intended = new PlanSession(plan.bridge);
    intended.value = structuredClone(plan.value);
    intended.adopt(content, matrix);
    intended.approve(matrix);
    bg.value.acceptance = { content, baseRevision: pinned, value: structuredClone(intended.value) };
    await bg.save();
  }
  const receipt = bg.value.acceptance;
  if (plan.dirty) throw new Error('Planning changed locally; reviewed candidate preserved');
  if (receipt.content !== content || receipt.baseRevision !== pinned)
    throw new Error('Planning acceptance receipt mismatch');
  const intended = new PlanSession(plan.bridge);
  intended.value = structuredClone(receipt.value);
  intended.approve(matrix);
  const latest = new PlanSession(plan.bridge);
  await latest.load();
  if (latest.encode() !== intended.encode()) {
    if (latest.revision !== pinned || plan.dirty)
      throw new Error('Planning changed in another window; reviewed candidate preserved');
    const before = plan.value;
    plan.value = structuredClone(intended.value);
    try {
      await plan.save();
    } catch (e) {
      plan.value = before;
      throw e;
    }
  } else {
    plan.value = latest.value;
    plan.saved = latest.saved;
    plan.revision = latest.revision;
  }
  if (candidate.value) await candidate.put(null);
  bg.value.applied = true;
  await bg.save();
  return { job, applied: true };
}
