/**
 * @package @bidproposal/workbench
 * @layer Presentation
 * @category Workbench
 * @author AI-Generated
 * @date 2026-11-25
 */
import { mountDelivery } from './delivery-ui.mjs';
import { mountReview } from './review-ui.mjs';
import { mountWriting } from './writing-ui.mjs';
import { mountPlanning } from './plan-ui.mjs';
import { STAGES, WorkflowRecords } from './workflow.mjs';
import { mountRequirements } from './requirements-ui.mjs';
import { mountReading } from './reading-ui.mjs';
import { mountBatchAnalysis } from './batch-analysis-ui.mjs';
import { mountEvidence } from './evidence-ui.mjs';
import { DraftSession, DocumentError } from './draft.mjs';

/** Mount the same business panels with an explicit environment adapter. */
export async function mountWorkbench(runtime) {
  const get = (id) => document.getElementById(id);
  const report = (error) => {
    get('error').textContent =
      error instanceof DocumentError
        ? error.message
        : '\u64cd\u4f5c\u672a\u5b8c\u6210\uff1a' + error.message;
    get('error').hidden = false;
  };
  const show = (id) => {
    const stage = STAGES.find((item) => item.id === id) || STAGES[0];
    const panels = {
      analysis: 'reading-panel',
      requirements: 'requirements-panel',
      planning: 'planning-panel',
      chapters: 'writing-panel',
      review: 'review-panel',
      export: 'delivery-panel',
    };
    for (const [section, panel] of Object.entries(panels)) {
      if (get(panel)) get(panel).hidden = section !== stage.id;
    }
  };
  runtime.onStage((section) => {
    document.body.classList.add('host-navigation');
    show(section);
  });
  const project = await runtime.request('GET', '/project');
  if (!project.ok) throw new DocumentError(project);
  const session = new DraftSession(runtime);
  const workflow = new WorkflowRecords(
    runtime,
    (items) => runtime.publishNavigation(items),
    undefined,
    report,
  );
  await workflow.load();
  await session.load();
  workflow.draft(session);
  await mountPlanning(runtime, workflow);
  await mountWriting(runtime, workflow, {
    onDraftSaved: async () => {
      await session.load();
      workflow.draft(session);
    },
  });
  const requirements = await mountRequirements(runtime, {
    onState: (matrix) => workflow.matrix(matrix),
    onAnalysisStarted: () => workflow.analysisStarted(),
  });
  await mountEvidence(runtime, { beforeStart: () => requirements.flush() });
  const reading = await mountReading(runtime);
  await mountBatchAnalysis(runtime, {
    beforeStart: () => reading.flushSelection(),
    onStarted: () => workflow.analysisStarted(),
    onJob: (job) => {
      if (!requirements.model.rows.length) {
        workflow.states.analysis = 'active';
        workflow.emit();
        void workflow.mark('analysis', false, false, job.createdAt);
      }
    },
    beforeAdopt: () => requirements.flush(),
    onAdopted: () => requirements.reload(),
  });
  await mountReview(runtime, workflow);
  await mountDelivery(runtime, workflow);
  runtime.replayNavigation();
  workflow.emit();
  return { session, workflow };
}
