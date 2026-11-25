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
