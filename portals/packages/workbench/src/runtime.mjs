/**
 * @package @bidproposal/workbench
 * @layer Presentation
 * @category Runtime
 * @author AI-Generated
 * @date 2026-11-25
 */
import { STAGES } from './workflow.mjs';
export { DocumentError } from './errors.mjs';

/** Buffer selection while the shared panels mount asynchronously. */
export class StageNavigation {
  constructor() {
    this.current = undefined;
    this.listeners = new Set();
  }

  subscribe(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  select(section) {
    if (!STAGES.some((stage) => stage.id === section)) return false;
    this.current = section;
    this.replay();
    return true;
  }

  replay() {
    if (this.current === undefined) return;
    for (const listener of this.listeners) listener(this.current);
  }

  close() {
    this.listeners.clear();
  }
}
