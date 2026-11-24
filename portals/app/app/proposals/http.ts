/**
 * @package @bidproposal/app
 * @layer Application
 * @category Proposals
 * @author AI-Generated
 * @date 2026-11-25
 */
import { randomUUID } from "node:crypto";
import { resolveCapabilityCaller, isRefusal, type CapabilityCaller } from "../capability/caller";
import { checkProductAssignment, readProductEntitlement } from "../capability/access";
import { hasDataAccess, type Entitlement } from "../entitlement/types";
import { fetchChatCompletion, getAtlasClientConfig, AtlasError } from "../chat/atlas-client";
import { S2STokenError } from "../lib/s2s-token";
import { allowChatTurn } from "../chat/rate-limit";
import { proposalStore, type ProposalStore } from "./repository";
import { ProposalError, UUID, chapterPrompt, contentOf, object, proposalLimit, revisionOf, text } from "./model";

interface Authorized { caller: CapabilityCaller; entitlement: Entitlement }
export interface ProposalDependencies {
  authorize(request: Request): Promise<Authorized>;
  store(): ProposalStore;
  generate(context: Authorized, proposal: Parameters<typeof chapterPrompt>[0], chapterId: string, instruction: string): Promise<string>;
}

// --- One identity and live product decision before any data or provider work ---

async function authorize(request: Request): Promise<Authorized> {
  const caller = await resolveCapabilityCaller(request.headers, { method: request.method });
  if (isRefusal(caller)) throw new ProposalError(caller.status, caller.code ?? (caller.status === 401 ? "SIGN_IN_REQUIRED" : "ACCESS_UNAVAILABLE"));
  // Deployed business data never accepts the identity-free local sample caller.
  if (!UUID.test(caller.workspaceId) || !caller.sub) throw new ProposalError(401, "SIGN_IN_REQUIRED");
  const entitlement = await readProductEntitlement(caller);
  if ("error" in entitlement) throw new ProposalError(503, "ENTITLEMENT_UNAVAILABLE");
  if (!hasDataAccess(entitlement)) throw new ProposalError(403, "NOT_ENTITLED");
  const assignment = await checkProductAssignment(caller);
  if (assignment) throw new ProposalError(assignment.status, assignment.code ?? "ACCESS_UNAVAILABLE");
  return { caller, entitlement };
}
async function generate(context: Authorized, proposal: Parameters<typeof chapterPrompt>[0], chapterId: string, instruction: string) {
  const cfg = getAtlasClientConfig();
  if (!cfg) throw new ProposalError(503, "MODEL_NOT_CONFIGURED");
  const messages = chapterPrompt(proposal, chapterId, instruction);
  if (!allowChatTurn("proposal:" + context.caller.workspaceId + ":" + context.caller.sub).allowed) throw new ProposalError(429, "WRITING_RATE_LIMITED");
  const completion = await fetchChatCompletion(cfg, context.caller.mint, messages, { taskId: "bid-write-" + randomUUID() });
  if (completion.message.toolCalls?.length || completion.message.content.length > 20_000) throw new ProposalError(502, "INVALID_WRITING_CANDIDATE");
  return completion.message.content;
}
const defaults: ProposalDependencies = { authorize, generate, store: proposalStore };
const reply = (value: unknown, status = 200) => Response.json(value, { status, headers: { "cache-control": "private, no-store" } });

/** Bound bytes while reading, including bodies without Content-Length. */
async function readBody(request: Request): Promise<Record<string, unknown>> {
  if (!request.headers.get("content-type")?.startsWith("application/json")) throw new ProposalError(415, "JSON_REQUIRED");
  const reader = request.body?.getReader();
  if (!reader) throw new ProposalError(400, "INVALID_INPUT");
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const item = await reader.read();
      if (item.done) break;
      size += item.value.byteLength;
      if (size > 2 * 1024 * 1024) { await reader.cancel(); throw new ProposalError(413, "DOCUMENT_TOO_LARGE"); }
      chunks.push(item.value);
    }
    return object(JSON.parse(Buffer.concat(chunks).toString("utf8")));
  } catch (error) {
    if (error instanceof ProposalError) throw error;
    throw new ProposalError(400, "INVALID_INPUT");
  } finally { reader.releaseLock(); }
}

// --- Fixed product endpoints; identifiers never select workspace identity ---

export async function handleProposal(request: Request, id?: string, operation?: "assist", deps = defaults): Promise<Response> {
  try {
    const context = await deps.authorize(request);
    const workspace = context.caller.workspaceId;
    if (id && !UUID.test(id)) throw new ProposalError(404, "PROPOSAL_NOT_FOUND");
    const store = deps.store();
    if (!id && request.method === "GET") return reply({ items: await store.list(workspace) });
    if (id && !operation && request.method === "GET") return reply(await store.get(workspace, id));
    const body = await readBody(request);
    if (!id && request.method === "POST") {
      if (typeof body.id !== "string" || !UUID.test(body.id)) throw new ProposalError(400, "INVALID_INPUT");
      const proposal = await store.create(workspace, context.caller.sub!, body.id, text(body.title, 120, true).trim(), proposalLimit(context.entitlement));
      return reply(proposal, 201);
    }
    if (id && !operation && request.method === "PUT") {
      if (body.status !== "active" && body.status !== "archived") throw new ProposalError(400, "INVALID_INPUT");
      return reply(await store.save(workspace, id, revisionOf(body.revision), text(body.title, 120, true).trim(), contentOf(body.content), body.status));
    }
    if (id && operation === "assist" && request.method === "POST") {
      const proposal = await store.get(workspace, id);
      if (proposal.revision !== revisionOf(body.revision)) throw new ProposalError(409, "REVISION_CONFLICT");
      if (proposal.status !== "active") throw new ProposalError(409, "PROPOSAL_ARCHIVED");
      const chapterId = text(body.chapterId, 36, true);
      const instruction = text(body.instruction, 2000, true);
      // Validate source scope before minting a model token or spending credits.
      chapterPrompt(proposal, chapterId, instruction);
      const markdown = await deps.generate(context, proposal, chapterId, instruction);
      return reply({ markdown, chapterId, sourceRevision: proposal.revision });
    }
    throw new ProposalError(405, "METHOD_NOT_ALLOWED");
  } catch (error) {
    if (error instanceof ProposalError) return reply({ code: error.code }, error.status);
    if (error instanceof AtlasError) return reply({ code: error.envelope.code, retryable: error.retryable }, 503);
    if (error instanceof S2STokenError) return reply({ code: "PROVIDER_AUTH_UNAVAILABLE", retryable: error.retryable }, 503);
    return reply({ code: "PROPOSAL_SERVICE_UNAVAILABLE" }, 503);
  }
}
