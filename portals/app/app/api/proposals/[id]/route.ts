/**
 * @package @bidproposal/app
 * @layer Application
 * @category Proposals
 * @author AI-Generated
 * @date 2026-11-25
 */
import { handleProposal } from "../../../proposals/http";
export const dynamic = "force-dynamic";
type Context = { params: Promise<{ id: string }> };
export const GET = async (request: Request, context: Context) => handleProposal(request, (await context.params).id);
export const PUT = async (request: Request, context: Context) => handleProposal(request, (await context.params).id);
