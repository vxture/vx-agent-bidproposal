/**
 * @package @bidproposal/app
 * @layer Infrastructure
 * @category Proposals
 * @author AI-Generated
 * @date 2026-11-25
 */
import { Pool } from "pg";
import { ProposalError, type Proposal, type ProposalContent, type ProposalSummary } from "./model";

export interface ProposalStore {
  list(workspace: string): Promise<ProposalSummary[]>;
  get(workspace: string, id: string): Promise<Proposal>;
  create(workspace: string, sub: string, id: string, title: string, limit: number): Promise<Proposal>;
  save(workspace: string, id: string, revision: number, title: string, content: ProposalContent, status: "active" | "archived"): Promise<Proposal>;
}
const columns = "id,title,status,revision,created_at,updated_at";
type Row = { id: string; title: string; status: "active" | "archived"; revision: number; created_at: Date; updated_at: Date; content: ProposalContent };
const summary = (row: Row): ProposalSummary => ({ id: row.id, title: row.title, status: row.status,
  revision: row.revision, createdAt: row.created_at.toISOString(), updatedAt: row.updated_at.toISOString() });
const record = (row: Row): Proposal => ({ ...summary(row), content: row.content });

export class PgProposalStore implements ProposalStore {
  constructor(private readonly pool: Pool) {}
  async list(workspace: string) {
    const result = await this.pool.query<Row>(`SELECT ${columns} FROM bid_workspace.proposal WHERE workspace_id=$1 ORDER BY updated_at DESC,id LIMIT 1001`, [workspace]);
    if (result.rows.length > 1000) throw new ProposalError(422, "PROPOSAL_LIST_REQUIRES_PAGING");
    return result.rows.map(summary);
  }
  async get(workspace: string, id: string) {
    const result = await this.pool.query<Row>(`SELECT ${columns},content FROM bid_workspace.proposal WHERE workspace_id=$1 AND id=$2`, [workspace, id]);
    if (!result.rows[0]) throw new ProposalError(404, "PROPOSAL_NOT_FOUND");
    return record(result.rows[0]);
  }
  async create(workspace: string, sub: string, id: string, title: string, limit: number) {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      // Serialize cap checks for the same workspace, including concurrent tabs.
      await client.query("SELECT pg_advisory_xact_lock(hashtextextended($1,0))", ["bid-proposal:" + workspace]);
      const prior = await client.query<Row>(`SELECT ${columns},content FROM bid_workspace.proposal WHERE workspace_id=$1 AND id=$2`, [workspace, id]);
      if (prior.rows[0]) { await client.query("COMMIT"); return record(prior.rows[0]); }
      const count = await client.query<{ count: string }>("SELECT count(*) FROM bid_workspace.proposal WHERE workspace_id=$1", [workspace]);
      // Archived proposals still count: Free retains its original single proposal.
      if (limit !== -1 && Number(count.rows[0]?.count) >= limit) throw new ProposalError(409, "PROPOSAL_LIMIT_REACHED");
      const inserted = await client.query<Row>(`INSERT INTO bid_workspace.proposal(id,workspace_id,created_by,title,content) VALUES($1,$2,$3,$4,$5) ON CONFLICT(id) DO NOTHING RETURNING ${columns},content`,
        [id, workspace, sub, title, { source: "", brief: "", chapters: [] }]);
      if (!inserted.rows[0]) throw new ProposalError(409, "PROPOSAL_ID_CONFLICT");
      await client.query("COMMIT");
      return record(inserted.rows[0]);
    } catch (error) { await client.query("ROLLBACK"); throw error; }
    finally { client.release(); }
  }
  async save(workspace: string, id: string, revision: number, title: string, content: ProposalContent, status: "active" | "archived") {
    const result = await this.pool.query<Row>(`UPDATE bid_workspace.proposal SET title=$4,content=$5,status=$6,revision=revision+1,updated_at=now() WHERE workspace_id=$1 AND id=$2 AND revision=$3 RETURNING ${columns},content`,
      [workspace, id, revision, title, content, status]);
    if (result.rows[0]) return record(result.rows[0]);
    await this.get(workspace, id);
    throw new ProposalError(409, "REVISION_CONFLICT");
  }
}

// --- Bounded process-wide pool, including separate Next route bundles --------
type ProposalGlobal = typeof globalThis & { __bidProposalStore?: ProposalStore };
export function proposalStore(): ProposalStore {
  if (!process.env.DATABASE_URL) throw new ProposalError(503, "PROPOSAL_STORE_UNAVAILABLE");
  const root = globalThis as ProposalGlobal;
  if (!root.__bidProposalStore) {
    const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 2,
      connectionTimeoutMillis: 5000, statement_timeout: 10_000, application_name: "bid-proposals" });
    pool.on("error", () => undefined);
    root.__bidProposalStore = new PgProposalStore(pool);
  }
  return root.__bidProposalStore;
}
