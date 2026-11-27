# Template and knowledge file workbench

## Confirmed scope

Improve template management and knowledge resources first, using one shared
file workbench. DOCX/XLSX/PPTX use the existing ONLYOFFICE service; PDF uses
PDF.js; Markdown uses ReactMarkdown/remark-gfm rendering and a source editor;
PNG/JPEG/WebP/GIF use the shared image viewer. No additional format containers.

## Delivery sequence

1. Shared format allowlist and original-file retrieval. Preserve immutable
   versions and source download regardless of extraction success.
2. Replace extracted-text-only viewing with a full-size file workspace:
   title/version/actions at top, preview center, optional details panel. Use DS
   controls and page structure. Both collections invoke the same component.
3. Image: fit/original size, zoom/pan, rotation, download; GIF play/pause with
   static fallback. PDF: pages, thumbnails, search, zoom and download. Markdown:
   source/preview/split, editing, dirty-state protection and versioned save.
4. Office: view/edit session, load/error/retry, final-save new version, reopen
   verification. XLSX formulas/charts and PPTX layout receive separate checks.
5. Upload intake: drop/select, format/size validation, progress/cancel/retry,
   version conflict handling. Upload state and AI extraction state are distinct.

## Existing boundary requiring implementation

The published runtime ProductLibrary accepts only PDF/DOCX/MD and immediately
starts extraction. Do not merely expand the browser input: images/XLSX/PPTX
must retain original bytes and versions without pretending extraction support.
Implement a compatible product adapter or obtain a runtime package extension;
never modify installed dependencies. Current upload limit remains 20 MiB until
backend storage and edge limits are deliberately changed together.

## Acceptance

Actual file rendering and edit/save/reopen, not only HTTP success. Keep prior
versions intact. Test foreign workspace, expired sessions, stale versions,
oversized and mismatched files, viewer failure and unsaved navigation. Never
send private files to public conversion services. Office preview acceptance
does not establish production callback acceptance.

## UI

Same geometry and actions across template/knowledge cards. Collection header
uses DS ViewHeader; search/filter/view switch stay in the toolbar. File type,
version and update time are primary metadata. Extraction status belongs to
management details and does not block viewing the original file.

## Management implementation 2026-11-27

Resource display name/type are durable metadata, independent of immutable
version filenames. PATCH requires stored revision and records actor/before/after.
Types remain inside the original collection. New-version import requires latest
version and metadata revision; it retains display name and previous file hashes.
Upload intake now selects first, confirms explicitly, and retains errors/retry.
Card/list/detail expose edit-information and upload-version actions separately.

Product adapter stores images/XLSX/PPTX as original versions without claiming AI
extraction. Image signatures and upload byte limits are validated. Existing
PDF/DOCX/MD extraction remains available; reference is retained as a legacy type.
The Web host supplies authenticated Blob retrieval and Office session callbacks.
Original viewer is separate from parsed text. PDF currently uses browser PDF
viewing, not the planned PDF.js controls; Markdown source/preview is read-only
until editing and dirty-state save handling land. Office backend is not yet
configured/deployed for product saves. Native adapter parity and browser QA are
still pending. Do not label this entire workbench production-complete.

## Approved HTML alignment (2026-11-27)

Implement the approved information and version pages locally: shared DS tabs,
form and table, upload initiated only through a DS dialog, pending upload status
at the top of the version tab and result feedback. No synthetic upload percent.
Reading space modes preserve the header for content expansion and hide it for
focus. Format-specific pagination controls remain owned by the actual viewer.
## HTML reconciliation follow-up

The first local preview was not equivalent to the approved design: it replaced
Office bytes with extracted Markdown, left the preview AI trigger disconnected,
and omitted the reading controls. Reconcile these before claiming acceptance.
PDF now uses the pinned PDF.js renderer and bundled matching worker; continuous
pages, four layout options and current-page navigation operate on real pages.
Office viewing obtains a read-only signed session automatically. Editing remains
an explicit action and is hidden for historical versions. Do not fabricate
Office pagination in the outer shell: the Office viewer owns that operation.

## Whole-page content width (2026-11-27)

Apply the DS ContentWidthContainer to the resource page frame as a whole, including
its heading, tabs and panels. Default preferences retain 1200 / 1536 / 1920 caps.
Only expanded/focused reading lifts the cap; it must not unmount the reader.
Do not show an empty version picker when there are no original files. Represent
missing files as a purposeful empty state with an upload action, and use the
original-file adapter only for versions that actually exist.

