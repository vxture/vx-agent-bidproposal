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

Current production checkpoint: v0.2.4 / 01908073 is deployed through the existing
protected workflow, run 45526254239. Exact image digest:
`sha256:f693a9529449c7983c38cc200fcd4c80789b3d9b25ed961a5634bcf518bf5af6`.
Health/readiness pass, anonymous runtime access returns 401, and original DB/
Redis container identities are unchanged. The protected runtime key, encrypted
volume, project originals and library versions are retained. No platform source
or worker01 configuration changed. Earlier API/entry-only release statements
below are dated history, not the current deployment state.

The same real subscribed workspace has completed bounded source reading,
background generation, source/scope verification (15 exact-match requirements),
human confirmation, a reviewed two-chapter plan, both generated chapters and
independent review of both chapters. Review found four honest source/gap issues;
it did not fabricate a clean compliance result. A source-traceability correction
produced a separate candidate and retained the first draft. Production layout
generated a six-page DOCX/PDF snapshot. v0.2.2 fixed the Web ticket path and actual
PDF, DOCX and Markdown downloads passed through the original controls. Full
page inspection then exposed the default template's empty TOC and missing page
fields; v0.2.3 corrected both and the newly generated V3 passed all six production
PDF pages and DOCX field checks. V1/V2 remain original snapshots. Isolated
renderer/Redis tests are not substitutes for actual downloads. Desktop authentication, signed
installation, comparison/OCR and complete plan-rule acceptance remain open.

The owner identified the missing desktop host chrome in the B6.1 Web preview.
Do not replace it with another invented navigation or editor. The complete
baseline is [50-desktop-baseline.md](../40-implementation/50-desktop-baseline.md).

| Batch | Scope | Acceptance / current state |
| --- | --- | --- |
| B6.2 | Freeze the complete desktop baseline and remove rejected Web presentation | Source/feature/evidence inventory complete locally: 161 source hashes, eight historical evidence hashes, original sidebar screenshot and D01-D14 page/control inventory. Original development checkouts preserved. Remove horizontal navigation, its build entry and rejected editor refs/preview launchers. No new UI. |
| B6.3 | Verify runtime differences and migration boundaries | Verification complete; integration gates remain open. Published schema 0.1.0 rejects Bid contract 0.2, core lacks projectDocuments; 26 identity tests pass. Isolated Linux reads MD/DOCX/PDF with matching hashes. LibreOffice conversion fails fidelity: six pages become four and TOC field codes leak. Storage/jobs/review boundaries and runtime-specific recovery recorded in the preflight. No adapter or production change. |
| B6.4 | Reuse the complete product application presentation | B6.4.1 runtime dependencies reconciled and 0.2.0 packages published/consumed; Bid build now uses the public pinned CLI and real reproducibility checks. PR #314/#315 published the original UI and Node adapters as registry packages 0.2.2; Bid consumes both without private source imports. Preserve desktop project/home/library/settings, six-step sidebar, state/times/duration/progress and human review. No replacement editor/navigation or private cross-repo app imports. |
| B6.5 | Adapt Web identity, projects and data | Real subscribed Bid session, project/original/library-version persistence and reopening across v0.2.0-v0.2.2 passed. Workspace/revision/private-record refusal remains covered by runtime tests. |
| B6.6 | Adapt reading and agent jobs | Real generation, 15 exact-match source requirements, human confirmation, enterprise fact extraction/matching, two-chapter planning/writing/review and single-chapter rewrite passed. Prior manuscript and stale review history are retained; no RUYIN execution grant. |
| B6.7 | Deliver preview and actual output files | v0.2.3 actual V3 three-format downloads, populated TOC, header/page fields and all six production pages passed. Cover is clear; original V1/V2 retained. Custom-template Linux regression also passes. |
| B6.8 | Verify product plan rules and feature gaps | v0.2.4 shared gauge admission and durable reporting passed actual inventory/C2 reconciliation and final-session/C2 export checks. Proposal, dedup and paid-export gates retain coverage. Independent comparison/OCR and cross-surface business accounting remain open. |
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
unpublished compatible package dependency. Remote RUYIN main also says 0.2.0
but lacks projectDocuments, project_document and the original workflow sidebar;
reconcile the original delivery-branch changes before publishing any dependency.
Product-native desktop identity and the
server layout engine remain explicit later acceptance gates. Preserve the
complete original UI; do not substitute a second product app while those
dependencies are unresolved.

### B6.4.1 supported build dependency scope

