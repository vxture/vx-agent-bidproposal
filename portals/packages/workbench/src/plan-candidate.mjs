/**
 * @package @bidproposal/workbench
 * @layer Presentation
 * @category Business
 * @author AI-Generated
 * @date 2026-11-25
 */
import { PlanSession } from './plan.mjs';
import { DocumentError } from './errors.mjs';
export class PlanCandidate {
  constructor(bridge) {
    this.bridge = bridge;
    this.revision = 0;
    this.value = null;
  }
  async load() {
    const r = await this.bridge.request('GET', '/documents/bid_plan_candidate');
    if (!r.ok && r.status !== 404) throw new DocumentError(r);
    if (r.ok) {
      const value = JSON.parse(r.body.markdown);
      if (
        value !== null &&
        (typeof value !== 'object' ||
          !Number.isSafeInteger(value.planRevision) ||
          value.planRevision < 0 ||
          typeof value.content !== 'string' ||
          !value.content.trim() ||
          value.content.length > 200000)
      )
        throw new Error('Invalid saved candidate');
      this.value = value;
      this.revision = r.body.revision;
    }
  }
  async put(value) {
    const r = await this.bridge.request('PUT', '/documents/bid_plan_candidate', {
      markdown: JSON.stringify(value),
      revision: this.revision,
    });
    if (!r.ok) throw new DocumentError(r);
    this.value = value;
    this.revision = r.body.revision;
  }
  preview(plan, matrix) {
    if (!this.value) return null;
    const copy = new PlanSession(this.bridge);
    copy.value = structuredClone(plan.value);
    copy.adopt(this.value.content, matrix);
    return copy.value.outline;
  }
  async stage(content, plan, matrix, review) {
    const probe = new PlanSession(this.bridge);
    probe.value = structuredClone(plan.value);
    probe.adopt(content, matrix);
    await this.put({ content, planRevision: plan.revision, ...(review ? { review } : {}) });
  }
  async accept(plan, matrix) {
    if (plan.dirty) throw new Error('Save local edits before accepting a candidate');
    if (!this.value || this.value.planRevision !== plan.revision)
      throw new Error('Plan changed; generate a new candidate');
    const latest = new PlanSession(this.bridge);
    await latest.load();
    if (latest.revision !== plan.revision) throw new Error('Plan changed in another window');
    const previous = structuredClone(plan.value);
    try {
      plan.adopt(this.value.content, matrix);
      await plan.save();
    } catch (e) {
      plan.value = previous;
      throw e;
    }
    await this.put(null);
  }
}
