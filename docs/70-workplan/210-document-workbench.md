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
