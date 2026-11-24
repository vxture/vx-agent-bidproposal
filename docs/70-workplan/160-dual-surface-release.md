# Bidproposal Web and desktop release

Owner direction, 2026-11-24: one agent product, `bidproposal`, with two
surfaces. Platform integration is configuration only through existing
product onboarding and commerce pages. Do not change platform source code
or worker01 configuration. Bid's own worker02 runtime configuration is allowed.
Preserve the current platform contract.

## Current application direction - 2026-11-25

The owner confirmed one business/capability kernel and one main UI, with Web
as the primary application and a desktop package adapted for the RUYIN runtime.
Reuse the existing desktop implementation for this reverse migration; future
development proceeds from shared Web application to desktop packaging. The
product definition records the continuing boundary in
`../20-specs/10-product-definition.md`.

The independently designed Web editor in PR #15 was rejected and the PR is
closed, unmerged. The owner authorized removing the rejected pages on
2026-11-25; its local/remote branch and preview launchers have been removed.
It was not
released, its domain DDL was not applied, and it must not be used as the next
deployment plan. The production baseline remains v0.1.4 / 7aa548b. Start the
corrected implementation from that merged baseline, preserving the existing
dirty desktop candidate checkout.

Cross-environment cloud synchronization is reserved, not implemented in this
release, and must not appear in any public UI or copy. Browser/server project
persistence and desktop-local persistence do not synchronize with each other.
Do not create sync routes, tables, background jobs or disabled entry points.

## Corrected batches - 2026-11-25

The owner identified the missing desktop host chrome in the B6.1 Web preview.
Do not replace it with another invented navigation or editor. The complete
baseline is [50-desktop-baseline.md](../40-implementation/50-desktop-baseline.md).

| Batch | Scope | Acceptance / current state |
| --- | --- | --- |
| B6.2 | Freeze the complete desktop baseline and remove rejected Web presentation | Source/feature/evidence inventory complete locally: 161 source hashes, eight historical evidence hashes, original sidebar screenshot and D01-D14 page/control inventory. Original development checkouts preserved. Remove horizontal navigation, its build entry and rejected editor refs/preview launchers. No new UI. |
| B6.3 | Verify runtime differences and migration boundaries | Verification complete; integration gates remain open. Published schema 0.1.0 rejects Bid contract 0.2, core lacks projectDocuments; 26 identity tests pass. Isolated Linux reads MD/DOCX/PDF with matching hashes. LibreOffice conversion fails fidelity: six pages become four and TOC field codes leak. Storage/jobs/review boundaries and runtime-specific recovery recorded in the preflight. No adapter or production change. |
| B6.4 | Reuse the complete product application presentation | Dependency/scoping analysis started; implementation not started. RUYIN host UI has no published reusable package. Establish a supported shared-component boundary first, then preserve desktop project/home/library/settings, six-step sidebar, state/times/duration/progress and human review. No replacement editor/navigation or private cross-repo app imports. |
| B6.5 | Adapt Web identity, projects and data | Verified Bid identity and workspace checks on every operation, project lifecycle, revision conflicts, upload/version persistence and reload recovery. No new simplified proposal content model. Not started. |
| B6.6 | Adapt reading and agent jobs | Same task definitions, input snapshots, verification, candidate adoption and recovery; actual Bid-owned provider calls, no RUYIN execution grant. Not started. |
| B6.7 | Deliver preview and actual output files | Confirm server layout route first; then verify template, TOC, headers, pages and MD/DOCX/PDF downloads with retained versions. Not started. |
| B6.8 | Verify product plan rules and feature gaps | Same product entitlement/usage for both surfaces; enforce configured limits/defaults. Track independent comparison, storage and proposal limits explicitly. Not started. |
| B6.9 | Accept production desktop integration and package | Own-product identity, shared-source desktop regression, signing/trust, install/update and old-project protection using current artifacts. Not started. |
| B6.10 | Accept and release each surface | Complete login/workspace/project/material/generation/review/export/logout/recovery chain per surface before its reviewed release. No automatic Store change. Not started. |

Batch completion is scoped. B6.1 is source extraction, not complete Web
migration; historical local acceptance is not current production acceptance.

### B6.3 verification result - 2026-11-25