Reconcile the existing runtime dependencies in the independent RUYIN repository,
then consume their reviewed 0.2.0 publication through the existing package
pipeline. In Bid, change only `portals/desktop/build.mjs`, its `package.json`,
the necessary lockfile, a new `portals/desktop/verify.mjs` artifact check and
the existing CI build step. Replace the private RUYIN-checkout imports with
the public CLI build entry and require two actual builds to produce identical
package/UI hashes. Update this tracker and the existing app/runtime guides.
The source/runtime/identity/layout evidence remains in its original record.

This stage removes an unsupported cross-repository build dependency; it does
not implement the full host UI, Web runtime adapters, signing, installation,
cloud synchronization or a production release. Preserve the original desktop
checkout and the existing six-stage business payload.

RUYIN PR #312/#313 and exact main checks passed; the existing package workflow
published all four 0.2.0 packages. An isolated registry consumer accepted the
actual Bid contract and exercised consent/revision/recovery from public exports.
Bid's actual package SHA-256 remains
`b7df93f20dca173b4c911c54e15aa987d71b459ab27fe4c7083a8c3377128c03`;
two builds are byte-identical. Workspace type-check and all 381 product/shared/
transport tests pass. Required Bid PR/main CI will independently install and
verify the registry-backed build. No Bid release tag or production change.

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

## B6.5 complete Web host implementation scope

Under the owner's current full completion/deployment authorization, implement
`portals/app/app/workbench-server/**` and its API route handlers for the verified
Bid product session, server-side org/workspace namespace, encrypted durable
projects/documents/files, original runtime tasks/jobs/checkpoints and library.
Use published `@vxture/ruyin-core`, `ruyin-node-runtime`, `ruyin-document` and
`ruyin-workbench-ui` only; no private cross-repository app imports. Register
product-owned server volume/master-key configuration on worker02 only, preserving
all existing database/Redis/identity values. The server requires a configured key
and exclusive process ownership; it must never generate a plaintext development
master key or claim distributed storage support.

Compose the existing shared UI in `portals/app/app/workbench/**` and the product
entry/layout, preserving the original left workflow, states/times, project
catalog, settings/files, library, task reviews and six Bid business panels.
Build the existing product assets under `portals/app/public/workbench` with only
a cookie/environment adapter; align the design-system dependency. Update manifests,
lockfile, Next tracing/external packages, Docker reader/layout dependencies and
product compose configuration as required. Keep entry/status pages and no public
synchronization UI. Add authorization/scope/isolation/revision/recovery tests,
actual standalone/installed-package checks, reader/layout fidelity and full
workflow acceptance before product release.

Each actual model call re-resolves the original own-product session and rechecks
subject/org/workspace plus C2 and member assignment. Persist opaque RP session
references only inside encrypted server records; never expose them, platform
access tokens or provider credentials through business documents or client bundles.
Workspaces derive exclusively from verified identity. No platform source,
worker01 configuration, subscription identity or payment changes.

## B6.4.2 / B6.5 implementation checkpoint, 2026-11-25

RUYIN PR #314 extracted the original project presentation and PR #315 extracted
its existing Node adapters. Both exact PR/main gates, CodeQL and Windows package
checks passed. The existing packages-v0.2.2 workflow published six public packages
from 36ce2c61. Bid installs those registry packages with integrity-locked versions;
there is no cross-repository source override.

The Web host composes the original sidebar, timestamps, project directory,
settings/material selection, task checkpoints and six Bid panels. The actual
standalone artifact passed synthetic own-product session/C2/seat checks,
workspace isolation, cross-origin refusal, revision conflicts, file upload and
private-record refusal. Browser checks opened the original reading panel and
uploaded the P9 synthetic tender through project settings. The Node adapter's
874 native integration tests and Web host's targeted cases preserve real context
consent and human result review; results remain unavailable until those gates pass.

The Linux layout adapter is product-owned. Isolated worker02 containers using
only synthetic data generated the original P9 Markdown through the public renderer
and template merger into six-page DOCX/PDF, with a refreshed TOC and no visible
field commands. A second synthetic template verified all page-header placeholders
and Page/NUMPAGES fields. Each page was rendered and inspected. Noto CJK/Carlito
are installed under their open font licenses; no Windows fonts were copied.
Layout and source-reading queues are bounded, and engine subprocesses receive no
product credentials. These are runtime/layout checks, not a completed production
six-stage, signed desktop or commercial comparison/OCR acceptance claim.

Production Web release still requires final current-source standalone/browser,
Linux container and live own-product acceptance, protected PR/main gates, a durable
Bid-only worker02 volume and protected master key, then the existing release
workflow. The platform, worker01, database/Redis contents and published plans are
outside this source change. B6.8-B6.10 remain open until their separate acceptance.

## B6.5 browser and container follow-up, 2026-11-25

