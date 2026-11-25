# B7 application framework implementation

Baseline accepted on 2026-11-25 (Asia/Shanghai). The reviewed local B7 prototype
is a visual and interaction reference, not application data or a deployable
replacement for the existing business runtime.

## Delivery batches

| Batch | Result | Acceptance |
| --- | --- | --- |
| B7.1 | Shared product header, module launcher, identity panels, single-column home and project collection | Real project create/open/resume, scoped recorded summaries, empty/error states, DS controls and responsive layout |
| B7.2 | Three-column workspace and assistant dock | Preserve existing six business panels, human checkpoints, source selection, jobs and downloads; stable expanded/collapsed markers and 56px dock titles |
| B7.3 | Knowledge and template resource collections | One card contract, half-document stacked previews, DS card/list selection, actual resource versions and storage limits |
| B7.4 | Compilation versions and version-specific brief | Isolated business documents/tasks/output; revision conflict checks; original projects and exports remain readable; no in-memory mock becomes persistence |
| B7.5 | Web release and desktop integration acceptance | Exact-source CI and protected release, retained old projects, own-product identity and independently signed native installation gates |

The Web and desktop products retain one business implementation. Presentation
components live in `@bidproposal/shared/presentation`; they receive data and
host callbacks and contain no Web API client or native bridge. The existing
shared six-stage modules and each environment adapter remain authoritative.
Importable presentation does not mean that the native host is already wired
to render it. Desktop identity, host integration and publisher signing still
require their own acceptance.

## B7.1 candidate

The 48px full-width header uses installed DS shell components, 32px triggers
and 24px nine-dot/assistant artwork. Module selection follows the approved
CoSpace-style grouped panel. Configuration stays under the right gear. The
tenant panel contains identity and resources, without finance. User preferences
use DS controls and the existing theme provider; display identities never fall
back to subject/workspace identifiers. Authenticated pages have no public footer.

Home and project collection read existing scoped project APIs. Creating,
opening, archive visibility, searching, card/list selection and continuing the
last viewed stage preserve existing project IDs. The server adds an optional
read-only projection of `bid_workflow`. The UI explicitly calls this a recorded
stage: historic completion timestamps are not a fresh review/compliance verdict.
Missing or invalid records remain absent, and viewing a page writes no workflow
history. Original encrypted documents, task consent, retained output, gauge
accounting and C2 authority are unchanged.

The home knowledge section consumes the real encrypted library. It has no
synthetic qualification/case records. Existing templates remain in their projects
until the B7.3 resource catalog lands. The assistant entry still opens the existing
chat surface until B7.2 supplies its dock. Comparison and simulated scoring are
explicitly planned, disabled modules. These are not completed feature claims.

No platform source, worker01 configuration, commercial product code, production
data or server configuration is changed by this candidate. The public brand
remains Jadera / 瑜章 while commercial attribution remains `bidproposal`.
Cloud synchronization remains excluded and absent.

## Verification

DS consumption preserves the accepted B7 composition. The candidate uses
published `@vxture/design-system@12.26.1` (tokens 3.4.0 / UI 9.18.1), the
latest compatible 12.x release for the current workbench UI peer contract.
DS 15.8.0 was evaluated, but its typography and component major changes
require a separate compatible workbench package release. No peer contract is
overridden to force this candidate through. `Card`, `Table`, `ViewModeSwitch`,
buttons, shell menus and preferences use DS components. T2 variables supply
shared colors, typography, spacing and radii. Product CSS retains the approved
short top marker, soft card gradient, six-stage progress line, stacked half
document preview, companion composition and responsive layout. DS adoption is
not permission to replace these design decisions with a generic layout.

Candidate checks include TypeScript for app/shared presentation, the existing
app/shared-business/desktop transport suites, real encrypted store reopen and
API summary projection, and browser rendering of the actual Next application.
The local dev server has no customer identity or runtime credentials; its denied
project reads must remain error states, not be disguised as empty success.
Synthetic presentation fixtures, when used, are local-only and removed before
commit. No production deployment is claimed by this record.

Local candidate verification passed: TypeScript for all workspace packages;
305 app tests, 107 shared business tests and 3 desktop bridge tests; all static
guardrails and staged secret scanning. Browser checks covered 390px, 879px
and 1367px viewports, search/reset, card/list switching, creation form,
organization and user panels, dark mode and larger type. The header measured
48px and the shared resource cards measured equal heights with 184px cropped
previews. Screenshots use explicit synthetic rendering fixtures; they do not
represent customer data. The fixture route was removed after acceptance.

## B7.2 / B7.3 candidate