See [runtime adaptation preflight](../40-implementation/60-runtime-adaptation-preflight.md)
and its machine-readable evidence. Package compatibility was executed against
the actual published artifacts, not inferred from manifest versions. Own-product
identity tests passed. The same locked source reader processed one Markdown
block, 47 DOCX blocks/two tables and six PDF pages/two tables in an offline,
non-root, read-only, resource-limited Linux test container on worker02.

An independent synthetic Word DOCX conversion produced a four-page PDF versus
the six-page Word reference; font substitution and visible TOC/HYPERLINK/PAGEREF
field code make this unsuitable for release. It is not full template-pipeline
acceptance. No production service, environment, database, credential, platform
source or worker01 configuration was changed.

B6.4 must first resolve the missing public host-UI reuse boundary and the
unpublished 0.2.0 package dependency. Product-native desktop identity and the
server layout engine remain explicit later acceptance gates. Preserve the
complete original UI; do not substitute a second product app while those
dependencies are unresolved.

### Rejected presentation cleanup and B6.2 local result

The horizontal navigation renderer and Web preview builder/CSS were removed.
The retained draft transport requires an explicit presentation callback and
forwards state/start/end data unchanged. It does not invent a replacement UI.
The shared business pages, task definitions and desktop adapter remain.

The rejected PR #15 was never merged or released. Its dedicated branches and
both preview launch scripts are gone, the preview process/tab is closed, and
the generated page entries in the active source checkout were removed.
Recursive deletion of old generated directories was rejected by automatic
approval with only "blocked by policy"; inactive dependency/build caches remain.
No bypass, production change, platform change or original project deletion
was performed.

The baseline distinguishes actual local implementation, recorded synthetic
acceptance and incomplete production delivery. Original P9 full-flow evidence
belongs to 1.16.3; current 1.17.2 has unit/transport/package checks and still
requires current full desktop/installation acceptance.

## Current checkpoint - 2026-11-24

### B6.1 shared-source local acceptance - 2026-11-25

The six existing business panels and their models now reside in the shared
workbench package. Desktop code contains only the existing postMessage bridge,
origin-checked environment adapter and package assembly. Web supplies a
same-origin cookie transport and six-stage navigation using the same panels.
Task definitions/prompts were lifted from the candidate build into one shared
builder without rewriting their content. The expanded public contract and
live entry are not enabled by this extraction.

Local tests cover the original business behavior, buffered navigation,
parent/origin checks, revision-conflict responses, abort on disposal, bounded
same-origin paths and issued download tickets. A byte comparison of the old
and new packaged YAML found only the expected UI digest difference. Shared
application assets match across output collectors; no test fixture is packaged.

Browser acceptance with a separate synthetic server opened all six pages,
saved and confirmed an evidence-backed manual requirement, then reloaded and
restored that same requirement. No provider was called. The new Web server
facilities, production project persistence and actual background execution
remain the next batch. Cross-environment syncing is absent. The existing
dirty desktop candidate checkout, platform source and production were not
changed. The build currently emits an unsigned desktop package only.

Validation: 275 existing product tests plus 102 shared/application-adapter
tests and three desktop transport tests passed (380 total). Workspace type
checks, product guardrails, both UI builds, the unsigned package build and
the production-shaped Next standalone build/start smoke passed. The standard
pnpm-linked Windows checkout cannot create the standalone trace symlinks;
the same locked source passed in an isolated hoisted-dependency directory.
No dependency or configuration change was made to bypass that host limitation.

The first remote quality analysis exposed inherited minified-source warnings.
Normalize module formatting and Error construction, retain sequential dependent
operations, replace trailing-fence backtracking with bounded suffix matching,
and parse chapter headers without scanning the full body in a regular expression.
Build outputs are fixed to each package's dist directory, not CLI-supplied write
targets. Modern Chromium beforeunload uses preventDefault without deprecated
returnValue. Clarification reads freshly verified rows instead of overwriting
an unused caller argument. Review/CI acceptance is still required after fixes.

This checkpoint supersedes the historical prerequisites recorded below.

- Product API `v0.1.0`, commit `cdafcc002e1de9be9f9555d03e0396612ddc94f9`,
  is deployed on worker02 through the protected product workflow. The pinned
  `db-init` workflow applied the existing baseline and three increments.
  The app connects as `bidproposal_svc`, without superuser/create-db/create-role
  privileges. Redis, database access, contract, anonymous refusal, template
  exclusion and signature/tamper checks passed on the product host.
