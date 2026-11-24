/**
 * @package @bidproposal/workbench
 * @layer Presentation
 * @category Business
 * @author AI-Generated
 * @date 2026-11-25
 */
import { DocumentError } from './errors.mjs';
import { PlanSession } from './plan.mjs';
import { Requirements } from './requirements.mjs';
import { DraftSession } from './draft.mjs';
import { BackgroundRequest } from './background.mjs';
import { waitingForBusinessReview, requestBusinessReview } from './business-review.mjs';
import {
  loadChapterEvidence,
  chapterEvidence,
  saveChapterEvidence,
  readChapterEvidence,
  parseEvidenceUsage,
  chapterEvidenceGaps,
} from './chapter-evidence.mjs';

const path = '/documents/bid_writing';
const prefix = '# Bid writing progress\n\n';
const fingerprint = async (value) =>
  [...new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value)))]
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
const check = (reply) => {
  if (!reply.ok) throw new DocumentError(reply);
  return reply.body;
};
export function parseChapter(text, expected) {
  if (typeof text !== 'string' || text.length > 140000)
    throw new Error('Invalid chapter result size');
  const v = JSON.parse(
    text
      .trim()
      .replace(/^```(?:json)?\s*/, '')
      .replace(/```$/, ''),
  );
  for (const key of ['requestId', 'chapterId', 'planRevision', 'requirementsRevision'])
    if (v[key] !== expected[key])
      throw new Error('Chapter result belongs to a different request or source revision');
  if (
    typeof v.markdown !== 'string' ||
    v.markdown.trim().length < 40 ||
    v.markdown.length > 100000 ||
    /^<!-- bidproposal:chapter:/m.test(v.markdown)
  )
    throw new Error('Invalid chapter Markdown');
  if (
    typeof v.summary !== 'string' ||
    v.summary.length > 1500 ||
    !Array.isArray(v.materialGaps) ||
    v.materialGaps.length > 30 ||
    v.materialGaps.some((s) => typeof s !== 'string' || s.length > 500)
  )
    throw new Error('Invalid chapter summary or material gaps');
  const ids = expected.requirementIds;
  if (
    !Array.isArray(v.coveredRequirementIds) ||
    v.coveredRequirementIds.length !== ids.length ||
    new Set(v.coveredRequirementIds).size !== ids.length ||
    ids.some((id) => !v.coveredRequirementIds.includes(id))
  )
    throw new Error('Chapter result omitted required references');
  let markdown = v.markdown.trim();
  const heading = /^# ([^\n]+)\r?\n+/.exec(markdown);
  if (heading && heading[1].trim() === expected.title?.trim())
    markdown = markdown.slice(heading[0].length).trim();
  if (markdown.length < 40) throw new Error('Invalid chapter Markdown');
  const evidence = expected.enterpriseEvidence;
  const usedEvidence = evidence ? parseEvidenceUsage(v, evidence, markdown) : [];
  if (
    evidence &&
    [...evidence.facts, ...evidence.cautions].some(
      (f) => f.id.length >= 16 && markdown.includes(f.id),
    )
  )
    throw new Error('Internal evidence identifiers must not appear in chapter text');
  return {
    markdown,
    summary: v.summary,
    materialGaps: [...new Set([...v.materialGaps, ...chapterEvidenceGaps(evidence)])],
    ...(evidence ? { evidenceDigest: evidence.digest, usedEvidence } : {}),
  };
}