The workspace stage composes the existing six-stage business surface with a DS
workflow navigation, stable expanded/collapsed icon rail, recorded time rows,
linked stage line, progress footer, hidden-scroll cue and a DS Dock for tasks,
files and the assistant. The original iframe business modules, human review
checkpoints, source selection, jobs and downloads remain the authority. Closing
the task/file dock leaves an edge trigger; opening the assistant uses the same
56px dock header and keeps its own durable conversation surface.

The assistant endpoint is product-owned and workspace-scoped. Conversation
records are encrypted product documents keyed to the signed-in member, use
revision checks and request IDs, survive reopen, isolate members, retain failed
user input and do not claim that an action was run. Inference is routed through
the existing capability authorization and turn resolver; the UI does not expose
the debug chat surface or a fake model catalogue.

Knowledge and template directories now consume the existing encrypted Product
Library. Both use the same DS Card / Table / ViewModeSwitch contract, two offset
document layers with an upper-half preview, title/status first row and version /
date / actions last row. Concrete template categories cover business, technical,
software, engineering and service proposals. Versions, reading states, retries,
original bytes and storage accounting remain runtime-owned. A selected library
version is pinned to a project through the existing optimistic selection
endpoint, so planning and export can consume the fixed version.

This candidate still does not add compilation-version persistence; the existing
project remains the durable unit until B7.4. Desktop imports the shared
presentation package but its host chrome, native identity and signing acceptance
remain B7.5 work. No production deployment or customer-data mutation is claimed.

Stage verification covered 1920x1080 workspace layout, 1367px and 390px resource
catalogs, workflow collapse anchors, assistant send behavior, hidden scroll cue,
DS dock title height, list filtering, version detail and failed library state.
The phase test set passed: 307 App tests, 107 shared business tests and 3 desktop
bridge tests, plus type-check, static guardrails and desktop artifact verification.
Temporary rendering fixtures were removed before commit.

## B7.4 candidate

The version selector replaces the workflow group heading and uses DS popover,
button, dialog, form controls and typography. The original project is V01 with
its original identifier and data. Each additional compilation has a reserved
opaque runtime container, grouped by an encrypted workspace library record.
Its documents, tasks, human checkpoints, jobs, workflow records and retained
outputs remain isolated by the existing runtime. Versions are not extra logical
proposals in the project directory or proposal-count limit; all retained files
and outputs still participate in storage reconciliation. A project supports up
to 20 compilation versions. Source reads never create a version or rewrite V01.

Creation reserves the container ID before initializing it, uses a request ID
for a lost-response retry, checks the group revision for new requests and
recovers interrupted initialization on reopen. A pending version is unavailable
for business edits and exposes retry from the selector. Existing immutable
library selections can be reused by explicit choice, without copying approvals
or generated content. Tender originals must be selected or uploaded in the new
version; they are not silently copied from arbitrary project files.

Compilation requirements write the actual `bid_plan` document with its existing
revision and Markdown/JSON contract. Editing preserves the outline and source
metadata, clears its approval and requires re-confirmation. Active work in that
version blocks requirements changes. Project mutations serialize across sibling
versions so a logical archive cannot race another version's task admission.
Archiving checks every version for pending work, and the root lifecycle gates
all child writes. Restore keeps original identifiers and history. Individual
project-record downloads include the selected compilation and group metadata;
they remain selected-version records, not a combined backup of every version.

Home resumes the last selected version and shows its recorded progress.
Knowledge/template selection explicitly chooses a target compilation. The
56px dock headers, original business panels, resource card artwork and all
previously accepted layout remain unchanged. Version presentation and data types
are shared for either host; native host wiring, own-product identity and signed
installation are still separate B7.5 acceptance gates, not completed by imports.

Phase checks passed: 311 App tests, 107 shared business tests and 3 desktop bridge
tests; all workspace type checks and static guardrails. New persistence tests
cover original-project preservation, isolated documents/requirements, optimistic
conflicts, idempotency, interrupted container recovery, fixed library versions,
storage deduplication, logical proposal count, archive/restore and active-task
guards. Browser checks covered 1920x1080 and 390px, version creation/selection,
saved requirements, a small completion ring and workflow icon anchors (maximum
expanded/collapsed center difference below 0.06px). Synthetic local rendering
fixtures were removed before commit. No production deployment is claimed.

## B7.5 Web release and demonstration acceptance

