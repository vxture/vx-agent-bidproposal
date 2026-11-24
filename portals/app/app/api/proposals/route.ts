/**
 * @package @bidproposal/app
 * @layer Application
 * @category Proposals
 * @author AI-Generated
 * @date 2026-11-25
 */
import { handleProposal } from "../../proposals/http";
export const dynamic = "force-dynamic";
export const GET = (request: Request) => handleProposal(request);
export const POST = (request: Request) => handleProposal(request);