## Information browse/edit states (2026-11-27)

The information panel is left-aligned within the shared 1536 default page frame,
with a 1440 inner ceiling. Retain two columns when space permits. Default to
read-only data; Edit opens the form with Save and Abandon actions. Save success
returns to browse state; failures preserve the draft; Abandon restores persisted
values without a request. All three navigation tabs use 14px / 600 typography.

The 1536/1440 rule applies to the entire resource page: default outer cap 1536
includes two 48px gutters, leaving 1440 for the heading, navigation and every
panel. Responsive gutters shrink on smaller widths. Version history must not
add a second centered container or extra horizontal inset. Expanded/focused
reading alone removes the shared cap and gutters.

## Complete resource metadata (2026-11-27)

Keep the Edit action ghost. Support description (1000 characters), usage notes
(2000), and up to ten tags (24 each) alongside name/category. Persist validated
metadata with revision checks and audit history; preserve it through uploads and
Office saves. The host supplies organization/workspace display names. New uploads
record the verified creator/updater; historical missing identities stay unknown.
The read-only panel shows record timestamps and file version details from data.

## Separate details and document pages (2026-11-27)

Supersedes the resource Tabs layout. A single constrained details page displays
resource information and version history as two stacked sections. Open actions
navigate to a document route (/file/<version> within the resource hash route),
with browser Back support. This route defaults to full content width, preserves
the global header and AI toggle, and supports focus mode hiding header chrome.
Focus changes do not remount the actual reader. The format-specific reader owns
zoom and page layout. Metadata drafts and detail scroll survive a reader visit.

All ownership and creation/update records belong in the left information column;
the right column contains only file artwork, version summary and Open actions.

Version history shares the information form's responsive left-column track.
Keep its table, separator and upload action within that column. Upload uses the
DS ghost button and aligns to the same trailing edge as the metadata Edit action.

## Public resource identity and information hierarchy (2026-11-27)

Internal UUIDs are never user-facing text or route labels. Allocate a persistent
workspace-scoped business number (TPL/DOC-date-sequence), allow validated unique
custom numbers, and show it first in Resource information. Add a short document
name used by resource cards and the document title. Preserve both through new
versions and Office saves. Use three consistent sections: resource information,
resource ownership, and version information; 14px base text. The right side uses
A4 artwork as the open action, without a duplicate read-file button. Usage notes
contain domain requirements only; never populate them with UI instructions.

Details use the DS ViewHeader divider (dashed), not a product solid border.
Remove the inner details scroller: heading and all three sections flow naturally;
only the whole page scrolls when needed. File readers retain their own document
scrolling. Business numbers are also used by resource navigation routes.

The detail cover reuses the very same ResourceArtwork and ResourcePreview as the
resource cards, including tenant short name, icon, short document title, category,
paper decoration, rules and seal. Only the A4 geometry differs. The ViewHeader
also uses resourceTitle, matching cards and the independent document page.

The original filename and version/size summary sit above the A4 cover, replacing
"Current file". Do not repeat that summary underneath the artwork.

## People and change sources (2026-11-27)

Creator/updater/uploader refer to verified user ids with display-name and avatar
snapshots. Their sources are separate fields (upload, local import, metadata
maintenance, Office edit, API import). Display the person first, then the source
in muted parentheses; never substitute an import mechanism for a person's name.
New versions retain the original creator and earlier version actors. Product
handlers obtain actors from the authenticated principal, never from upload input.

## Reference history and standard card (2026-11-27)

The right column uses the full ResourceVisualCard component with its normal
height, width 100% of the column, no A4 overrides. Below it, References is an
open vertical list (project/compilation name, responsible person, pinned resource
version, selectedAt timestamp, archive state). GET library/<id>/references
reverses existing runtime library pins across accessible project compilations;
unpinning removes a reference and replacing the resource never updates pinned
versions. No reference is fabricated for preview; an unreferenced resource is
shown as such. Project names navigate through the host's existing project route.

File identity and References are peer sections of Resource information,
Resource ownership and Version information: use h2 with the same 16px/600
heading style and spacing. File/version auxiliary text remains subordinate.

## Shared card insets (2026-11-27)

