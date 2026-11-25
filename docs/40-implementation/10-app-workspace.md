# The app workspace

## Layout

A pnpm workspace under `portals/`, per the governance
source-directory slots:

```
portals/
  app/                  @bidproposal/app     - the Next.js 15 application (App Router)
    workbench/                              - draft browser transport, no page renderer
  desktop/              @bidproposal/desktop - RUYIN transport and package build
  packages/shared/      @bidproposal/shared  - identity, presentation and shared data types
  packages/workbench/   @bidproposal/workbench - shared business pages and task definitions
```

`@bidproposal/shared` owns `BRAND`, the single source of product identity, as well
as host-neutral presentation and data types. Presentation receives data/callbacks
without importing Web authentication, API clients or native bridges. Everything
that names the product - the health payload, C2
entitlement lookups, the C3 webhook's wrong-product check - reads
`BRAND.productCode` from there. Never derive the product code from
`OIDC_CLIENT_ID`: the beta client is `bidproposal-beta` while the product code stays
`bidproposal`, so on any non-prod stack the two diverge and every attribution is wrong.

`@vxture/shared` (note the different scope) is the published org package, resolved
from GitHub Packages. It owns the health-identity helper and the subscription
value domains. Import from it rather than re-implementing - a local copy of
`TIERS` is what TD-001 was about.

## Shared application direction

The owner confirmed Web-first delivery on 2026-11-25. The existing desktop
candidate supplied the six-stage business UI and models. Their single source
now lives in `portals/packages/workbench/src`. Desktop transport is confined
to `portals/desktop/src`, and Web transport to `portals/app/workbench`. No
business panel reads the host origin or receives RUYIN messages directly.

Keep the business modules independent of DOM-host transport and expose runtime
facilities through adapters. The existing desktop bridge request/response,
revision checks, candidate adoption, evidence snapshots and task recovery
behavior are migration inputs to preserve. Host navigation, file access,
download locations and job execution are runtime concerns. The Web adapter
must enforce the verified product session and workspace on its server;
client-supplied workspace identifiers cannot establish authority.

Build Web assets and the RUYIN package from the same page/module source. Test
business behavior once and exercise each environment adapter separately. Do
not introduce a new proposal content shape that discards the existing saved
document contract. Keep the original dirty desktop checkout intact while
bringing its implementation into the reviewed product branch.

Cloud synchronization is outside this release. Reserve compatibility through
the common data format and adapter boundary only; add no synchronization UI,
API, replication store or background process. Cloud storage for Web documents
does not imply that desktop-local projects are uploaded or synchronized.

The shared asset collector includes the existing Markdown sanitizer, parser,
PDF viewer and their licenses. Both outputs use the same normalized page and
module bytes. Only environment bootstrap, transport and browser navigation
chrome differ. Shared `contract.mjs` owns the existing task/prompt assembly;
desktop packaging adds version, minimum runtime and UI digest afterwards.
The current public capability contract remains unchanged pending Web runtime
acceptance. Do not switch public APIs to the expanded contract independently.

Example module imports:

```js
import { mountWorkbench, mountLibrary } from '@bidproposal/workbench';
import { businessContract } from '@bidproposal/workbench/contract';
```

The independently invented Web editor and the later horizontal workflow
preview were rejected. Their build/render entry is removed. The draft browser
transport requires an explicitly attached presentation callback and forwards
the complete workflow metadata; it cannot silently substitute navigation.
Its draft paths and project ID assumptions are not a published server contract.
The product entry remains unchanged pending full application migration.

The complete baseline is [50-desktop-baseline.md](50-desktop-baseline.md):
RUYIN host chrome, project catalog, settings/files, sidebar workflow/timing,
library, task/review controls and Bid's six business panels. Do not equate the
product iframe contents with the whole application. Review the baseline before
attaching a Web renderer or implementing workspace/file/job services.

Desktop packaging pins the published `@vxture/ruyin-cli` 0.2.0 build API:

```bash
pnpm --filter @bidproposal/desktop build
pnpm --filter @bidproposal/desktop verify
```

It produces an explicitly unsigned candidate, not a released installation.
No RUYIN checkout path is required. Verification runs two real builds and checks
the actual package/UI hashes and byte equality; the existing CI build job runs
it before the Web artifact. Production signing and trusted installation remain
separate acceptance steps.
`pnpm --filter @bidproposal/app test` includes the shared business suite and
both transport suites so the existing required CI test job covers them.

## Local development

```bash
pnpm install                 # needs NODE_AUTH_TOKEN for the @vxture scope
cp .env.example .env
pnpm dev                     # http://localhost:4070
```

An empty `.env` works: entitlement and chat fall back to mock resolvers, and
`/api/chat` resolves against a local dev workspace rather than demanding a
session, so every page is explorable with no credentials. `MOCK_TIER` /
`MOCK_STATUS` / `MOCK_BUNDLED` drive the mock entitlement resolver to any
tier x status combination, which is how the gating logic gets exercised without a
platform.

Both affordances are gated on `DEPLOY_STAGE` (`app/lib/deploy-stage.ts`), which
the image always sets from the git ref. On `production` or `beta` the mock
resolvers refuse to start and chat requires a real session. That guard is the
whole difference between this and the old `DEMO_WORKSPACE_ID`, which applied on
every stack: a deployed app resolving entitlement for a workspace nobody owns
grants or denies paid access on the strength of an env var, with a badge on a
status page as the only signal.

The gates CI runs, in the order they are cheapest to fix:

```bash
pnpm type-check:all
pnpm test
pnpm lint:docs-numbering
pnpm lint:data-design
```

## How a chat turn flows

`/chat` is the surface worth reading first, because one user action exercises the
whole integration chain:

1. **Session** - `api/chat/route.ts` resolves the RP session cookie to an
   `AuthUser` plus the raw access token (`auth/lib/session.ts`). No session, no
   turn: the workspace is what entitlement is scoped to, what the S2S token is
   minted against, and what Atlas attributes the call to.
2. **Entitlement** - `entitlement/resolver.ts` resolves the workspace's tier via
   C2 (45s cache, invalidated by C3, stale-on-error, fail-closed).
3. **Gate** - `entitlement/capability.ts` checks the selected model and skill
   against `CAPABILITY_MATRIX`. This happens before anything is spent: an
   ungated selection is a 403 with no token minted and no capability invoked.
4. **Token** - `lib/s2s-token.ts` mints an on-behalf-of S2S token by RFC 8693
   exchange. Tokens live 300 seconds and are cached per (audience, mode,
   identity) with a 30-second margin. See ADR-003 for why there is no
   `ATLAS_S2S_TOKEN`.
5. **Skill** (optional) - `chat/skill-runner.ts` runs the Runos loop:
   discover -> resolve -> invoke -> report_outcome. It searches the catalog
   rather than hard-coding capability ids, because the entitled catalog is
   per-caller and changes without bidproposal redeploying. A skill that cannot run
   degrades the turn instead of failing it.
6. **Inference** - `chat/atlas-client.ts` posts to Atlas `/v1/chat`, threading
   any skill result into the prompt.
7. **Metering** - `usage/lib/buffer.ts` records one `bidproposal.chat.messages` event.
   Deliberately not token counts: Atlas meters model tokens itself under
   `atlas.chat`, so reporting them here would double-count. A metering failure
   is logged and swallowed - it must not fail a turn the user already waited for.

## Things that look wrong but are not

- **`tenantId` on the Atlas request is a UUID from the token, not the product
  code.** Sending the product code appears to work while a grant exists, then
  fails with `400 INVALID_TENANT_ID` when it does not - an error that reads like
  a payload bug. A non-UUID also silently writes NULL into Atlas's request log,
  so the traffic vanishes from tenant rollups with no error at all.
- **`assertInternalTarget` accepts dot-less hostnames.** A single-label name
  cannot resolve on public DNS, so `http://worker-02:3100` is internal by
  construction - and that is exactly how the platform line publishes the Atlas
  and Runos base URLs.
- **A chat turn's Runos call mints on-behalf-of.** Not because service mode is
  unavailable (Runos accepts it since v0.6.0) but because the call is made by a
  person: OBO is what lets the platform derive the workspace from a verified
  token instead of trusting our claim, and what gives Runos a real end user to
  attribute the capability call to.
- **`usage` is absent rather than zero when Atlas reports nothing.** Zeros there
  would be a claim about consumption rather than the absence of one.
- **A Runos Skill returns instructions, not a result.** Runos distributes skills
  and never executes them, so a `result_kind: "distributed"` invoke hands back
  the skill's own content for bidproposal's runtime to use. Connectors and Executors
  return a payload; the skill runner handles both.
- **Prisma generates the client; it is not the schema authority.** `deploy/database/ddl/`
  is, and `db-init.yml` is the only thing that applies it. There is no migrations
  directory on purpose, and `check-data-architecture.mjs` enforces that the two
  stay in lockstep.

## Tests

`node:test` via `tsx`, colocated as `*.test.ts`. They are offline by
construction - no test reaches a network - which is what lets `test-coverage` be
a required check that never flakes.

The suite is not uniform coverage; it is weighted to the places where being wrong
is expensive: the OIDC claim bug-guards (`auth/lib/claims.test.ts` encodes two
confirmed platform integration bugs so they cannot come back), webhook signature
verification and rotation, flush 409-terminal semantics, and the status page's
no-secret-leak invariant.

The three client test files (`lib/s2s-token.test.ts`, `chat/atlas-client.test.ts`,
`runos/client.test.ts`) exist for a narrower reason: they pin wire details that
fail *quietly*, and that nothing local can reproduce. A `_meta` block one level
too deep, an `accept` header missing one media type, a `tenantId` that is a
product code instead of a UUID, a `usage` block of zeros that means "unreported" -
each of those either works until it suddenly does not, or reports the wrong thing
forever without erroring. Those tests are the only place that knowledge is
checkable without a live platform.

## Product-owned Web runtime

The original project UI and durable Node adapters are consumed from published
`@vxture/ruyin-workbench-ui` and `@vxture/ruyin-node-runtime` 0.2.2. The cookie-only
`/api/workbench/**` adapter determines organization/workspace from the verified
Bid session, uses its C2 coverage and member assignment, and pins background
execution to its original Bid subject/scope/session. Runtime auth records are
excluded from business document reads; platform/provider tokens stay server-side.

Server projects use the same encrypted document/task/file formats in a dedicated
namespace under `BID_RUNTIME_DATA_DIR`, backed by the product's own persistent
worker02 volume. `BID_RUNTIME_MASTER_KEY` is a protected 32-byte hex server key;
absence or malformed configuration fails closed. Back up that key with its data.
This host has one app process and exclusive volume ownership. It does not provide
multi-instance writer coordination, cross-region storage or desktop synchronization.
The existing PostgreSQL contract/authz/usage store remains separate and unchanged.

`portals/app/document-engine/layout.py` merges the selected OOXML template,
refreshes TOC/page fields and produces DOCX/PDF through headless LibreOffice.
Macro/external-resource updates are disabled and active content is rejected.
The canonical fixed reader and hash-locked dependencies are copied from the
published runtime at build time. The production image installs their dependencies,
Noto CJK/Carlito and the layout engine; it never installs customer-supplied code.