- Opera has the enabled confidential Bid client, exact HTTPS callbacks, PKCE,
  back-channel logout and Webhook signing. Upstream registration is saved.
  The owner granted Bid the current 12 Atlas routes and 879 Runos capabilities
  with read risk ceiling; no RUYIN provider execution permission was added.
- Starter, Pro, Business and Enterprise v1 are published and public. Enterprise
  remains contact-sales with no checkout price rows. Free v1 is draft. Annual
  Starter/Pro/Business prices equal ten monthly payments. The product exposes
  platform plan limits but proposal/comparison business accounting is unfinished.
- `bidproposal.ruyin.work` resolves to the shared edge. Its existing wildcard
  is configured, but the generated live map still lacks Bid. The established
  platform `sync-product-edge` workflow previously served CoSpace; saving the
  Opera record does not automatically run it. The owner continues to prohibit
  worker01 configuration changes, including indirect execution of that workflow.
  No custom edge script or product-specific vhost is to be installed.
- Public HTTPS, real login/C2/assignment, full-logout behavior and an actual
  signed lifecycle delivery remain unverified. No fake subscription, usage or
  lifecycle event may be used to mark those checks complete.
- The Web front door is a developing preview. Desktop 1.17.2 is a local unsigned
  candidate with 99 passing tests; released-host compatibility and signing remain
  pending. Neither package readiness nor API liveness proves a complete business
  application. Ports were assigned by the owner; the unique external registry
  still needs its original account-verification block resolved.

## Product readiness follow-up

Add the standard optional `GET /api/ready` from platform standard 025, separate
from the unchanged dependency-free `/api/health`. It reports fixed check status
words plus shared build identity, with no private endpoints, credentials,
customer records or raw errors. Readiness validates runtime configuration,
the service-role connection and provisioning tables, and Redis PING. It does
not mint tokens, spend credits, send deliveries or claim that upstream grants
and real-user flows have passed. The product deployment verifier must require
both liveness and readiness before reporting success or pruning old images.
Rollback uses the deployment script from the checked-out target revision, so
the readiness requirement cannot incorrectly reject a restored pre-readiness
image. It does not replace the installed current-release deployment script.

This follow-up is local product work. It does not activate public routing,
change platform configuration or replace the remaining real-account acceptance.

| Batch | Scope | Acceptance |
| --- | --- | --- |
| B1: product API | Product-owned identity and C2 read, publishable standalone build, webhook entry, production-safe Web entry | Build from reviewed source; run the standalone artifact and probe public, protected, and unavailable paths. Leave subscription sales off. |
| B2: API release | Existing product workflow and approved product/domain registration | Deployed service identity and contract verified over HTTPS; no template demo in production. Configuration gaps that need server-variable changes stop the release. |
| B3: two deliverables | Web workspace and independent signed RUYIN package | Same product code, different build outputs and interaction. Both may ship different features. Do not publish the desktop artifact from the RUYIN installer release. |
| B4: subscription pilot | Existing Opera/Admin/Console configuration and one real workspace | Publish one product plan; verify login, shared entitlement, quota and usage, revocation, and no duplicate counting. |

## Product and platform boundaries

- The platform owns product plans, subscriptions, entitlements, quotas, and
  usage. The commercial scope is the existing workspace plus product, with
  no Web or desktop dimension. A surface may display a subset.
- Web uses the product's own Accounts RP. RUYIN uses its Workbench session
  for identity and entitlement summaries. Desktop business cloud calls
  require an approved product authentication path; they cannot reuse a
  Workbench session handle as a product bearer or grant Atlas/Runos to RUYIN.
- The product backend owns Bid business operations. Atlas meters its own
  inference once against the calling product. If Bid needs a separate
  product metric, register it through the existing catalog and use the
  existing C3 path from the product backend, for both surfaces. The template
  sample game and debug chat are not product usage producers.
- Web deployment, desktop package signing, and commerce activation are
  separate releases. No new data-sync behavior is implied by sharing
  subscription data.

## B1 local scope

