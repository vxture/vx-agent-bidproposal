# Native resource presentation

## Scope - 2026-11-26

Continue B7 by connecting the accepted knowledge/template presentation to the
existing native library bridge. Keep the exact DS card/list controls, equal card
heights, half-document stacks, version selection and original-text viewing.
Move the complete resource presentation into the shared package rather than
maintaining a second native implementation. Web keeps its authenticated cookie
adapter; native keeps the existing product/workspace-scoped library credential.

Build the native React/CSS bundle into the independent unsigned product package.
No private host source import, new native HTTP endpoint, product-secret delivery
or project synchronization is introduced. Existing six-stage assets and product
documents remain unchanged. The host still owns its project chrome, reviews,
library scope and local storage. An isolated resource acceptance must not modify
the user's installed product or retained demonstration data.

Verify the scoped adapter, exact shared source and package closure, then perform
one phase regression and actual isolated library browser acceptance. Keep the
current Web release on v0.3.2; these changes do not warrant a Web redeployment.

Platform native identity issue #198 remains open as rechecked on 2026-11-26.
This resource-only work does not resolve live native model invocation, B7 host
chrome integration or publisher signing/trusted installation acceptance.

## Local phase acceptance

The unsigned 1.18.0 candidate builds twice to identical bytes. Package SHA-256:
`8238af1835bf9c53a13efd3b994e952c13ee9fed75199f44d6c08cc71e87f8ce`.
UI SHA-256: `66cf0d8f4cb731cf5bca412b4e98afc1c8e74ed8f7c4c95fe236fb7a8444863f`.
The actual archive check compares every original business asset except the replaced
library entry byte for byte, verifies the compiled library's two local module
imports and refuses Web API/Next dependencies or unresolved CSS imports.

One full-phase run passed 313 App, 107 shared business and seven native transport
tests (427 total), all workspace type checks and the applicable static guards.
Follow-up work repeated only the affected package verifier, whose first import
check used an overbroad regular expression; its corrected JavaScript AST check
passes. Required PR/main CI remains the integration gate.

An isolated loopback parent used the published ProductBridge and ProductLibrary
with its existing library token and encrypted SQLite/file store. The packaged UI
loaded two knowledge resources and four real two-page Word templates. The fixed
published source reader completed all six originals. Browser acceptance verified
the template/knowledge switch, DS Card/List controls, template original blocks and
version dialog. All four cards measure 275.33px high at both the default 578px
viewport and the 1367px desktop breakpoint, matching Web's accepted height.

The native resource adapter imported an actual revised DOCX as v2, refused a stale
v1-based write, preserved the old hash/original text and reopened the encrypted
library without changing any records. The browser then displayed the retained v2.
This route acceptance is distinct from actual native file-picker acceptance:
the browser automation backend could not target cross-origin frame clicks and
did not receive its file-chooser event. Keyboard navigation verified the other
controls; the unverified picker step is not marked passed.

Evidence is outside the repository under the task's `native-resource-surface`
directory: phase test/type logs, adapter/reopen JSON and `native-templates.jpg`.
No production service, installed product, retained demonstration account data,
platform code or worker01 configuration was modified. This is a resource-surface
candidate; B7 host integration, own-product native identity and signing remain
separate incomplete gates.
