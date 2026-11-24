/**
 * @package @bidproposal/workbench
 * @layer Presentation
 * @category Bootstrap
 * @author AI-Generated
 * @date 2026-11-25
 */
import { createRuntime } from './environment.mjs';
import { mountWorkbench, mountLibrary } from './index.mjs';

try {
  const runtime = createRuntime();
  // Keep transport available to panel autosave handlers during pagehide.
  const library = document.getElementById('library-root');
  if (library) await mountLibrary(runtime, library);
  else await mountWorkbench(runtime);
} catch (error) {
  const target = document.getElementById('error') || document.getElementById('library-root');
  target.textContent = error.message;
  target.hidden = false;
}
