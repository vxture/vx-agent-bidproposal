# Agent entry point

Start here if you are an AI agent working in this repo.

## What this repo is

Current checkpoint, 2026-11-25: the complete shared Web workbench is live at
https://bidproposal.ruyin.work/, v0.2.3 / 80bd95f5 (PR #24). Its durable encrypted
projects, uploaded originals, versioned library and background jobs survived the
v0.2.0 upgrade. Real own-product generation and source verification produced 15
source-matched requirements; human confirmation and the two-chapter planning
checkpoint passed. Actual chapters, review, rewrite, history and three-format
downloads passed. Actual V3 production output passed all six pages: populated
contents, cover without furniture, and correct headers/page fields on pages 2-6.
V1/V2 were retained. Real C2 storage uses a shared gauge pool. The next candidate
reads its remaining capacity, reconciles actual retained bytes through C3 gauge,
persists retry/acknowledgment in the existing encrypted library, and rechecks
the original session/C2 before export retention. It does not provide atomic
cross-product storage reservation. Release/live gauge acceptance remain pending.
Published RUYIN UI/Node adapters 0.2.2 are consumed from the registry. The package
and layout prerequisites described below were historical B6.3 observations;
they no longer block Web delivery. Desktop product identity/signing and the
independent comparison/OCR gaps remain explicit gates. Never substitute a
Workbench token for Bid identity. Keep original dirty checkouts and project data.
Read the current release tracker first; older template and milestone statements
below must not be treated as present production state.

This is `bidproposal`, the platform product code of 标书方案智能体 (Proposal
Writing Agent). The repo is that product's **cloud capability surface** for the
RUYIN desktop runtime (ADR-001 of this repo; vxture-ruyin ADR-009 / ADR-020):
four endpoints under `portals/app/app/api/products/[product]/`. It was copied
from the `vx-agent-vxtpl` template on 2026-09-05 and renamed. Initial API
release `v0.1.0` is deployed on worker02, with Bid's own product client and
signing configuration. Public routing and real-user acceptance remain pending;
the Web workspace and signed desktop release are not complete. Read
`docs/70-workplan/160-dual-surface-release.md` for the current checkpoint.
Template text about `bidproposal.vxture.com` is historical, not a live endpoint.
The owner forbids platform source and worker01 configuration changes. Product
operations may use Bid's own worker02 configuration only.

Current direction (2026-11-25): reverse-migrate the complete existing desktop
application, including RUYIN-provided project/workflow/timing/review chrome.
Read `docs/40-implementation/50-desktop-baseline.md` before Web work. The
independently designed editor and horizontal navigation preview were rejected
and removed. Do not treat the shared product iframe pages as the entire app.
Cloud synchronization is reserved, with no implementation or public UI now.

B6.3 runtime checks are in `docs/40-implementation/60-runtime-adaptation-preflight.md`.
The published 0.1.0 schema rejects Bid's current 0.2 contract; the published core
lacks projectDocuments. RUYIN host UI is not a public package. Do not import its
private apps across repositories or implement another replacement UI. Linux
offline reading passed with the same locked parser; plain LibreOffice conversion
failed fidelity (six Word pages became four, with visible TOC field code).
Own-product identity tests pass, but Workbench credentials are not Bid identity
and the desktop handoff remains unfinished. Verification is complete; these
integration dependencies remain open. Production is still API/entry v0.1.4.
Remote RUYIN main also has 0.2.0 manifests but lacks projectDocuments,
project_document and the original workflow sidebar. Do not publish that main
as a solution without reconciling the fixed original delivery baseline first.

B6.4.1 follow-up resolves the package/build dependency: RUYIN PR #312/#313
reconciled the required ports and public CLI entry, exact main checks passed,
and packages-v0.2.0 published all four packages. Bid now pins the registry CLI
and builds without a RUYIN source checkout. Real package bytes match the
original 1.17.2 baseline; CI verifies double-build reproducibility. The full
host UI public boundary and actual Web runtime/desktop identity/layout remain
unfinished. See section 8 of the runtime preflight for current status; earlier
0.1.0-only observations are historical evidence, not the current registry.


Three things follow that will save you a wrong assumption:

- **There are no placeholders.** Every name is the literal `bidproposal` value that runs
  in production. If you find a `__SOMETHING__` token outside `docs/80-liaison/`
  (frozen historical letters), it is a bug - and CI will say so:
  `scripts/guardrails/check-no-placeholders.mjs` runs in `static-checks`. Prose
  may still NAME a token, but only as inline code, which is how ADR-001 explains
  what it removed without tripping the check it argued for.
- **A new product is a copy, not an instantiation.**
  `scripts/init/rename-product.mjs <code>` rewrites the name cascade in contents
  and in path names. `instantiate.mjs` is gone; so is the build-time substitution
  step that used to run it.
- **The exemplar zone is meant to be replaced, the rigid zone is not.** The
  boundary is in `CLAUDE.md`. Filling an exemplar slot with something real is the
  point; changing a rigid mechanism because it is inconvenient is not.

## Where authority lives

Not in this repo. The governing standards are in the platform repo
(`D:\MyWebSite\vxture`): `140-repo-governance-standard.md` (WHAT),
`product_240_repo-template.md` (product-repo design), `20-self-rectify-runbook.md`
(HOW + machine checks), `070-docs-taxonomy.md` (docs numbering). When you hit a
gap not covered by an existing standard, fix the standard in the platform repo
first, then mirror it here - do not invent a standard inside a product repo.

## Working rules

- Trunk-based: feature branch -> PR -> squash-merge -> delete branch. Never push
  `main` directly.
- The five required CI checks are a stable contract: `quality-gate` / `build` /
  `test-coverage` / `audit` / `gitleaks`. Do not rename the jobs that produce them.
- Docs: numbered = formal, unnumbered = temporary. `lint:docs-numbering --strict`
  blocks unnumbered `.md`. Domain docs use `{kind}_{domain}_{NNN}_{slug}`.
- Keep source, config, and root meta files ASCII-only.
- `docs/80-liaison/` is append-only. Letters are dated records of what was sent;
  correct a superseded claim with a NEW letter, never by editing an old one.
- Product identity comes from `BRAND.productCode`, never from `OIDC_CLIENT_ID`
  (the beta client is `bidproposal-beta`; the product code stays `bidproposal`).
- See `CLAUDE.md` (repo root) for the full working agreement,
  `docs/40-implementation/10-app-workspace.md` for how the app fits together, and
  `docs/70-workplan/00-index.md` for the batch tracker.
