# Web design conformance

## Live v0.3.8 framework release 2026-11-26

PR #47 merged as 38cecf0b; all exact-source required checks and Sonar passed,
with 320 app, 114 business and seven desktop-adapter tests (441 total). The
owner accepted the basic framework and directed rollout while deferring fine
visual details. Protected release 45770957650 succeeded. Verified registry
digest: `sha256:bf5dc10188b21d868163355e26b52b5242b0d2d678727493012286dd44a431cd`.
Isolated image startup, unchanged brand, anonymous read/PATCH refusal and
app-only deployment preview passed before approval. Public health confirms
v0.3.8 / 38cecf0b; readiness and bundled center/search/recovery code markers pass.

Encrypted rollback inputs are retained at
`/srv/md0/bidproposal/backups/jadera-b7-v038-20261126T064557Z`.
Original environment/master key and DB/Redis container identities are unchanged.
Snapshot comparison confirms four projects, 179 product documents, 18 tasks and
six source references unchanged. The complete before/after library inventory
matches: six knowledge records and six templates, all completed. No business
data or platform source was modified by this release. Browser geometry, keyboard,
200% zoom and actual account-switch recovery remain follow-up acceptance scope;
do not equate owner framework review or DOM rendering checks with those gates.

## Current common-page baseline: Vxtpl v2.0.0

Owner decisions confirmed 2026-11-26: home/management use the 1536 content cap;
the writing workspace uses 1920. Preserve six-stage workflow navigation, with
resources in the on-demand auxiliary region. Search covers authorized projects,
knowledge and templates in the current workspace; manuscript full-text search
is a separate feature. Use daily home headlines with product positioning kept
as secondary copy. Do not extend the project model for ownership in this batch;
display the missing-owner state honestly. Include 2440px and 2560x1440 displays
in acceptance alongside 1920px and narrow containers. At 2440px the 1536 home
box has 452px outer margins; the 1920 writing box caps the center only after
actual docked regions have been deducted. Two docked regions of 256/420 leave
1764px at 2440 and 1884px at 2560; hiding a region returns its width to center.

Implementation checkpoint: shared container observation and drawer focus handling
replace viewport decisions for workflow and auxiliary docks. Escape, focus
cycling and trigger return are implemented without moving the center/editor
to a different React branch. The work header exposes product-scoped catalog
search using existing authenticated project/library APIs. Recent projects now
show at most six records, the real completed-stage percentage and an honest
missing-owner state. Ten local-calendar headlines rotate without repeating
within a cycle. Assistant drafts are retained separately by conversation or
new-conversation project scope; closed docks retain their mounted state owner.
Entry minimum heights align to the 480/440 reference without a fixed maximum.

Web session recovery keeps the original workspace mounted. A 401/403 freezes
subsequent UI requests, opens a recovery dialog and supports login in a separate
tab. Explicit confirmation requires product access and the original subject,
organization and workspace. The original frame accepts block/unblock only from
its same-origin parent. Neither rejected writes nor successful confirmation
automatically replay an operation. Server identity, entitlement and storage
checks are unchanged; no platform source or data model is modified.

Local full phase verification: 319 app + 114 business + seven desktop-adapter
tests pass, as do all workspace types. A fifth new focused regression additionally
verifies the actual Web adapter rejects foreign unblock messages and never
replays a refused operation. Isolated home/workspace preview bundles include
320/360/580/768/1024/1367/1920/2440/2560 routes. Real rendered geometry, drawer
focus and 200% zoom remain browser acceptance gates; do not label expected
large-screen arithmetic as measured browser evidence.

Owner framework review follow-up: the breadcrumb/project actions belong inside
the constrained center content, not a separate title strip. They now share the
same center container and scroll region as the body; auxiliary docks remain
outside it. Actual preview execution in a DOM test environment checks header,
business content, task-panel expansion and this containment without exceptions.
The local preview additionally needed complete fixture data and the production
FullscreenProvider; its 2440px canvas now scales to the viewing window rather
than adding an outer horizontal scrollbar. These fixture corrections do not
change production identity or runtime responses. On 2026-11-26 the owner accepted
the basic framework and directed continued integration, deferring fine details.
This is owner framework review, not a claim of exhaustive browser geometry,
keyboard/zoom or real-account recovery acceptance.

