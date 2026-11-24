/**
 * @package @bidproposal/app
 * @layer Application
 * @category Proposals
 * @author AI-Generated
 * @date 2026-11-25
 */
import { handleProposal } from "../../../../proposals/http";
export const dynamic = "force-dynamic";
export const POST = async (request: Request, context: { params: Promise<{ id: string }> }) => handleProposal(request, (await context.params).id, "assist");