PR #20 merged as 2f6539e with all PR/main checks and Sonar passing. Browser
acceptance found and corrected a bare environment import and the canonical
reader lock filename before release. The actual Debian image passed non-root
encrypted SQLite reopen, fixed offline Markdown reading and a six-page
LibreOffice DOCX/PDF run in an isolated worker02 container with no production
credentials, volumes or network. Real isolated Redis verified rotation CAS,
stale-write rejection and refusal to resurrect logout; 24-way resolver tests
verify single-flight refresh. Only an explicit continuation by the original
member in the original organization/workspace may bind a new Bid session.

The browser build also exposed Tailwind 4 individual translation on the original
review side sheet. Keep its original right-edge layout with an explicit
translation reset that survives CSS optimization. Use environment-neutral task
wording and Chinese host labels matching the current shared Chinese business
panels. This is a compatibility correction, not a second application design.
The Web release still requires exact-current-source browser and production
checks; no signed desktop or independent comparison/OCR completion is implied.

## B6.10 first Web production release, 2026-11-25

v0.2.0 / fc124cbb is deployed through the existing protected workflow (run
45497182181). Public health/readiness and the current subscribed account passed;
a synthetic project, tender upload, original source snapshot and versioned
enterprise library import persisted on the Bid-owned encrypted volume. The
original database and Redis container identities remained unchanged. Production
image digest and restricted backup locations are in the release evidence.

Live generation reached the configured reasoning model, then independent
verification failed because that provider rejects forced tool selection. Use
auto tool selection while retaining strict typed verdict parsing and the
existing unverified-prose escalation; never infer a passed verdict from prose.
Short UI bursts also need bounded, scope/token-isolated coverage coalescing
with C3 eviction and no expired fallback. Actual model execution continues to
recheck the original session, C2 coverage and member assignment directly.

Keep the original business iframe mounted invisibly on project settings tabs
so its shared workflow projection restores saved times/progress after returning
from the library or directly loading settings. No replacement state calculation
is added to the Web shell. Full live generation/review/export and signed desktop
acceptance are still pending until the follow-up passes.

## B6.7 production download follow-up, 2026-11-25

The first real browser download failed before navigation: the server issued
`/api/workbench/downloads/<ticket>` while the shared desktop-derived UI correctly
expected its environment-neutral `/downloads/<ticket>` contract. Normalize the
successful issued response only in the Web transport and retain an exact map to
the server-issued same-origin URL. Keep the shared pages, server's scoped
single-use validation and desktop adapter unchanged. Invalid responses, unrelated
requests and foreign/modified URLs must never authorize a download.

Local acceptance: 289 product, 105 shared/adapter and three desktop tests pass;
workspace type checks and the standalone build pass. The candidate still needs
protected PR/main gates, Bid-only release and actual three-format downloads plus
page-by-page visual inspection. Keep V1 and subsequent outputs as real historical
snapshots, mark changed sources/reports stale, and never turn pending proof into
an automatically cleared finding.

## B6.7 default-template real-render correction, 2026-11-25

v0.2.2 actual downloads passed, but visual inspection of all six production PDF
pages found an empty contents page and no page fields for the standard A4 path.
Previous Linux tests selected a user template and did not exercise this path.
Generated heading styles lack explicit outline levels; the normalizer previously
set them only inside the template branch. Normalize levels before either path.
Supply standard header/footer fields only without a user template, preserve its
own page furniture when selected, and leave the generated cover clear.

The regression fixture is produced by the published document renderer, not a
handwritten imitation of its OOXML. Four isolated Linux tests include actual
default and template Writer runs and assert populated TOC titles/page numbers,
page/total fields and header preservation. Repeat them as non-root during image
build. The real two-chapter production Markdown also rendered to six pages with
a populated contents page, recorded header fields and pages 2-6; every page was
inspected. This candidate still needs PR/main checks, exact-image release and
actual new production output. Old output versions are preserved, never replaced.

## B6.8 storage contract checkpoint, 2026-11-25

Read-only inspection of the real Bid C2 response confirms `storage.bytes` in
`quota_pools`, shared effective workspace storage, alongside `proposal.max` and
`comparison.monthly.max` in `limits`. The current local `storage.bytes.max` read
therefore falls back rather than honoring the actual pool. Storage snapshots
must use the existing `PUT /usage/gauge` contract, never `POST /usage/consume`
or fabricated counter events. Correct pool/admission/reconciliation semantics,
durable retry and deletion/dedup handling before claiming complete storage
accounting. Do not create platform schemas, change worker01 or infer independent
Web/desktop commercial pools. No storage consumption was fabricated by this check.

### B6.8 retained-storage candidate