Owner direction, 2026-11-26: follow the supplied Vxtpl common product page kit
v2.0.0 for further common-page architecture and presentation. Local source:
`D:/stonesomker/OneDrive/Vxtpl-通用产品页面套件-v2.0.0`.
Read README, docs 01-05 and examples/README before implementing this alignment.
The release-lock manifest checksum was verified as
`6e9c81c3850f564886c7c3e105636818bfb3012a3b194214acfc8d566dee650c`.
The manifest identifies 41 examples, 122 files and application reference
`vxture/vx-agent-vxtpl@200279a4d740b76b77e96d3603950ae2f110fe96`.

This supersedes earlier B7 common-shell details where they conflict with the
new kit. Jadera's product identity, six-stage workflow, data contracts and
authorization remain product-specific. Platform interface authority remains
the original integration contract referenced by kit docs/02; offline state
simulation is not production authentication or entitlement behavior.

Register the next implementation against these requirements:

- Full-width shell/header; desktop work header has 48px side insets. Explicit
  1536/1920 content-box modes include both 48px inner insets. Deduct actual
  docked regions before measuring center width; hidden regions take no space.
- Default left region 256px, management collapsed rail 64px and narrow right
  dock 420px. Use actual container width for adaptation. Narrow auxiliary
  drawers are mutually exclusive, close with Esc and return focus. Preserve
  the center/editor node, draft and scroll when regions open or close.
- Adopt kit header/tool grouping and assistant control order with DS components.
  Preserve assistant input/messages across close and conversation changes.
- Work-home headlines rotate by local calendar day, with stable daily selection.
  Recent work supports at most two desktop rows of three cards. Complete lists
  remain in the catalog. Cards use real type/status/owner/stage/progress/time;
  missing totals show a dash. Do not fabricate owner or progress facts.
- Public home and independent gates alone use the legal footer. Management
  tables have explicit selection scope and 64px first/last columns.
- Gate states follow server facts and role differences. Session recovery uses
  a new login tab, preserves the original draft and route, confirms the same
  account/workspace, and never automatically retries a write.

Current gaps include viewport-based media hooks, unrestricted shell geometry,
the three-item recent-project limit, fixed home headline, missing card owner
projection, and incomplete narrow drawer focus/Esc behavior. Resolve framework
composition first, then shared chrome/cards, gate recovery and acceptance.
Verify both content modes at 1920/2440, narrow containers, themes, 200% zoom,
keyboard/focus, long names and real session/permission changes. The kit's own
acceptance is reference evidence, not acceptance of Jadera. No runtime change
or new production release is made by registering this baseline.

Registered 2026-11-26. The owner requires strict Web design acceptance before
further desktop adaptation. Reusable components remain shared, but an extraction
must not redefine the design. The separate unmerged RUYIN workflow experiment
is parked; it is neither published nor a prerequisite for this Web correction.

## Workflow correction

Compare against the owner's B7 business design at the local prototype, not an
already imperfect application screenshot. Keep the DS rail and accepted artwork.
The source design has vertical start/end timestamps, with duration beside and
bottom-aligned to the end timestamp. Its 92px stage pitch and status-colored
connectors must survive collapse without moving the six icon centers.

Selected stage rows have no persistent rectangular fill. Only their icon circle
is emphasized; rectangular row feedback is temporary hover. Apply the same rule
to the design prototype and Web implementation. Keep expanded stage icons and
collapsed numbers/completion checks. Do not change recorded business state when
changing the selected stage. Check typography, timestamp alignment, spacing,
footer safety and desktop/narrow layouts as one visual phase, then run the
relevant regression/required CI. Deploy only the verified product Web change.

Desktop follow-up must consume the accepted shared implementation. Transport,
identity, local files and packaging may adapt by environment; main components,
tokens, document formats and business rules must have one maintained source.
This batch does not close the native identity/signing gates.

## Web document workspace

