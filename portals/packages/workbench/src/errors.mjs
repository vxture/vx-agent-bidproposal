/**
 * @package @bidproposal/workbench
 * @layer Shared
 * @category Runtime
 * @author AI-Generated
 * @date 2026-11-25
 */
/** A rejected environment operation, preserving the original response status. */
export class DocumentError extends Error {
  constructor(reply) {
    super(reply.error?.message || 'Runtime request failed');
    this.status = reply.status;
  }
}