export class WritingSession {
  constructor(bridge) {
    this.bridge = bridge;
    this.revision = 0;
    this.value = null;
    this.plan = null;
    this.matrix = null;
    this.draft = null;
    this.backgroundEnabled = false;
    this.background = new BackgroundRequest(bridge, 'bid_writing_request');
  }
  async load() {
    const r = await this.bridge.request('GET', path);
    if (!r.ok && r.status !== 404) throw new DocumentError(r);
    if (r.ok) {
      if (!r.body.markdown.startsWith(prefix)) throw new Error('Unsupported writing record');
      const v = JSON.parse(r.body.markdown.slice(prefix.length));
      if (
        v?.version !== 1 ||
        !Number.isSafeInteger(v.planRevision) ||
        !Array.isArray(v.items) ||
        v.items.length > 80 ||
        new Set(v.items.map((i) => i.id)).size !== v.items.length ||
        v.items.some(
          (i) =>
            !i.id ||
            !['pending', 'submitting', 'running', 'candidate', 'done', 'error'].includes(i.state),
        )
      )
        throw new Error('Invalid writing record');
      this.value = v;
      this.revision = r.body.revision;
    }
    return this;
  }
  async save() {
    const markdown = prefix + JSON.stringify(this.value);
    if (new TextEncoder().encode(markdown).length > 900000)
      throw new Error('Writing progress too large');
    const r = check(await this.bridge.request('PUT', path, { markdown, revision: this.revision }));
    this.revision = r.revision;
  }
  async sources() {
    const plan = new PlanSession(this.bridge),
      matrix = new Requirements(this.bridge),
      draft = new DraftSession(this.bridge);
    await plan.load();
    await matrix.load();
    await draft.load();
    const tasks = plan.writingTasks(matrix);
    if (
      this.value &&
      (this.value.planRevision !== plan.revision ||
        this.value.requirementsRevision !== matrix.revision)
    )
      throw new Error(
        'Planning or requirements changed; confirm the plan and start a new writing batch',
      );
    this.plan = plan;
    this.matrix = matrix;
    this.draft = draft;
    this.enterpriseState = await loadChapterEvidence(this.bridge);
    return tasks;
  }
  async start() {
    const tasks = await this.sources();
    if (!this.value) {
      this.value = {
        version: 1,
        id: crypto.randomUUID(),
        planRevision: this.plan.revision,
        requirementsRevision: this.matrix.revision,
        paused: false,
        items: tasks.map((t) => ({ id: t.id, title: t.title, state: 'pending', history: [] })),
      };
      await this.save();
    } else {
      this.value.paused = false;
      if (this.backgroundEnabled && this.value.jobId) {
        await this.background.load();
        await this.background.control('resume');
      }
      await this.save();
    }
  }
  async pause() {
    if (!this.value) return;
    if (this.value.jobId) {
      await this.background.load();
      await this.background.control('pause');
    }
    this.value.paused = true;
    await this.save();
  }
  async reset() {
    if (this.value?.items.some((i) => ['submitting', 'running', 'candidate'].includes(i.state)))
      throw new Error('Resolve the current task or candidate first');
    const old = this.value;
    this.value = null;
    let tasks;
    try {
      tasks = await this.sources();
    } catch (e) {
      this.value = old;
      throw e;
    }
    if (old)
      check(
        await this.bridge.request('PUT', '/documents/bid_writing_archive_' + crypto.randomUUID(), {
          markdown: prefix + JSON.stringify(old),
          revision: 0,
        }),
      );
    this.value = {
      version: 1,
      id: crypto.randomUUID(),
      planRevision: this.plan.revision,
      requirementsRevision: this.matrix.revision,
      paused: true,
      items: tasks.map((t) => {
        const prior = old?.items.find((i) => i.id === t.id);
        return {
          id: t.id,
          title: t.title,
          state: 'pending',
          history: prior?.history || [],
          ...(prior?.evidenceRef
            ? {
                evidenceRef: structuredClone(prior.evidenceRef),
                usedEvidence: structuredClone(prior.usedEvidence || []),
                materialGaps: structuredClone(prior.materialGaps || []),
              }
            : {}),
        };
      }),
    };
    await this.save();
  }
  async rewrite(id, instruction) {
    await this.sources();
    if (!this.value) throw new Error('Start the writing batch first');
    if (this.value.items.some((i) => ['submitting', 'running', 'candidate'].includes(i.state)))
      throw new Error('Finish the current generation or candidate first');
    if (typeof instruction !== 'string' || !instruction.trim() || instruction.length > 4000)
      throw new Error('Provide rewrite instructions (up to 4000 characters)');
    const item = this.value.items.find((i) => i.id === id);
    if (!item) throw new Error('Chapter is outside the current plan');
    if (this.value.jobId) {
      await this.background.load();
      await this.background.control('cancel');
      delete this.value.jobId;
    }
    item.state = 'pending';
    item.rewrite = true;
    item.instruction = instruction.trim();
    delete item.error;
    delete item.taskId;
    delete item.candidate;
    delete item.requestId;
    // Submit only this rewrite; adopting it must not restart a paused batch.
    this.value.paused = true;
    await this.save();
  }
  async evidenceFor(id) {
    const task = this.plan?.writingTasks(this.matrix).find((t) => t.id === id);
    if (!task) throw new Error('Chapter is no longer in the approved plan');
    return chapterEvidence(this.enterpriseState || (await loadChapterEvidence(this.bridge)), task);
  }
  async evidenceSnapshot(id, { candidate = false } = {}) {
    const item = this.value?.items.find((i) => i.id === id);
    return readChapterEvidence(this.bridge, candidate ? item?.inputEvidenceRef : item?.evidenceRef);
  }
  async rewriteWithEvidence(id, instruction = '') {
    if (typeof instruction !== 'string') throw new Error('Invalid rewrite instruction');
    const brief =
      '\u4f7f\u7528\u672c\u7ae0\u6700\u65b0\u5df2\u91c7\u7eb3\u4f01\u4e1a\u8bc1\u636e\u91cd\u5199\uff0c\u4fdd\u7559\u62db\u6807\u6307\u6807\u4e0e\u5176\u4ed6\u7ae0\u8282\u4e0d\u53d8\uff1b\u65e0\u8bc1\u660e\u7684\u8d44\u8d28\u3001\u4eba\u5458\u6216\u4e1a\u7ee9\u4fdd\u7559\u5f85\u8865\u6807\u8bb0\u3002 ' +
      instruction;
    if (brief.length > 4000)
      throw new Error(
        '\u91cd\u5199\u8981\u6c42\u8fc7\u957f\uff0c\u8bf7\u7f29\u77ed\u81f3 3900 \u5b57\u4ee5\u5185\uff1b\u672a\u622a\u65ad\u8f93\u5165',
      );
    return this.rewrite(id, brief);
  }
  async retry(id) {
    const item = this.value.items.find((i) => i.id === id);
    if (!item || item.state !== 'error') throw new Error('No failed chapter to retry');
    if (item.candidate) throw new Error('Resolve the saved candidate first');
    item.state = 'pending';
    delete item.taskId;
    delete item.error;
    delete item.requestId;
    delete this.value.backgroundError;
    this.value.paused = false;
    await this.save();
  }
  async discard(id) {
    const item = this.value.items.find((i) => i.id === id);
    if (item?.reviewTaskId) {
      requestBusinessReview(this.bridge, item.reviewTaskId);
      return;
    }
    if (item?.state !== 'candidate' && !(item?.state === 'error' && item.candidate))
      throw new Error('No chapter candidate');
    item.state = item.baseBodyHash === (await fingerprint('')) ? 'pending' : 'done';
    delete item.candidate;
    this.value.paused = true;
    await this.save();
  }
  async step() {
    if (!this.value) return false;
    if (
      this.backgroundEnabled &&
      (this.value.jobId ||
        !this.value.items.some((i) => ['submitting', 'running'].includes(i.state)))
    ) {
      await this.background.load();
      if (this.value.jobId) {
        await this.syncBackground();
        return true;
      }
      if (!this.value.paused || this.value.items.some((i) => i.state === 'pending' && i.rewrite)) {
        await this.launchBackground();
        if (!this.value.jobId) return false;
        await this.syncBackground();
        return true;
      }
      return false;
    }
    // A paused queue still records an already submitted result, but starts no new request.
    let item = this.value.items.find((i) => ['submitting', 'running'].includes(i.state));
    if (!item) {
      if (this.value.items.some((i) => ['candidate', 'error'].includes(i.state))) return false;
      item = this.value.items.find((i) => i.state === 'pending' && i.rewrite);
      if (!item) {
        if (this.value.paused) return false;
        item = this.value.items.find((i) => i.state === 'pending');
      }
    }
    if (!item) return false;
    try {
      const tasks = await this.sources();
      const snapshot = tasks.find((t) => t.id === item.id);
      if (!snapshot) throw new Error('Chapter is no longer in the approved plan');
      if (item.state === 'pending') {
        const current = this.draft.chapters.find((c) => c.id === item.id);
        // Existing text is never silently replaced by a first-generation batch.
        item.rewrite = item.rewrite || !!current?.body;
        item.requestId = crypto.randomUUID();
        item.baseBodyHash = await fingerprint(current?.body || '');
        const enterpriseEvidence = await this.evidenceFor(item.id);
        item.inputEvidenceRef = await saveChapterEvidence(this.bridge, enterpriseEvidence);
        const outline = this.plan.value.outline.map(({ id, title, purpose }) => ({
          id,
          title,
          purpose: purpose || '',
        }));
        const context = {
          requestId: item.requestId,
          chapterId: item.id,
          baseBodyHash: item.baseBodyHash,
          planRevision: this.value.planRevision,
          requirementsRevision: this.value.requirementsRevision,
          configuration: snapshot.configuration,
          chapter: {
            title: snapshot.title,
            purpose: this.plan.value.outline.find((c) => c.id === item.id)?.purpose || '',
            requirementIds: snapshot.requirementIds,
            requirements: snapshot.requirements,
          },
          outline,
          precedingSummaries: this.value.items
            .filter((i) => i.state === 'done' && i.summary)
            .slice(-6)
            .map((i) => ({ title: i.title, summary: i.summary })),
          instruction: item.instruction || '',
          currentMarkdown: item.rewrite ? current?.body || '' : '',
          targetCharacters: Math.max(
            1200,
            Math.min(6000, Math.round((snapshot.configuration.pages * 600) / tasks.length)),
          ),
        };
        context.enterpriseEvidence = enterpriseEvidence;
        const markdown = JSON.stringify(context);
        if (new TextEncoder().encode(markdown).length > 160000)
          throw new Error(
            'Chapter context exceeds the safe batch size; split this chapter in the writing plan',
          );
        const doc = await this.bridge.request('GET', '/documents/bid_chapter_context');
        if (!doc.ok && doc.status !== 404) throw new DocumentError(doc);
        const instances = check(await this.bridge.request('GET', '/tasks')).items;
        if (
          instances.some(
            (t) =>
              t.taskId === 'write_chapter' &&
              !['completed', 'failed', 'rejected', 'cancelled'].includes(t.state),
          )
        )
          throw new Error('A chapter task is already active; recover it before starting another');
        check(
          await this.bridge.request('PUT', '/documents/bid_chapter_context', {
            markdown,
            revision: doc.ok ? doc.body.revision : 0,
          }),
        );
        item.beforeTaskIds = instances.filter((t) => t.taskId === 'write_chapter').map((t) => t.id);
        item.state = 'submitting';
        await this.save();
        // Persist submitting before POST: lost responses must recover, never blindly resubmit.
        const task = check(
          await this.bridge.request('POST', '/tasks', { taskId: 'write_chapter' }),
        );
        item.taskId = task.id;
        item.state = 'running';
        await this.save();
        return true;
      }
      const list = check(await this.bridge.request('GET', '/tasks')).items;
      if (item.state === 'submitting') {
        const possible = list.filter(
          (t) => t.taskId === 'write_chapter' && !item.beforeTaskIds.includes(t.id),
        );
        if (possible.length !== 1)
          throw new Error(
            'Submission is uncertain; the queue will not resubmit. Check the runtime task list and reopen this page',
          );
        item.taskId = possible[0].id;
        item.state = 'running';
        await this.save();
      }
      const task = list.find((t) => t.id === item.taskId);
      if (!task) throw new Error('The saved model task is unavailable');
      item.runtimeState = task.state;
      item.waitingOn = task.waitingOn?.map((c) => c.kind) || [];
      if (['failed', 'rejected', 'cancelled'].includes(task.state))
        throw new Error(
          'The model task ' + task.state + '; inspect the runtime task record before retrying',
        );
      if (task.state !== 'completed' || !task.hasResult) return true;
      const result = check(await this.bridge.request('GET', '/tasks/' + item.taskId + '/result'));
      item.candidate = parseChapter(result.content.proposal_generation, {
        ...snapshot,
        chapterId: item.id,
        requestId: item.requestId,
        enterpriseEvidence: await readChapterEvidence(this.bridge, item.inputEvidenceRef),
      });
      item.state = 'candidate';
      await this.save();
      if (!item.rewrite) await this.accept(item.id);
      return true;
    } catch (e) {
      if (e.status === 409) throw e;
      if (item.state === 'submitting') {
        this.value.paused = true;
        await this.save();
        throw e;
      }
      if (item.state !== 'candidate') {
        item.state = 'error';
        item.error = e.message;
        this.value.paused = true;
        await this.save();
      }
      throw e;
    }
  }
  async accept(id) {
    const pending = this.value?.items.find((item) => item.id === id);
    if (pending?.reviewTaskId) {
      requestBusinessReview(this.bridge, pending.reviewTaskId);
      return;
    }
    await this.sources();
    const item = this.value.items.find((i) => i.id === id);
    if (item?.state !== 'candidate' || !item.candidate)
      throw new Error('No saved chapter candidate');
    const current = this.draft.chapters.find((c) => c.id === id),
      body = item.candidate.markdown;
    if (
      item.inputEvidenceRef &&
      (await this.evidenceFor(id)).digest !== item.inputEvidenceRef.digest
    )
      throw new Error(
        '\u4f01\u4e1a\u8d44\u6599\u6216\u91c7\u7eb3\u8bb0\u5f55\u5df2\u66f4\u65b0\uff0c\u539f\u7a3f\u548c\u5019\u9009\u90fd\u5df2\u4fdd\u7559\uff1b\u8bf7\u4f7f\u7528\u6700\u65b0\u8bc1\u636e\u91cd\u5199',
      );
    // Recovery after draft commit but before progress commit is idempotent.
    if (current?.body.trim() !== body.trim()) {
      if ((await fingerprint(current?.body || '')) !== item.baseBodyHash)
        throw new Error(
          'This chapter was edited after generation began; current text and candidate are both preserved',
        );
      if (current?.body && !item.historyId) {
        item.historyId = 'bid_revision_' + crypto.randomUUID();
        check(
          await this.bridge.request('PUT', '/documents/' + item.historyId, {
            markdown: JSON.stringify({
              chapterId: id,
              title: current.title,
              body: current.body,
              taskId: item.taskId,
              replacedAt: new Date().toISOString(),
              evidenceRef: item.evidenceRef || null,
              usedEvidence: item.usedEvidence || [],
              materialGaps: item.materialGaps || [],
            }),
            revision: 0,
          }),
        );
        item.history.push(item.historyId);
        await this.save();
      }
      const next = { id, title: item.title, body };
      if (current) Object.assign(current, next);
      else this.draft.chapters.push(next);
      const order = new Map(this.value.items.map((i, n) => [i.id, n]));
      this.draft.chapters.sort((a, b) => (order.get(a.id) ?? 1000) - (order.get(b.id) ?? 1000));
      await this.draft.save();
    }
    item.summary = item.candidate.summary;
    item.materialGaps = item.candidate.materialGaps;
    if (item.inputEvidenceRef) {
      item.evidenceRef = structuredClone(item.inputEvidenceRef);
      item.usedEvidence = structuredClone(item.candidate.usedEvidence || []);
    }
    item.state = 'done';
    item.completedAt = new Date().toISOString();
    delete item.candidate;
    delete item.historyId;
    delete item.reviewAccepted;
    delete item.error;
    await this.save();
  }
  async launchBackground() {
    const tasks = await this.sources();
    await this.background.load();
    if (this.background.value) {
      const job = await this.background.sync();
      if (!['completed', 'error', 'cancelled'].includes(job.state)) {
        this.value.jobId = job.id;
        await this.background.control(
          this.value.paused && !this.value.items.some((i) => i.state === 'pending' && i.rewrite)
            ? 'pause'
            : 'resume',
        );
        await this.save();
        return;
      }
    }
    const pending = this.value.items.filter((i) => i.state === 'pending');
    if (!pending.length) return;
    const targets = pending.some((i) => i.rewrite) ? pending.filter((i) => i.rewrite) : pending;
    const steps = [];
    for (const item of targets) {
      const snapshot = tasks.find((t) => t.id === item.id),
        current = this.draft.chapters.find((c) => c.id === item.id);
      item.rewrite = item.rewrite || !!current?.body;
      item.requestId = crypto.randomUUID();
      item.baseBodyHash = await fingerprint(current?.body || '');
      const enterpriseEvidence = await this.evidenceFor(item.id);
      item.inputEvidenceRef = await saveChapterEvidence(this.bridge, enterpriseEvidence);
      const context = {
        requestId: item.requestId,
        chapterId: item.id,
        planRevision: this.value.planRevision,
        requirementsRevision: this.value.requirementsRevision,
        configuration: snapshot.configuration,
        chapter: {
          title: item.title,
          purpose: this.plan.value.outline.find((c) => c.id === item.id)?.purpose || '',
          requirementIds: snapshot.requirementIds,
          requirements: snapshot.requirements,
        },
        outline: this.plan.value.outline.map(({ id, title, purpose }) => ({
          id,
          title,
          purpose: purpose || '',
        })),
        precedingSummaries: this.value.items
          .filter((i) => i.state === 'done' && i.summary)
          .slice(-6)
          .map((i) => ({ title: i.title, summary: i.summary })),
        instruction: item.instruction || '',
        currentMarkdown: item.rewrite ? current?.body || '' : '',
        targetCharacters: Math.max(
          1200,
          Math.min(6000, Math.round((snapshot.configuration.pages * 600) / tasks.length)),
        ),
      };
      context.baseBodyHash = item.baseBodyHash;
      context.enterpriseEvidence = enterpriseEvidence;
      const markdown = JSON.stringify(context);
      if (new TextEncoder().encode(markdown).length > 160000)
        throw new Error('Chapter context too large');
      steps.push({
        id: item.id,
        taskId: 'write_chapter',
        context: { id: 'bid_chapter_context', markdown },
      });
    }
    const spec = {
      id: crypto.randomUUID(),
      label: 'Bid chapter writing',
      sources: [
        { id: 'bid_plan', revision: this.plan.revision },
        { id: 'bid_requirements', revision: this.matrix.revision },
      ],
      steps,
    };
    this.background.value = {
      spec,
      ...(this.businessReviewEnabled ? { reviewMode: 'business' } : {}),
    };
    await this.background.save();
    this.value.jobId = spec.id;
    await this.save();
    await this.background.sync();
  }
  async syncBackground() {
    const job = await this.background.sync();
    if (!job || job.id !== this.value.jobId)
      throw new Error('Background writing request unavailable');
    const tasks = await this.sources();
    for (const step of job.steps) {
      const item = this.value.items.find((i) => i.id === step.id);
      if (
        !item ||
        item.state === 'done' ||
        (item.state === 'candidate' && !item.reviewTaskId && !item.reviewAccepted)
      )
        continue;
      const input = JSON.parse(step.context.markdown);
      item.requestId = input.requestId;
      item.baseBodyHash = input.baseBodyHash || item.baseBodyHash;
      item.taskId = step.taskInstanceId;
      item.runtimeState = step.runtimeState;
      item.waitingOn = step.waitingOn || [];
      item.state = step.state === 'pending' ? 'pending' : 'running';
      if (
        this.background.value.reviewMode === 'business' &&
        step.resultDocument &&
        step.state !== 'done' &&
        !['error', 'cancelled'].includes(job.state)
      ) {
        const result = await this.background.result(step);
        if (waitingForBusinessReview(result, step)) {
          item.candidate = parseChapter(result.content.proposal_generation, {
            ...tasks.find((t) => t.id === item.id),
            chapterId: item.id,
            requestId: item.requestId,
            enterpriseEvidence: await readChapterEvidence(this.bridge, item.inputEvidenceRef),
          });
          item.reviewTaskId = step.taskInstanceId;
          item.state = 'candidate';
          continue;
        }
      }
      if (step.state === 'done') {
        delete item.reviewTaskId;
        try {
          const result = await this.background.result(step);
          if (!result?.verified) throw new Error('Model result did not pass verification');
          item.candidate = parseChapter(result.content.proposal_generation, {
            ...tasks.find((t) => t.id === item.id),
            chapterId: item.id,
            requestId: item.requestId,
            enterpriseEvidence: await readChapterEvidence(this.bridge, item.inputEvidenceRef),
          });
        } catch (e) {
          item.state = 'error';
          item.error =
            '\u672c\u7ae0\u7ed3\u679c\u6216\u8bc1\u636e\u5f15\u7528\u6821\u9a8c\u672a\u901a\u8fc7\uff0c\u539f\u6587\u548c\u6a21\u578b\u7ed3\u679c\u5df2\u4fdd\u7559\uff1a' +
            e.message;
          this.value.paused = true;
          await this.save();
          continue;
        }
        item.state = 'candidate';
        if (this.background.value.reviewMode === 'business')
          item.reviewAccepted = step.taskInstanceId;
        await this.save();
        if (!item.rewrite || item.reviewAccepted) await this.accept(item.id);
      } else if (['error', 'cancelled'].includes(job.state)) {
        delete item.reviewTaskId;
        item.state = 'error';
        item.error =
          job.error ||
          '\u540e\u53f0\u7f16\u5199\u5df2\u53d6\u6d88\uff0c\u5df2\u4fdd\u5b58\u7ae0\u8282\u4fdd\u7559\uff0c\u53ef\u91cd\u8bd5\u672c\u7ae0';
        this.value.paused = true;
      }
    }
    if (job.state === 'error') {
      this.value.paused = true;
      this.value.backgroundError = job.error;
    } else delete this.value.backgroundError;
    if (['completed', 'error', 'cancelled'].includes(job.state)) {
      delete this.value.jobId;
    } else if (job.paused) this.value.paused = true;
    await this.save();
  }
  get complete() {
    return !!this.value?.items.length && this.value.items.every((i) => i.state === 'done');
  }
  async completionTime() {
    if (!this.complete) return null;
    await this.background.load();
    const spec = this.background.value?.spec;
    if (
      !spec ||
      !spec.sources.some((s) => s.id === 'bid_plan' && s.revision === this.value.planRevision) ||
      !spec.sources.some(
        (s) => s.id === 'bid_requirements' && s.revision === this.value.requirementsRevision,
      )
    )
      return null;
    const reply = await this.bridge.request('GET', '/jobs/' + spec.id);
    if (reply.status === 404) return null;
    const job = check(reply);
    return job.state === 'completed' &&
      job.steps.every(
        (s) =>
          s.state === 'done' && this.value.items.some((i) => i.id === s.id && i.state === 'done'),
      ) &&
      Number.isFinite(Date.parse(job.updatedAt))
      ? job.updatedAt
      : null;
  }
}