The owner subsequently requires familiar continuous reading and selection, a
proper browser editor, and AI-led drafting with human supplementation. Keep the
accepted B7 shell, imagery and DS tokens. The former single-page canvas and
previous/next-only extracted-source view are replaced by continuous surfaces.
Original sources remain immutable, and the saved PDF remains the actual renderer
output. Do not fabricate pagination for extracted Word paragraphs.

Tiptap 3.35 / ProseMirror is bundled locally with the shared business surface.
It edits chapter Markdown through headings, lists, tables, native selection,
paste and undo/redo. Continuous manuscript reading is the default; chapter
navigation scrolls to a chapter. Human revision is secondary to the real AI
generation/rewrite/candidate workflow. Selected text can populate a chapter AI
instruction. No simulated generation or remote editor service is introduced.

Saving a human revision archives the original chapter before replacing it.
Fresh chapter-body and document-revision checks reject competing edits while
retaining the unsaved editor. Unrelated chapter changes are rebased. A retry
after a draft conflict reuses the original history entry. Existing review and
export revision bindings become stale naturally; prior outputs stay untouched.
Editing DOM and selection survive status rendering. Save/cancel and Ctrl+S are
available; dirty route changes are guarded, with before-unload protection.

Continuous PDF.js pages have selectable text, zoom, page jump and scroll-following
page numbers. Lazy rendering limits active work to two pages; distant canvases
are released. Extracted sources load at most three units concurrently, retain
their original page/block references, and keep complex-extraction flags.

Verification at the document phase boundary: all 434 tests pass (315 App,
112 business, seven desktop adapter tests); App types and docs numbering pass.
The isolated browser fixture verifies real editor typing/undo/redo/save and
preserved history, continuous source units, and a 48-page real PDF with text
layers and lazy canvases. This fixture is not authenticated production evidence.
Live Web acceptance and protected release are recorded below when complete.

Long-document follow-up: scroll pruning also checks pages which crossed the lazy
observer margin earlier; an observer alone does not keep reporting those pages.
Visible pages, active rendering and text selections are retained. A focused
regression covers this case. v0.3.3 was cancelled during image construction,
before any production deployment.

Authenticated narrow-window review also exposed the old default of opening both
the 256px workflow and right-hand task overlay, hiding the main surface. The Web
now follows the prototype's 990px workflow breakpoint and the existing 1280px
context-overlay breakpoint: narrow windows start with the DS rail and closed
context. Explicit toggles remain available, and breakpoint changes adapt the
layout. A shared hydration-safe media hook preserves a single presentation
source. v0.3.4 was also cancelled before deployment while this was corrected;
v0.3.5 passed exact main checks, but was cancelled before deployment when actual
source-review testing exposed the Web frame's missing form permission.

The shared component fixture at 580px confirms a 48px DS rail, 532px main column
and initially hidden context; at 1367px the expanded workflow and context leave
691px for the main surface without horizontal overflow. Small writing windows
omit redundant introduction text and completed action buttons, keeping the
manuscript visible earlier. Actual signed-in post-deployment checks remain the
final acceptance, rather than treating this fixture as customer-data evidence.

## Native form submission in the Web frame

The actual source-review save button did not execute its form handler: the
first-party workbench iframe allowed scripts, same origin and downloads but
omitted `allow-forms`. A same-browser A/B reproduction confirmed that the old
sandbox never reached the submit handler, while the identical form with
`allow-forms` saved successfully. Add only this standard form permission; keep
the existing authentication, origin checks and other sandbox restrictions.
This is required for source review and other native forms, not a database fix.
The outer Web application also owns the dirty-document before-unload guard,
so unsaved protection does not depend on modal permission inside the sandbox.
v0.3.6 is the corrected release candidate. The demonstration software project
already retains a real 18-item extraction, all source quotes matched, followed
by 15 eligible and three operator-review items. Do not mislabel those findings
as a completed compliance judgment.

## Live Web acceptance 2026-11-26

