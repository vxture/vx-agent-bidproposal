-- Business-face DB baseline (product_240 section 2.4, data_platform_100 section
-- 2.3.1). Single DDL authority - hand-written, create-once (never ALTER an
-- existing table here; structure changes ship as numbered incr/ increments via
-- db-init). Three contract schemas ship from the factory; N domain schemas are a
-- product blank zone (must not use the reserved contract-schema names).
--
-- Naming (data_platform_100 section 3.2): uuid PK gen_random_uuid(); TIMESTAMPTZ
-- created_at/updated_at/deleted_at; status VARCHAR(32)+CHECK (never PG ENUM);
-- idx_/uidx_/fk_/chk_ prefixes. Anchor columns (id, *_no, created_at) are
-- immutable - locked in 98_column_locks.sql.
--
-- Product-side rows hold only platform REFERENCE keys (workspace_id/tenant_id/
-- sub); they are platform-issued, never product-declared, and are NOT a mirror
-- of the platform's four-layer identity model (data_platform_100 section 2.3.2).

CREATE EXTENSION IF NOT EXISTS pgcrypto; -- gen_random_uuid()

-- ===========================================================================
-- vx_provision  (platform-driven provisioning + inbound webhook event log)
-- ===========================================================================
CREATE SCHEMA IF NOT EXISTS vx_provision;

CREATE TABLE IF NOT EXISTS vx_provision.app_instance (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id   UUID NOT NULL,                       -- [ref] authoritative isolation key
  tenant_id      UUID,                                -- [ref] rollup only
  product_code   VARCHAR(32) NOT NULL,                -- [ref]
  status         VARCHAR(32) NOT NULL DEFAULT 'pending'
                   CONSTRAINT chk_app_instance_status
                   CHECK (status IN ('pending', 'provisioned', 'deprovisioned')),
  env            VARCHAR(32) NOT NULL DEFAULT 'prod'
                   CONSTRAINT chk_app_instance_env CHECK (env IN ('beta', 'prod')),
  provisioned_at TIMESTAMPTZ,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uidx_app_instance_ws_product UNIQUE (workspace_id, product_code)
);

-- Inbound webhook idempotency ledger (append-only; delivery_id = payload.id).
CREATE TABLE IF NOT EXISTS vx_provision.webhook_delivery (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  delivery_id  VARCHAR(128) NOT NULL,                 -- [ref] = payload.id / X-Vxture-Delivery
  type         VARCHAR(64) NOT NULL,
  occurred_at  TIMESTAMPTZ,
  result       VARCHAR(32) NOT NULL DEFAULT 'processed'
                 CONSTRAINT chk_webhook_delivery_result
                 CHECK (result IN ('processed', 'duplicate', 'stale', 'ignored')),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uidx_webhook_delivery_delivery_id UNIQUE (delivery_id)
);

-- Per (workspace_id, product_code) processed-seq watermark (drop stale/reordered).
CREATE TABLE IF NOT EXISTS vx_provision.provision_seq (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL,                         -- [ref]
  product_code VARCHAR(32) NOT NULL,                  -- [ref]
  last_seq     BIGINT NOT NULL DEFAULT 0,             -- [ref] = payload.seq
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uidx_provision_seq_ws_product UNIQUE (workspace_id, product_code)
);

-- ===========================================================================
-- local_authz  (product members + function roles; product-owned, NOT a mirror
-- of the platform governance role catalog access.roles)
-- ===========================================================================
CREATE SCHEMA IF NOT EXISTS local_authz;

-- Lazy subset: upserted on first login sighting of (workspace_id, sub). This is
-- NOT the full/real-time mirror of tenancy.workspace_memberships.
CREATE TABLE IF NOT EXISTS local_authz.member (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id   UUID NOT NULL,                       -- [ref]
  sub            VARCHAR(128) NOT NULL,               -- [ref] full "usr_<uuid>"
  display_name   VARCHAR(255),                        -- platform cache (may go stale)
  avatar_hash    VARCHAR(128),                        -- platform cache
  status         VARCHAR(32) NOT NULL DEFAULT 'active'
                   CONSTRAINT chk_member_status CHECK (status IN ('active', 'inactive')),
  first_seen_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uidx_member_ws_sub UNIQUE (workspace_id, sub)
);

-- Product function-role catalog (product seed; e.g. reviewer/editor). This is
-- NOT the platform governance role domain (owner/manager/member/readonly/guest).
CREATE TABLE IF NOT EXISTS local_authz.role (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role_code   VARCHAR(64) NOT NULL,
  name        VARCHAR(255) NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uidx_role_role_code UNIQUE (role_code)
);

CREATE TABLE IF NOT EXISTS local_authz.permission (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  perm_code   VARCHAR(64) NOT NULL,
  name        VARCHAR(255) NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uidx_permission_perm_code UNIQUE (perm_code)
);

CREATE TABLE IF NOT EXISTS local_authz.member_role (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id   UUID NOT NULL,
  role_id     UUID NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT fk_member_role_member FOREIGN KEY (member_id) REFERENCES local_authz.member (id) ON DELETE CASCADE,
  CONSTRAINT fk_member_role_role FOREIGN KEY (role_id) REFERENCES local_authz.role (id) ON DELETE CASCADE,
  CONSTRAINT uidx_member_role_member_role UNIQUE (member_id, role_id)
);

CREATE TABLE IF NOT EXISTS local_authz.role_permission (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role_id        UUID NOT NULL,
  permission_id  UUID NOT NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT fk_role_permission_role FOREIGN KEY (role_id) REFERENCES local_authz.role (id) ON DELETE CASCADE,
  CONSTRAINT fk_role_permission_permission FOREIGN KEY (permission_id) REFERENCES local_authz.permission (id) ON DELETE CASCADE,
  CONSTRAINT uidx_role_permission_role_perm UNIQUE (role_id, permission_id)
);

-- ===========================================================================
-- local_usage  (local counter-usage buffer; platform metering is the SoT)
-- ===========================================================================
CREATE SCHEMA IF NOT EXISTS local_usage;

-- Only COUNTER usage is buffered here; gauge is a direct PUT, caps are counted
-- locally. idempotency_key is mandatory (defeats replay/double-count).
CREATE TABLE IF NOT EXISTS local_usage.raw (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id     UUID NOT NULL,                     -- [ref]
  metric           VARCHAR(128) NOT NULL,             -- [ref] must hit a platform metric registry key
  amount           BIGINT NOT NULL,
  idempotency_key  VARCHAR(128) NOT NULL,
  flushed          BOOLEAN NOT NULL DEFAULT false,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT chk_raw_amount CHECK (amount > 0),
  CONSTRAINT uidx_raw_idempotency_key UNIQUE (idempotency_key)
);
CREATE INDEX IF NOT EXISTS idx_raw_unflushed ON local_usage.raw (flushed) WHERE flushed = false;

-- Product-local flush watermark (no platform counterpart).
CREATE TABLE IF NOT EXISTS local_usage.checkpoint (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id  UUID NOT NULL,                        -- [ref]
  metric        VARCHAR(128) NOT NULL,
  flushed_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uidx_checkpoint_ws_metric UNIQUE (workspace_id, metric)
);