ResourceVisualCard owns one fixed 276px height everywhere: 184px artwork, 90px
footer and two 1px outer borders. Footer content uses 12px top, 16px sides and
16px bottom padding; title is 20px, actions 32px with an 8px gap. This explicitly
replaces DS CardFooter's assumption that the parent supplies bottom padding.
Only width adapts in home, collections and the detail aside. No page-specific
height or footer inset overrides are permitted for these shared cards.

Resource card metadata, both inner groups and every inline action control are
32px high in all surfaces, independent of DS density-derived button height.
The outer 276px card and footer insets stay shared and unchanged.

Shared resource status badges sit at the top-right of the card, above its artwork.
They do not occupy the footer title row or alter the fixed card/footer dimensions.

## Card artwork fits its container (2026-11-27)

Decorative paper layers are bounded by top/bottom insets inside the existing
184px preview, not 320px sheets cropped by overflow. The identity, two-line short
title, category, rules and small seal fit that height. The status uses an opaque
DS card background, foreground text and a border for contrast over paper layers.
Overall card height stays 276px in every context.

## Global resource card actions (2026-11-27)

Card artwork, title and blank space enter Resource details. The footer keeps
Open (DS primary button) / More at 32px, without a redundant Details action;
More uses a 32px box and 24px icon. Open
navigates to the card's immutable displayed version in view mode. Detail-page
cards omit self-navigation and the redundant Details action. Control clicks,
menu actions, text selection and pointer scrolling must never bubble into the
card navigation. Metadata edit/upload/version/reference shortcuts have explicit
destinations. Home, collection cards, list rows and detail cover share this rule.

Local implementation verified on 2026-11-27: Web and preview routes preserve the
displayed version. The shared reader requests a view session before an explicit
edit request. The preview's existing signed Office evaluation fixture still
grants edit rights; its view-only session needs re-signing at the service and is
not accepted as a read-only integration check. The local machine cannot resolve
the worker02 signing host. No service or credential settings were changed.
DS DropdownMenu shortcuts enter metadata editing, the upload dialog, version
information or reference records. Downloads read the displayed version's bytes.
The HTML kit includes the same shared cover/action example at
resource-template.html#management/collection and the knowledge counterpart.
Type checks pass across all packages; both resource service regressions pass;
DOM interaction checks cover home, collection, list, detail, menu isolation,
selection/drag guards and 32px/24px sizing. HTML build/inventory and five kit
checks pass. This batch is local only; no production release was requested.

Owner follow-up: remove Usage notes from both read and edit forms; keep the
single Description field. Stored historical usageNotes are preserved. Document
opening and editing are separate actions: Open always requests view mode;
Edit is explicit, with Return to viewing. Historical versions cannot enter edit.
The reader validates the signed mode and edit permission before mounting Office;
an edit-only configuration cannot masquerade as the default viewing session.
Pending Office changes disable Return to viewing until the editor reports saved.
Resource information, ownership and versions now share one continuous left
column. The right cover keeps Open / More, with Download current version as its
only menu item; collection menus retain management shortcuts. User provided
worker02's Tailscale address; SSH times out because this local machine currently
routes it via WLAN and has no active Tailscale connection. The existing signed
edit fixture is retained; no unsigned or modified JWT is used for viewing.

## Global main-content scroll hint (2026-11-27)

One shared PageScrollHint observes the active main page's actual scroll viewport.
Show a subtle down chevron while content remains below; at the end show
"-- Reached the bottom of the page --" (localized in the UI). Anchor it 6px from
the viewport bottom, with 12px muted text / 14px icon, no panel, reserved footer,
or layout changes. It is decorative and never intercepts pointer interaction.
Use the same component in the Web shell and local preview; replace the former
project-only footer. Recalculate after route, content, viewport and panel width
changes. Sidebars, menus, dialogs and iframe document internals are not inferred
as page scroll state; a readable same-origin project frame can supply its actual
scrolling element. HTML samples follow the same global frame behavior.

Verified locally: all package type checks pass; HTML build/inventory and five
suite checks pass. Simulated viewport interaction checks cover down/end states,
short pages, asynchronous content growth, return scrolling, side-panel isolation,
content width changes, route reuse, and no duplicate project footer. The live
local preview is rebuilt; no production deployment is included.

## One document bar and centered reader states (2026-11-27)