v0.3.6 / `05ce0bea` is deployed at https://jadera.ruyin.work/. Protected run
45699629981 succeeded after exact PR/main checks and Sonar. The verified image
digest is `sha256:38bea50e46ab6cc23ced5b5e573df3b29e75bae88a039219d9ab80f3265ad4bd`
in both registries. Isolated image startup, authenticated route boundaries and
the app-only Compose preview passed before production approval. No gate was
removed. v0.3.3-v0.3.5 were cancelled before deployment.

The release phase has 436 passing tests: 315 App, 114 shared business and seven
adapter tests. All required main checks and types pass. Long-document browser
acceptance jumps through a real 48-page PDF: only three nearby canvases remain
at page 40, and returning to page one restores its text layer. Zoom and page
jump work without replacing the saved PDF. Editor typing/undo/redo/save/history
passed in the isolated fixture; actual production editor typing and dirty-route
protection passed with the original chapter edit cancelled afterward.

Actual production acceptance confirms the retained six-page output with a
selectable text layer, continuous scrolling and page-three jump. The six flow
icon centers move 0px between expanded and collapsed states. The original
101 business documents, eight output snapshots, 14 task instances, two original
file references and runtime metadata remain byte-identical to the preserved
baseline. Environment/master key and DB/Redis container IDs are unchanged.
Encrypted rollback inputs are retained at
`/srv/md0/bidproposal/backups/jadera-b7-v036-20261125T205628Z`.

The software demonstration retains real extraction and source verification,
three explicit operator interpretations of synthetic requirements, 18 saved
confirmed requirements, and an accepted ten-chapter technical outline. Actual
source-review form saves now display success and change the persisted candidate
state. These are demonstration interpretations, not procurement commitments.
The original completed project remains untouched. No native installation,
identity workaround, shared runtime publication or cloud synchronization was
performed; desktop adaptation must next consume the accepted shared Web source.

The software first chapter was generated through the real background model and
verification/human-review path. After adoption, a real Tiptap supplement was saved
and its previous body appeared as history version one. The supplement clarifies
the synthetic twelve-week schedule; existing unmet evidence remains explicit.
The batch is paused at one saved chapter out of ten so no remaining generation
is left unattended. Original project editor acceptance used cancellation only.

## Layout feedback follow-up 2026-11-26

The owner requests the B7 percentage completeness indicator, full-width
compilation requirements and an auxiliary task/files panel opened only when
needed. The shared navigation now displays percentage completion and the
accepted success color for a complete brief. Requirements fill the available
business column. The Web context panel starts closed for every project;
explicit expansion and product review events still open it. Resizing no longer
overrides the user's panel choice. No saved project or workflow data changes.

App TypeScript and both existing workflow presentation regressions pass.
The isolated updated preview bundles successfully. Automated visual acceptance
is pending because this recovery chat has no local browser connection. No
production release or native package change is included in this follow-up.

Additional owner feedback in the same batch: header groups use 16px spacing,
brand elements 8px and grouped icon buttons 4px. Project cards reuse the
workflow navigation's single stage-icon map and show local-calendar today /
yesterday times or a full year/month/day date without redundant prefixes.
Card border and open-action hover feedback follow the B7 reference. Resource
cover icons are secondary 16px marks; redundant vertical margins no longer
push the title below the visible cover. Each home resource group already
supports six entries. Six knowledge originals and six editable demonstration
templates are prepared outside the repo for additive, duplicate-aware import;
no live import has occurred because browser access is unavailable.

Stage timing remains compact in the rail. A keyboard-focusable DS tooltip
shows start and completion as year/month/day plus hours/minutes/seconds, with
exact elapsed hours/minutes/seconds on its third line. Missing values remain
unrecorded. Existing short times, recorded facts and collapsed targets survive.
App types and four existing workflow/projection regressions pass. Local home
and workspace previews bundle successfully; live visual acceptance and release
remain pending.

## v0.3.7 release and library completion 2026-11-26

The owner authorized production rollout followed by additive library population,
with normal business names/content and no demonstration wording. PR #45 merged
as e2f599bb. All required checks and Sonar passed on the exact main source.
Protected release 45754202414 succeeded; both registries expose the same digest
`sha256:4dc60ea37228fb1a3f4e9eff1db1596aec786301bdf0186b54498aa0edb12c5a`.
The isolated image starts, preserves the approved brand asset, and refuses
anonymous reads/PATCH with 401. The app-only Compose preview passed before
production approval. Public https://jadera.ruyin.work/api/health confirms v0.3.7
and e2f599bb; readiness, original bundled document assets and anonymous refusal
pass after deployment.