Under the owner's full implementation/release authorization, limit this batch
to the product's `workbench-server` service, dispatch, identity and host, new
storage policy/accounting modules and tests, and `usage/lib/gauge.ts` plus its
tests. Update these existing release/memory guides. No platform, worker01, DDL,
credentials, runtime master key, package dependency or UI redesign changes.

The actual shared `storage.bytes` C2 gauge view takes precedence over a local
per-tier default. Reconcile Bid's absolute current inventory before a fresh C2
read, then admit only additional deduplicated bytes plus local pending export
reservations against remaining workspace space. Explicit zero/unlimited and
invalid present values are handled conservatively. Already retained content is
not deleted when the shared pool is exhausted, and zero-addition duplicates
remain usable. Capacity is not inferred from a pool's enforcement label.

Only retained project/library originals and saved DOCX/PDF output bytes count,
deduplicated by SHA-256 within the workspace. Parsing intermediates and render
reservations never become reported storage. File deletion and library imports
are serialized with uploads/exports. Background export finalization refreshes
the pinned original Bid session and rechecks C2/member access and paid export
coverage; persisted old admission values are not authority.

`PUT /usage/gauge` uses the existing Bid confidential S2S client. The private
`runtime_auth_storage_accounting` document in the existing encrypted library
container retains current/acknowledged observations, monotonic observation times
and pending delivery across restart. Exact receipt matching, superseding-receipt
reconciliation, bounded single-flight retry/backoff and closed-store protection
are covered. No invented counter event or repeated Atlas AI token report.

Limits: the existing platform gauge protocol has no atomic shared reservation.
Other products may write between C2 read and local retention. This batch closes
the local serialization and actual-inventory accounting gap, not that platform
race. It does not add desktop synchronization; desktop identity, signing, and
independent comparison/OCR remain separate open gates. Local tests/types/build
pass; protected CI, exact-image release and real gauge acceptance follow.

### B6.8 production acceptance and B6.10 timing correction

PR #25 and exact main 01908073 passed all CI, Sonar and secret-scan checks.
v0.2.4 was deployed through the existing protected workflow after an app-only
Compose preview. DB/Redis identities, operator environment, master key and the
original encrypted volume are unchanged. Before the release, the real test
workspace retained 536,883 unique bytes without a gauge. After opening it, the
private current/acknowledged observation exactly matched that inventory and C2
remaining fell from 141,220,721,163 to 141,220,184,280 bytes. A real new V4 export
passed final pinned-session/C2 checks and added 186,286 bytes; the new inventory
and acknowledgment are 723,169 bytes, with C2 remaining 141,219,997,994. Exact
before/after agreement is live gauge evidence, not an invented counter event.
V1-V4, originals and library versions remain available; actual V4 PDF/DOCX/MD
downloads and all six PDF pages passed. The existing source/review gaps remain.

The original shared export UI has a fast-completion race: starting a new version
clears its completion timestamp, but a render that finishes before the next
poll can leave the projected state at its previous complete value. The existing
state-change-only branch never records the new completion. Limit the follow-up
to `delivery.mjs`, `delivery-ui.mjs`, `delivery.test.mjs` and the shared/desktop
package versions. Project actual latest-task facts independently of UI state,
use its recorded creation time when starting, and repair a delayed start only
from those real facts. Do not create completion timestamps on page view or for
failed/stale/unknown jobs. Preserve the original sidebar and all historical
output snapshots. Candidate desktop package advances to 1.17.3; it is still
unsigned and is not published to the production install catalog.

### B6.9 authority recheck and remaining gates

On 2026-11-25 the original RY-100 and RY-103 pages were accessible and read.
RY-100 section 03 defines separate user/runtime/product principals and bound
runtime credentials; RY-103 phase 3b still requires the corresponding control
plane handoff. Its old console/central-inference descriptions predate the
owner's Workbench migration and agent-owned inference decision (RUYIN ADR-028).
Do not implement its historical transitional central proxy or weaken the
current own-product audience check. Platform issue #198 remains open. This
product-only task cannot complete production native invocation by sending a
RUYIN/Workbench token to Bid or embedding the confidential product secret.
Formal package publisher signing/trust distribution and actual install/update
acceptance remain separate from successful reproducible unsigned packaging.

Independent comparison is also unfinished: the current C2 max limit exposes
the allowed count but no monthly subscription anchor. Annual subscriptions
must not accidentally get a calendar-month or inferred annual-end reset rule.
Agree the authoritative period input before enforcing/reporting successful
comparison counts; failures/retries/views must not count again. Scanned-PDF OCR
still needs a bounded product reader/provider implementation and paid/Free
acceptance. Neither feature is silently advertised as completed by the six
writing stages. Cloud synchronization remains intentionally absent.