Remove the stacked document heading and original-file toolbar. One document bar
owns Back, identity, version, viewer controls, mode, Download, explicit Edit and
Focus. Format-specific viewer controls join the bar without adding another row
at desktop widths. Narrow screens may wrap this one bar. Browsing remains the
default and history read-only. Reader failures use a centered DS EmptyState with
Retry and Download original in the available reading area; loading uses the same
placement. Retry performs real file/session requests. Existing reader content is
retained when an edit/view transition fails. HTML design follows this composition.

Verified: all package type checks pass. Document interaction checks confirm one
bar, real retry requests, exact-version downloads, focus/exit without losing the
bar, Markdown/image toolbar composition, and preserved view/edit permissions.
Reader startup failures (Office, PDF, image) enter the same centered state. HTML
template/knowledge samples validate one bar, error/loading layout and retry
behavior; five kit checks pass. Live Office read-only signing remains blocked by
the disconnected local Tailscale path; no successful live read is claimed.

## Detail columns and document controls refinement (2026-11-27)

Owner swaps References to the left after ownership, and Versions to the right
below the current file card. Versions use lightweight neutral cards without
artwork/shadows: version/latest, filename/type/size, actual uploader/time, Open
and More (download that immutable version). Keep upload at the section heading.
Document mode sits beside the title; right actions are icon buttons (download,
four-corner focus), explicit Edit, then version selector. The focus symbol must
differ from the global header's diagonal fullscreen symbol. Collection search
uses DS InputGroup with an explicit leading addon and no inner fixed input width;
reset controls stay square 32px and cannot shrink. HTML and preview stay aligned.

Default product typography uses 14px body/values, 12px filters/secondary text,
16px page/section headings, 14px card/document headings and primary actions,
10px limited decorative captions. Brand marks and original document body
typography keep their own rules. The same scale is published in the HTML design
guide and implemented in the offline pages, not only written in Markdown.

Validation: all package types pass. Product interaction checks cover three
immutable versions, descending order/latest badge, per-version file retrieval,
read-only history, management shortcuts, title-adjacent mode, icon/Edit/version
ordering, corner focus and Escape, leading DS search, filtering/reset, square
32px controls, and computed 16/14/12px type roles. Matching template/knowledge
HTML checks and generated design-guide content pass; kit inventory and all five
package checks pass. Local preview rebuilt; production remains unchanged.

## Markdown reading and back navigation (2026-11-27)

Markdown modes use Reading / Source / Compare (localized); hints explain each.
The reading viewport owns a centered 880px document column with independent
document typography, restoring headings, paragraph spacing, bullets/numbering,
quotes, code, task lists and horizontally scrollable tables after Tailwind reset.
Source uses a separate monospaced surface; split keeps both readable. Product
interface type scale must not flatten original document headings. Resource and
document Back controls use the DS arrow-left icon and the single label Back,
with destination in the tooltip. HTML includes the same Markdown reading example.

Verified with the retained Markdown sample and a separate semantic fixture:
24/20/16px document heading hierarchy, 14px body, 880px reading width, paragraph
spacing, restored unordered/ordered lists, quotes, table overflow, fenced/inline
code and task lists. Raw HTML remains disabled. Reading/Source/Compare labels,
hints and both Back destinations pass, as do existing knowledge/version/download
flows. HTML reading example and five kit checks pass; visual browser acceptance
is not claimed from these DOM/style checks.

## Markdown full-width editing correction (2026-11-27)

Owner rejects the added 880px reading cap: Markdown fills the document viewport
with normal gutters, independent of the management-page width. Compare displays
Reading on the left and Source on the right (top/bottom on narrow screens).
Latest Markdown exposes explicit Edit, Save and Discard in the document bar;
editing starts in Compare with a live reading preview and source textarea.
Save uploads UTF-8 Markdown through the existing versioned resource path, checks
the base version/revision, preserves original bytes and navigates to the saved
version. Failed or conflicting saves retain the draft. History stays read-only.
Unsaved changes block route/version changes and warn before refresh/close; users
save or discard explicitly. Offline HTML follows the composition without
claiming persistence to the product backend.

Owner then selects two centralized reading layouts: Page (default, 1536px outer
frame / 1440px content with 48px gutters) and Print (A4, 20mm page margins).
The switch floats at the reading pane's top right; it does not create another
header. These layouts are independent of Reading/Source/Compare and work while
editing. In Compare the reading pane stays left, editable source right. Print
CSS removes application chrome and uses named A4 pages; no browser print dialog
is opened by switching the layout.