Rollback inputs are retained at
`/srv/md0/bidproposal/backups/jadera-b7-v037-20261126T041435Z`.
Operator environment/master key and DB/Redis container IDs are unchanged.
A read-only comparison against that encrypted snapshot confirms four retained
projects, 179 product documents, 18 tasks and six source references unchanged.
The original 101-document/eight-output/14-task/two-source baseline also passed
before rollout. No project was reset, regenerated or renamed in this release.

After production verification, the existing product session for the selected
project was resolved only on its own server; no token was printed or exported.
Normal API authentication, product coverage, same-origin writes, encrypted
storage and gauge accounting remained in effect. Duplicate-aware import added
one product-capability knowledge document and two Word templates for service
and equipment procurement. All nine prior library records match their original
API representations. Knowledge and templates now each contain six items, all
with completed extraction. All 45 extracted units of the three new resources
were read back; none contains demonstration/fiction/synthesis wording. The new
documents contain reusable writing/checklist guidance rather than invented
enterprise credentials or customer records. Both Word templates were rendered
and all four pages visually inspected before import.

Evidence scripts and rendered template review are under the existing local
shared-workflow artifact directory. Browser access remains unavailable to this
recovery chat, so production hover/tooltip/responsive visual acceptance is not
claimed. This section supersedes the earlier pending-release/import statements;
desktop identity, signing and installation remain outside this Web release.


## Framework refinement release 2026-11-26

Owner authorizes direct Jadera implementation and production release for this
batch; updating the offline HTML kit and Figma is deferred. Shared resource
cards have four desktop columns, consistent cover/footer heights and secondary
eyebrow icons. Home omits extraction status while catalog management retains it.
Project cards keep owner/status together and use one card-hover action state.
Open project tables use transparent surfaces, explicit columns and 32px search/
reset controls. Header gutters are 24px, launcher is 32/24px, active navigation
has no persistent fill, and search expands inline with responsive tool hiding.

Organization and avatar panels use DS ShellPanel and ShellUserMenu primitives.
Scope identity shows full name/type/workspace, followed by AI points/storage
and two external links: application center and organization information. No
sample note, scope switcher or project counts as resources. RP profile email
and picture complete the avatar identity. The current platform claims expose
no short organization name or workspace-wide resource balance; name falls back
to full text and balances explicitly remain unavailable, never product quotas
or fabricated amounts. Actual browser geometry is not yet verified because the
browser connection is unavailable; DOM interaction checks are narrower.


## v0.3.9 production verification 2026-11-26

PR #49 merged as 9c903bd3384107afa149a8b096561e6a184484fe. All five required
checks and Sonar passed on that exact main source. Protected release run
45787181703 succeeded; public health/readiness report v0.3.9 / 9c903bd3.
Image digest matches in GHCR and ACR:
`sha256:ceb4f9d3e097b8d64e621c1c9c27b18f2019c589a6c93b33ece9734b0d77eb03`.
The isolated image starts, preserves the approved logo, and refuses anonymous
reads/PATCH. App-only Compose preflight passed before environment approval.

Encrypted rollback snapshot:
`/srv/md0/bidproposal/backups/jadera-b7-v039-20261126T085027Z`.
Post-release comparison against that snapshot confirms four retained projects,
179 product documents, 18 task instances and six source references unchanged.
The 12 library entries retain IDs, names, categories, versions and reading
states (six knowledge, six templates). Environment/master key and DB/Redis
container IDs are unchanged. Existing editor/document assets and the new
framework artifact markers pass. No data imports, platform edits or DDL.

Validation: all workspace type checks, 441 existing tests, docs numbering and
diff hygiene pass. DOM tests open scope/avatar panels, verify the two links
and profile identity, inline search autofocus/Escape focus restoration, main
content and task-panel opening without render errors. This is not pixel,
hover, zoom or real-account browser acceptance; browser connection remains
unavailable. Organization shorthand and real workspace resource data still
require a platform-provided display contract, not guessed client values.


