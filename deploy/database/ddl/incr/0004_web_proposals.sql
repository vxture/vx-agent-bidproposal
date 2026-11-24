-- @package bidproposal
-- @layer Infrastructure
-- @category Database
-- @author AI-Generated
-- @date 2026-11-25
-- Product business drafts; workspace identity is a platform reference only.
CREATE SCHEMA IF NOT EXISTS bid_workspace;
CREATE TABLE IF NOT EXISTS bid_workspace.proposal (
  id UUID PRIMARY KEY,
  workspace_id UUID NOT NULL,
  created_by VARCHAR(128) NOT NULL,
  title VARCHAR(120) NOT NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'active'
    CONSTRAINT chk_proposal_status CHECK (status IN ('active','archived')),
  revision INTEGER NOT NULL DEFAULT 1 CONSTRAINT chk_proposal_revision CHECK (revision > 0),
  content JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ,
  CONSTRAINT chk_proposal_content_size CHECK (octet_length(content::text) <= 1200000)
);
CREATE INDEX IF NOT EXISTS idx_proposal_workspace_updated
  ON bid_workspace.proposal (workspace_id,updated_at DESC,id);
GRANT USAGE ON SCHEMA bid_workspace TO bidproposal_svc;
GRANT SELECT,INSERT ON bid_workspace.proposal TO bidproposal_svc;
REVOKE UPDATE,DELETE ON bid_workspace.proposal FROM bidproposal_svc;
GRANT UPDATE (title,status,revision,content,updated_at) ON bid_workspace.proposal TO bidproposal_svc;
