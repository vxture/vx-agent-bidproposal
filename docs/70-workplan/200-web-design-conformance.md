# Web design conformance

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