## Header account correction 2026-11-26

Owner review identified six remaining defects after v0.3.9. Existing platform
claims active_org_display_name and active_org_logo_url were missed by Jadera;
consume them as display-only fields, preserve the full name in the popup and
reject unsafe logo URLs. Header short name is 14px foreground; workspace is
12px muted with enough trigger width. Remove the unrequested workspace/rights
link. Restore DS control typography by removing the legacy unlayered global
font-size inheritance, and use the DS-sized system/small/large labels. Add
account selection through the existing login flow with prompt=select_account.
Application-center destination follows the verified CoSpace implementation.

Workspace totals exist behind the Console RP quota-usage endpoint, not a
product-callable S2S contract. Owner authorizes issues only, no platform code/
configuration changes. Platform issue #751 tracks the missing authorized read:
https://github.com/vxture-platform/vxture-platform/issues/751 . Resource values
remain unavailable until that contract is delivered; do not substitute C2
product-specific pool projections. This corrects the earlier overbroad claim
that the platform lacked display fields or resource computation entirely.


## v0.3.10 release verification 2026-11-26

PR #51 merged as 0657777d41974c420a3dfe43f0bded979b7e4779. Exact main required
checks and Sonar passed; protected deployment 45792898664 succeeded. Public
health confirms v0.3.10 / 0657777d. Both registries match image digest
`sha256:e38b1d16707c148bbb360d93ad15c27c7a360e8e5a5b3a3ef814859631e852b6`.
Isolated startup, approved brand, anonymous refusal and app-only preflight pass.
Rollback snapshot:
`/srv/md0/bidproposal/backups/jadera-b7-v0310-20261126T092715Z`.

Live product access response projects the existing organization short name
Ruyin Studio and logo URL; the logo returns HTTP 200 with an image media type.
Four projects, 179 product documents, 18 tasks and six source references match
the encrypted snapshot. Knowledge/templates remain six each with completed
readings. Environment/master key and database/cache container IDs are retained.
442 tests, workspace types and DOM account/search checks pass. Browser visual
and interactive account-selection acceptance remain unverified; no claim that
the screenshot defects received pixel acceptance. Platform issue #751 owns
resource-read integration; no platform code/configuration was modified.


## Project card content order 2026-11-26

Owner moves the complete owner/status row directly below the project title,
with adjacent left-aligned content rather than opposite-edge distribution.
Stage/progress now follows that identity row. Shared ProjectCard applies this
order to both home and project catalog; retain existing dates/actions and
workflow facts. Local preview is rebuilt for review before further rollout.


## Product scope panel and content-width preferences 2026-11-26

Owner requests intrinsic header scope width, corrected account identity slots,
DS popup language selection, font labels small/default/large in full Chinese,
and a final content-width row. Narrow is capped at 1200px for focused reading
and common laptop layouts; default is 1536px; wide is 1920px. All are maximum
center widths, shrink within available space, and exclude fixed side panels.
Preference survives navigation/reload and synchronizes same-origin tabs, with
a page-local fallback if browser storage is disabled. Writing and catalog
centers use the same preference instead of automatic per-route caps.

Shared ProductOrganizationPanel composes DS identity/resource/link rows, allows
full organization names to wrap, and labels pending resource integration as
connecting. Platform issue #751 remains the external dependency. Account display
projects preferred_username separately from display name and contact email;
missing fields remain omitted. Local fixtures no longer show Lin/example.com.

The DS checkout has unrelated existing typography/ViewModeSwitch work. Only
ShellChrome/ShellPanel and a dedicated regression test are changed for optional
fitContent scope sizing, popup locale selection and controlled width controls.
DS type checking and 146 targeted panel tests pass. These additions are not
published or mixed with the unrelated work. Jadera retains published 12.26.1
and composes the same DS primitives pending that upstream release. Product
types and DOM preference persistence/cross-tab/order/search checks pass; pixel
acceptance remains local owner review, not automated browser verification.


