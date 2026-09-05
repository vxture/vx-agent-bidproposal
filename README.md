# vx-agent-bidproposal

**bidproposal**（标书编写）是 Ruyin 的首个业务产品。本仓是它的**云端能力面**：Ruyin（桌面
本地运行环境）是零秘密的 public client，替用户换票、调 Atlas 与 Runos 的是这里
（vxture-ruyin ADR-009 / ADR-020）。它同时是 **Runos 的第一个消费者**（本仓 ADR-001，
vxture-foundation/vxture-runos#14）。

能力面的四个端点（规格：`docs/20-specs/30-capability-surface.md`，实现：
`portals/app/app/capability/`、`portals/app/app/api/products/[product]/`）：

| 端点 | 作用 |
|---|---|
| `GET /api/products/{product}/contract` | `ruyin.product.yaml` 原文，Ruyin 据此更新契约 |
| `POST /api/products/{product}/capabilities/{id}/turn` | Ruyin Harness 循环的一个回合：事实进、`tool_calls | content | verdict` 出 |
| `GET /api/products/{product}/skills` | Runos 分发给本产品的技能目录（转交，不执行） |
| `GET /api/products/{product}/skills/{name}` | 一条技能的 `SKILL.md` + 资源 + 摘要 |

仓从 `vxture/vx-agent-vxtpl@fabef44` 复制并 `rename-product.mjs bidproposal` 而来：范本的
三通道（C1 / C2 / C3）、守卫、CI 与发布链原样保留，下面的说明仍然成立；范本的示例
产品界面（挑战游戏）暂留作示例区，与能力面无关。

It signs users in against the central accounts service (C1), gates them by
subscription tier (C2), receives provisioning webhooks (C3), calls **Atlas** for
model inference, and calls **Runos** for capability execution - with the same
governance base, deploy chain, and CI gates any Vxture product is held to.

**Package manager:** pnpm (whole-stack, owner-decided 2026-07-20). Do not
reintroduce npm workspaces.

---

## What you get

| Surface | What it demonstrates |
|---------|----------------------|
| `/` | THE app - a fullscreen command deck: seeded runs (daily quota spent server-side at start, scores recorded within server bounds), the tier-windowed record with pro's 30-day trend, and the anonymous global board, all as collapsible side-rail modules around the arena |
| `/gate` | The product front door: verifies access on entry, redirects a signed-in visitor straight through, and otherwise shows the one action that helps |
| `/chat` | Debug/reference: a tier-gated chat turn that mints a short-lived S2S token, calls Atlas, optionally invokes a Runos capability, and meters its own usage |
| `/status` | Debug/reference: every integration channel's live configuration state, with no secret ever leaving the server |
| `/platform-check` | Debug/reference: read-only connectivity probes against Atlas and Runos |
| `/entitlement-matrix` | Debug/reference: every tier x status combination and the gate/CTA outcome it produces, fully offline |

Under those surfaces sit the parts a product repo is actually judged on: the OIDC
relying-party flow (PKCE, single-use state, back-channel logout), the entitlement
resolver with its cache-invalidation discipline, the HMAC-verified provisioning
webhook with idempotency and sequence ordering, the usage buffer/flush pipeline,
a least-privilege database with column-level write locks, and a tag-to-production
deploy chain with a required-reviewer gate.

Authority for the design lives in the platform repo, not here:

- Governance (WHAT): `140-repo-governance-standard.md`
- Product-repo design: `product_240_repo-template.md`
- Self-rectify runbook (HOW + per-step machine checks): `20-self-rectify-runbook.md`
- Docs numbering: `070-docs-taxonomy.md`

This repo carries thin indices under `docs/10-standards/` that point at those org
standards rather than copying their text.

---

## Running it locally

```bash
pnpm install
cp .env.example .env       # then fill in what you need
pnpm dev                   # http://localhost:4000
```

A `NODE_AUTH_TOKEN` with read access to GitHub Packages must be set so
`pnpm install` can resolve the `@vxture` scope (see root `.npmrc`).

With an empty `.env` everything still runs: entitlement and chat fall back to
offline mock resolvers, and chat resolves against a local dev workspace instead
of requiring sign-in, so the whole UI is explorable with no credentials. Set
`MOCK_TIER=pro` (or any tier) to see the entitlement gating actually bite.

Those affordances are **local-dev and CI only**. Both are keyed on
`DEPLOY_STAGE`, which the image always sets: on `production` or `beta` the mock
resolvers refuse to start and chat requires a real session, so a deployed stack
can never silently serve mock entitlements or resolve a workspace nobody owns.
`.env.example` documents every variable, which ones a real Atlas or Runos call
needs, and where each secret is procured.

Gates, the same ones CI runs:

```bash
pnpm type-check:all
pnpm test
pnpm lint:docs-numbering
pnpm lint:data-design
```

---

## Creating a new product from bidproposal

```bash
git clone https://github.com/vxture/vxture-bidproposal.git vxture-<code>
cd vxture-<code>
node scripts/init/rename-product.mjs <code>        # --dry-run to preview
```

The rename script rewrites the whole name cascade - OIDC clients, compose project
and containers, image name, database and service role, workspace package scope,
secret names, the public vhost - in file contents *and* in file and directory
names, then reports what a human still has to do. It is pure Node with zero
dependencies. See `docs/40-implementation/20-creating-a-product-from-bidproposal.md`
for the full procedure, and the two checklists in `docs/50-deployment/`:

1. Platform-side registration (owner / platform-line actions)
2. GitHub bootstrap (create public repo, enable secret scanning + push
   protection, first-push main, run CI once, apply the ruleset - in that order)

---

## Working agreement

See [CLAUDE.md](CLAUDE.md) for the full repository working agreement: branch
model, tag-triggered release flow, the five required CI checks, secret hygiene,
SCA policy, docs taxonomy, and the rigid-zone / exemplar-zone boundary that says
which parts of bidproposal a copy is expected to replace.