Protected release v0.3.0 deployed `80176ce3` on 2026-11-26 (Asia/Shanghai),
run 45658032924. Exact main CI/Sonar, matching CI/ACR image digest,
isolated non-root startup, anonymous 401 and app-only Compose preview passed.
Image: `sha256:10ecc5cef6d0d2723465bb4ede8a4c6cbbdec260ba55b46a566a63a8fa4390d1`.
Original configuration/master key, database/Redis container IDs and encrypted
volume are preserved. An app-paused encrypted snapshot and rollback inputs are
retained at `/srv/md0/bidproposal/backups/jadera-b7-v030-20261125T165003Z`.
Public health/readiness identify the exact production revision.

The owner explicitly permits testing with the current account and retaining its
data for external demonstrations. New demo records use business-facing names;
source contents identify fictional demonstration evidence and never invent real
certification or customer credentials. The original project, six-page export,
task history and source snapshots remain available. Its current review state is
derived by the existing business projection; historic completed output does not
assert that current review is complete. A new compilation and actual product AI
conversation were retained. Platform native identity issue #198 remains open.

The demonstration follow-up adds display-name editing for logical projects and
individual compilation versions. Encrypted group metadata records before/after
names, actor and time with optimistic revision checks. Original runtime metadata,
project IDs, documents and rendered bytes are untouched. Read/list views project
the current display name; viewing alone performs no rename. Archived projects
reject name changes. The project action menu stays reachable below 1280px.
Focused persistence/isolation/conflict checks and app types pass for this follow-up;
the previous 421-test phase baseline is not unnecessarily repeated locally.

Live demonstration preparation retained three logical projects, a second
compilation, five knowledge resources and four editable Word templates. Template
originals rendered as eight pages and were visually checked before upload.
Their actual background reads completed, and the Card/List controls work with
those persisted originals. A case was pinned to the second compilation and the
software template to the software project's first compilation. The owner also
authorized retaining actual assistant validation; the product inference path
returned and persisted its answer without claiming to execute project actions.

The first live name save exposed a missing Next route export: dispatch accepted
PATCH while the API route did not export it. The request returned 405 before any
rename occurred. PR #37 adds PATCH through the existing authenticated handler;
its focused route test verifies the anonymous 401 boundary. The previous required
CI suites and the exact main checks remain the release gates. This was a route
wiring omission, not a database or customer-data failure.

An encrypted-snapshot comparison confirms that the original runtime metadata,
101 business documents (excluding workflow projection and private auth records),
eight retained output snapshots, 14 task instances and two original file
references are unchanged after B7 and demonstration preparation. New source
versions retain the old immutable originals. Display-name edits are separate
metadata and never rewrite old documents or audit records.

## Final Web checkpoint 2026-11-26

v0.3.2 / `e699b598` is live at https://jadera.ruyin.work/. Protected run
45667761554 attempt 2 completed successfully after exact PR/main CI and Sonar.
The first attempt stalled publishing the ACR mirror before deployment. The exact
GHCR manifest `sha256:22dbbe4d003fbea26d731ef6f262bb767da9ce48302463db504e605cd3585c78`
was verified, copied to ACR and reused by the existing protected retag path.
Its release OCI index `sha256:1f4b9df04669acd56c8d5b7264dab22771166562c9cb9e7275fb1d4d7a7a0c6e`
contains that same verified manifest. No approval or required check was removed.
Isolated startup, anonymous PATCH 401 (instead of the former 405), app-only
Compose preview, public health/readiness and post-deploy configuration/container
identity checks pass. The v0.3.2 encrypted snapshot and rollback inputs are at
`/srv/md0/bidproposal/backups/jadera-b7-v032-20261125T174337Z`.

Actual authenticated UI saves and refresh acceptance now pass for the project
display name and compilation labels. The retained demonstration names are
科技园区智能巡检服务采购项目, 智慧园区综合管理平台建设项目 and
科创中心弱电系统改造工程. Their compilation labels include 综合标 · 基础方案,
技术标 · 实施深化, 软件标 · 建设方案 and 工程标 · 施工组织. Requirements save
successfully into the actual plan; the new versions use their own scope and the
original six-page output remains viewable. Five knowledge records, four Word
templates, immutable resource versions, actual selection copies and the assistant
conversation survive app updates. The software demonstration also retains its
uploaded requirements original and completed source reading. New projects are
not falsely shown as having completed business stages.

The final snapshot comparison again passes for the original 101 business
documents, eight output snapshots, 14 task instances, two file references and
runtime metadata. The current source CI includes 313 App tests, 107 shared
business tests and three desktop transport tests. Local follow-up verification
was focused; the earlier full-phase regression was not repeated after each edit.
Desktop own-product identity, shared host-chrome wiring and publisher signing
remain explicit separate gates. This checkpoint completes the Web B7 release
and retained demonstration preparation, not signed native distribution.