## Direct DS panel consumption correction 2026-11-26

Owner rejects reproducing Console composition. Supersedes the earlier
12.26.1-retention note: Jadera now pins published DS 15.1.0 and consumes
ShellPanelMeterRow for resource readouts and ShellScopePanel for grouped
organization/workspace selection. Product code only supplies metrics, tooltip
content, localized descriptions and auth callbacks. Removed the hand-assembled
resource row. Total is the numeric readout; meter is used percentage; DS
Tooltip includes total, used, remaining and overage when applicable. Missing
resource data is connecting with no fabricated bar or count.

Nested scope popup opens right on wide windows and below on narrow windows.
Only current verified identity is shown while the cross-product scope-list
contract is absent. Platform issue #752 tracks that separate dependency:
https://github.com/vxture-platform/vxture-platform/issues/752 . Other options
are not fabricated. Future selections go through OIDC tenant_hint/workspace_hint,
not a client-side identity mutation. Default-entry wording is shown only when
authoritative option data explicitly identifies the default.

DS 15 typography role changes are migrated in product-owned styles and three
legacy Section usages. All workspace types and 443 tests pass. DOM checks
verify actual DS scope menu/current selection and meter readouts/keyboard
tooltip used/remaining values; these do not establish pixel acceptance.
The published RUYIN workbench UI 0.2.2 peer range still declares DS 12: DS 15
compatibility is a release gate, not silently suppressed. This batch is local
review only, with no platform/RUYIN source or production configuration edits.


## DS 15 card inset regression and preview routes 2026-11-26

Owner screenshot found project content touching the border. Root cause:
padding combined a valid vertical token with removed --space-control-2xs,
invalidating the entire declaration. Replace with existing inset tokens
(16px vertical / 20px horizontal at default density). Add a real installed-DS
spacing-reference guard to prevent unknown tokens silently dropping layout.

The local home acceptance server previously retained home content for template/
knowledge hashes. Mount the actual ResourceCollection for those routes, with
six corresponding resources each. This preview-only defect was not a product
router change. Rebuild local server and verify card owner/status order plus
template/knowledge route content. No production deployment in this batch.


## DS-owned preference contract 2026-11-26

Owner approves moving width defaults and persistence into DS. Supersedes the
earlier product-owned width notes: DS PR #151 adds ContentWidthProvider,
ContentWidthContainer and provider-backed optional ShellPreferencePanel width
row. DS owns default 1200/1536/1920 caps, restoration, same-origin synchronization
and blocked-storage session fallback. Product controlled values/caps/storage
keys may override. Jadera removes its own width store, per-row preference
assembly and geometry CSS; it passes labels/theme callbacks and enables the
complete panel. Center regions use DS containers; side panels remain outside.

The same DS change gives preferences an opt-in 32px segmented recipe, compact
locale field using the existing LocaleSelectPanel, inset semantic active state
and localized accessible names. DS UI 12.8.0 + system 15.9.0 are additive minor
releases; tokens stay unchanged. DS PR tests: 643 UI and 444 shell tests pass.
Original dirty DS checkout is preserved; release work uses a clean separate
checkout. Platform and RUYIN sources/configuration are untouched.


DS 15.9.0 is published from main 1f548ca83327e2aead2059af8cb42402c9ca3c19.
PR #151 passed CI/Sonar; exact-main checks and publication dry run 45809661717
passed before release 45810126521 succeeded. Jadera pins registry 15.9.0 and
uses complete ShellPreferencePanel with showContentWidth, one DS provider and
DS containers for project/catalog/resource/management centers. No local width
store, per-row preference geometry or alternate language select remains.
Runtime DOM checks verify DS locale panel/focus, width persistence and storage
events, current scope selection, resource meters/tooltips, project cards and
actual knowledge/template routes.

Local Next compilation, type checks and static generation pass; Windows
standalone packaging fails on EPERM creating symlinks. Do not weaken packaging
or claim a successful production build from that local run. Linux CI build
remains the required release evidence. RUYIN UI peer-range mismatch and browser
pixel acceptance stay explicit; no Jadera release tag is cut for this batch.