Floating means an overlay: no reserved toolbar row, pane padding or added top
spacer. The reader keeps its ordinary 24px content gutter in either layout;
the switch stays absolutely positioned at the viewport's upper-right corner.

Owner's visual correction: unify the switch at 32px with centered 12px labels,
instead of forcing 28px items inside the DS small-control frame. Keep at least
32px from the viewport edge was the initial correction, superseded below.
The control remains outside document flow in both layouts.

Previous owner alignment: fix the switch's left edge to the version selector's left
edge above. Use a document-canvas overlay, independent of the reading column and
paper width. Share the selector width (168px desktop / 120px narrow) and header
edge gutter (24px / 16px). Page/Print, Reading/Compare and document scrolling
must not change this alignment. The switch does not reserve a row or content gap.

Verified the final shared alignment in the product and both HTML resource
examples across Page/Print, Reading/Compare, scrolling, editing and focus.
The overlay belongs to the full document canvas, not the paper/reading column.
Shared-package types and HTML inventory/five kit checks pass; local preview
revision is rebuilt. Visual browser acceptance remains unverified.

Latest owner direction supersedes version-selector alignment: keep the switch
at the document canvas's upper left, 24px from the left and top. It uses its
content width, independent of the version control, paper width and split pane.
Page/Print, Reading/Compare and scrolling keep the same overlay position.

## Project card hover-only feedback (2026-11-27)

Owner rejects persistent selection styling on project cards. Remove click-focus
lift, outline, expanded accent and filled Open treatment; these remain hover
feedback only. Remove the execution-specific perimeter glow/orbit, which can be
mistaken for selection. Background task state remains visible through the
working text/spinner and segmented progress sweep. Keep the DS keyboard-only
focus cue on the actual action. Apply the same visual rule to the HTML kit.

Verified the rebuilt local preview: card click/focus keeps its resting border,
shadow, outline and transform; hover rules and task spinner/progress sweep remain.
HTML build/inventory and five kit checks pass; diff whitespace check passes.

## Quiet reading layout control (2026-11-27)

Owner asks for a single faded transparent button at rest. Keep the fixed 24px
upper-left anchor and reveal Page/Print beside it only on hover, focus or click.
Use a 32px DS ghost icon action with an accessible label and expanded state.
Pointer exit, focus leaving, outside interaction and Escape collapse the options;
Escape returns focus to the trigger. Switching layouts preserves content and
scroll. Match the HTML design without rerendering the page on hover.

Verified the product and both HTML resource examples: resting trigger is the
transparent faded 32px DS book icon; hover/focus/click reveal the choices,
pointer exit/outside interaction/Escape collapse, and Escape returns trigger
focus without exiting document focus mode. Layout changes retain the article
node, scroll offset and editor/draft. Shared-package types, HTML inventory and
five kit checks pass. Local preview rebuilt; visual acceptance remains pending.

Verified locally: Page/A4 switching, overlay positioning with no reserved row,
Reading-left/Source-right, live Markdown editing, discard without writes, dirty
route/unload protection, conflict draft retention and save locking. A real local
sample save produced version 4 and reopened with the retained UTF-8 content;
historical versions remain read-only. The same HTML reading/edit/discard/sample
save checks pass for templates and knowledge. HTML inventory plus five kit tests
and product diff whitespace checks pass. Package type checks passed for this
batch. The preview is rebuilt; direct browser inspection is unavailable in this
chat, so these checks do not constitute pixel or browser-print acceptance.

## Production release boundary (2026-11-27)

Owner authorizes shipping the current resource workbench and interface changes.
Production release includes metadata/business numbers/short names, actor records,
original downloads, image/PDF/Markdown readers, Markdown versioned save, reference
history, card operations, global scroll cues and the quiet layout control.

Office L1 session contract remains open at platform issue #756. The release
exposes an authenticated fail-closed session response only: no shared Document
Server JWT, direct native file ticket or save callback is enabled by environment
variables. Preserve the native bridge prototype separately for adapter work.
Office originals remain downloadable; online Office viewing/editing is unavailable
until the platform adapter exists. Do not present a public sample as production
file acceptance. No platform configuration, database schema or worker01 changes.

Local full test run passes after correcting product CSS variable namespaces;
PATCH now resolves the verified updater display profile as POST already does.
