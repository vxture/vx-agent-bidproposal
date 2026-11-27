# Shared document workbench validation

Owner authorizes a standalone ONLYOFFICE Docker validation on worker02 for
Jadera first, with future reuse by other products. No platform code changes.

## Isolated service

Official Document Server 10.0.0.1 is digest-pinned. Separate Compose project,
network, data directories and server-generated JWT secret. No published host
port and no changes to Jadera's serving containers. Inspect capacity first;
deploy requires 6 GiB available RAM and 40 GiB available disk. Community edition
is a technical evaluation; commercial licensing and concurrency remain a gate.

## Integration gates

The browser requires an approved HTTPS editor route. The document service must
fetch short-lived signed file URLs and submit JWT-authenticated save callbacks.
Product sessions are never shared with Document Server. Save must verify
document/version/owner, reject stale revisions, restrict download origin and
retain originals as immutable versions. Do not enable general private-network
or metadata fetches. Current deployment only checks health and editor API;
it does not establish DOCX editing acceptance.

## Acceptance

Use real retained DOCX copies: tables, images, headers/footers, sections,
numbering, TOC, fonts, page count and export. Open, edit, callback save, reopen
and compare against Word. Also verify expired tickets, forged callbacks,
read-only permissions, concurrent save conflicts and reduced-width UI.
The shared OfficeEditor wrapper is preliminary; no production route uses it.

## Deployment evidence 2026-11-27

PR #55 merged. Protected inspection 45861617162 passed: 17,202 MiB available
RAM and 1.7 TiB available disk, Docker 29.4.3. Deployment 45862357031 passed:
jadera-office-validation running, healthcheck=true and editor API HTTP success.
JWT remains enabled; no host port published. Jadera v0.3.11 readiness still
reports configuration, database and Redis healthy. Browser/document round-trip
acceptance is not yet performed; public HTTPS route and scoped save bridge remain.


## Integration progress 2026-11-27

Authenticated library version file retrieval now reads original stored bytes.
Office config signing uses per-resource/version/content keys and explicit
read-only permissions. Callback contract verifies HS256 and restricts save URLs
to the configured document-service origin. Targeted tests and app types pass.
These helpers are not yet exposed as a live editing session or save endpoint.
HTTPS entry selection is pending; no browser round-trip success is claimed.

## L1 direction supersedes product-local deployment 2026-11-27

Owner selects Office as L1 shared document capability using Atlas/Runos calling
patterns. Proposed registry block 3130-3139, production 3130, beta 3131 reserved,
office.vxture.com, worker02. Issue platform #755 updated for authoritative
registration; no port is claimed locally before registry confirmation. Platform
S2S/OBO must terminate at an Office adapter, not raw Document Server; native
ONLYOFFICE JWT stays internal. Browser assets/WebSocket, session authorization,
file tickets and save callbacks need a separate explicit contract. Existing
isolated container remains evaluation only. Previous office.ruyin.work routing
proposal is superseded. No platform source or worker01 edits authorized.

Product bridge prototype now includes encrypted eight-hour file/session tickets,
pinned RP reauthorization, origin-restricted signed callback handling and
immutable version import on final save. Force-save is disabled pending repeated
save/session version semantics. Three contract tests pass. This prototype is
not deployed: owner requires platform S2S/OBO Office adapter; raw native JWT
bridge must not silently replace that architecture. L1 session contract gap
filed separately after routing #755 closed.