Reuse the existing product C2 token exchange for Web access and capability
authorization. Keep the existing access/entitlement response shapes. A C2
outage must not become an offer to subscribe. Keep the existing public
contract and health paths, make the contract trace explicit, and keep the
template and diagnostics unavailable to visitors on deployed stages. The
first Web entry identifies the product and its preview state; real browser
project workflows follow separately. Use synthetic dependencies to verify the
local artifact; do not deploy or change configuration as part of this batch.

## CoSpace reference

Reviewed [CoSpace main at d8197eb](https://github.com/vxture/vxture-cospace/tree/d8197eb52344c19ede687e2823ca7b96b0eacb27).
Reuse its product-owned OBO C2 read, separate user-bound product assignment,
and reviewed-main release tag gate. The two platform decisions are distinct:
workspace coverage comes from C2, and assignment from the existing
`/platform/product-access`. An unavailable decision is not a denial or an
offer to subscribe. Neither Web nor the product capability endpoints use the
template's shared credential.

For platform configuration, use CoSpace's observed sequence: deploy and verify
product endpoints, complete the existing Opera onboarding checks, publish one
plan in Admin, then subscribe a real pilot workspace in Console. Production
readiness and the platform's post-subscription signals are separate. Do not
fabricate usage signals or copy CoSpace's product classification, prices,
ports, secrets or environment settings. Bidproposal is an agent product.

## B1 verification

- The production-shaped Next.js standalone artifact built and ran without its
  source checkout. Smoke checks covered the product identity, contract/ETag,
  unknown product handling, removal of the public template game and debug
  paths, and anonymous access/webhook refusal.
- A loopback authority and session store drove the compiled APIs with signed
  user claims. Covered Web and capability entry, two workspaces, missing
  coverage, missing member assignment, C2/assignment outage, shared platform
  quota values, and no provider invocation before access checks. Product
  app tests: 254 passed. No live provider calls or production credentials.
- The B1 template usage flush is unavailable on deployed stages. A production
  webhook cannot acknowledge an in-memory delivery when persistence is absent.
  A separate real product-owned usage producer is deferred until a metric and
  actual operation exist; Atlas inference is not counted twice.
- Production deployment remains gated: the product GitHub repository does
  not yet show a production Environment, and the candidate domain has not
  passed public HTTPS acceptance. Do not push a release tag until the existing
  reviewed deployment path is available. No live registration or server
  configuration has been changed by B1.

## B2 contract check

Rechecked the [Product Integration Rules](https://claude.ai/code/artifact/20e37039-ea59-4c5d-9fab-ba3ca3ad54f0)
and [Product Integration Template](https://claude.ai/code/artifact/f0bd83c7-6296-4200-a7d8-108b7755f584).
The product now uses the registerable `POST /api/webhooks/vxture` path and
sends users to public product pricing, before checkout. The webhook verifies
raw bytes, accepts versionless invalidations without advancing the lifecycle
sequence, and commits lifecycle state and receipt in one database
transaction. Live callback storage and provisioning delivery still need a
production-shaped product database and an operator test delivery. Startup and
periodic reconciliation must be verified before relying on provisioning
events to initialize business data.

Local evidence: 256 product tests and the standalone release smoke passed.
The compiled webhook ran against a disposable PostgreSQL-compatible PGlite
database with the product DDL. Replays and stale events were harmless;
an injected sequence-write failure rolled back both the lifecycle update and
the receipt, and the same signed delivery could be retried successfully.

## B2 production entry

- Confirmed origin: `https://bidproposal.ruyin.work`; DNS and wildcard TLS
  work. Opera has saved the domain on the existing Bid record. There is no
  upstream configured yet, so the shared edge has no Bid endpoint to serve.
- The owner selected the production port and a reserved beta port. The source
  is prepared for the selected production port; update the authoritative port
  registry before changing the live runtime or edge route. Do not install the
  old edge example.
- Opera verified the existing agent record. The formal OIDC client is missing;
  the webhook registration check could not read its configuration. Bid holds all
  12 current Atlas routes and all 879 current Runos capabilities (read limit,
  zero failed grants). The point-in-time grants do not include later resources
  and belong to Bid rather than the RUYIN host.
- Confirm the approved target and existing runtime configuration before tagging
  a release. Reuse the existing protected GitHub production Environment and
  shared Opera edge routing. Verify HTTPS health, the contract and a signed
  webhook delivery before opening a pilot plan and workspace.

## B3 desktop candidate

- The 1.17.2 desktop source has been replayed onto the reviewed API main tree.
  The combined lockfile installed frozen, 99 desktop tests passed, and the
  rebuilt unsigned package matched the previous SHA-256 byte for byte.
- The regular RUYIN checkout's packer rejected the project-document contract.
  The rebuild used the delivery-readiness packer. Verify the released host
  accepts the contract before signing and advertising desktop availability.

## B4 product integration readiness, 2026-11-24

The product API and entry/status pages are deployed as v0.1.2. Public routing,
Accounts login, product-scoped OBO C2 reads and unentitled refusal passed. The
product remains developing in the catalog; this is not full Web business or
signed desktop release acceptance. Opera's implementation checks for S2S,
entitlement gating and the persistent signed webhook receiver were confirmed
from code and recorded tests. Actual subscription/assignment/provider usage
and logout propagation remain separate acceptance steps.

The remaining C3 sender still used the inherited shared internal password.
Replace only that outbound transport with the product's own service-mode S2S
ticket for each queued workspace. Preserve the usage envelope, idempotency key,
end-user attribution, HTTP-200 gated/replay handling and persistent retry queue.
Enable the existing job endpoint behind its existing internal job credential,
requiring a persistent database in deployed stages. No new metric or simulated
production usage is emitted. Atlas remains the sole reporter of model usage;
product events must come from real completed Bid business operations. The
template game/chat cannot produce usage in deployed stages.

Local verification passed 274 product tests, type checking, six guardrails, the standalone build and product release smoke. A compiled standalone run against a disposable PostgreSQL-compatible database with the real driver and product service-role grants verified workspace-bound S2S, durable retry after 503, gated-200 acceptance and idempotent replay after a local commit failure. No production credentials or usage were used. The worker02 read-only preflight found the existing job credential configured and zero pending rows.

Coverage includes exact HTTP headers/body, workspace-specific token
minting, duplicate/gated/retry semantics, missing job authorization and absent
durable storage. Production enablement follows the existing reviewed release
workflow, with no platform source or worker01 configuration change.

## B5 live Starter pilot and MCP resource correction, 2026-11-24

The owner approved the public beta setting and completed Starter monthly in
Ruyin Studio/default workspace. Console shows active, one assigned seat,
2026-11-24 through 2026-12-24, with automatic renewal disabled. Free remains a
draft. The API/entry release is v0.1.3 (301c6b83); the full Web business
workspace and signed desktop package are still separate deliverables.

The product reads active Starter coverage and both product/data gates pass.
The persistent receiver processed tenant.provisioned and subscription_changed.
The worker02 deployment retained the database/Redis instances and existing
credentials. Its authorized flush returned an empty durable queue; anonymous
and wrong-credential requests returned 403. No sample counter usage was added.

A real service-mode integration generation using synthetic public material
returned 175 tokens under bidproposal. The platform raw token ledger contains
request 10ffcb8c-1215-4cba-ba74-9c5abb88c1bb and 16,733 micro-credits. Opera's
C3 check currently reads only metering.usage_events, so it does not recognize
this sub-credit fact. The two legacy-auth observations came from Atlas's own
platform reporter; Bid's current C2/C3 use its product S2S identity. Do not
report the same model tokens again or claim this observation gate is green.

The live skill catalog exposed four duplicate names. Bid's own worker02
RUNOS_SKILL_BINDINGS now chooses anthropics.webapp-testing,
github.generate-image, microsoft.microsoft-docs and lackeyjb.playwright-skill.
A restricted backup preceded that one-key configuration update; only the Bid
app was recreated. The complete current catalog returns 873 unique skill names
from 877 records. This does not change platform grants.

A real PDF skill fetch then exposed a Bid parser error: MCP embedded resource
blocks have nested resource fields, while the inherited adapter expected flat
fields. Update only the Runos content-block type, package reader and relay
tests. Normalize nested resources into the desktop contract and verify the
complete canonical package digest; keep rejecting tampering, cross-package
paths, duplicate resources, malformed blocks and unknown formats. Even legacy
packages without delivery metadata must not silently lose invalid resources.
The candidate parser verified openai.pdf 1.0.1 against live Runos: 2,517 content
characters, two resources, verified skill-package-v1 digest. Local validation:
275 tests, type checking and the standalone build passed. No Runos/platform
source or server configuration is changed for this correction.
