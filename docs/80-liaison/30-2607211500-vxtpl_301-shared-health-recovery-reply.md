# Liaison reply: vxtpl_301 recovered - @vxture/shared wired, health deviation closed

- Stamp: 2607211500 (2026-07-21 15:00)
- From: vxture-template line
- To: platform line
- In reply to: `docs/20-specs/220-vxtpl/10-vxtpl_301_shared-150-health-import-2607212159.md`
- Status: closed - recovery complete, reporting per section 3.4 / the new deviation discipline

## Acknowledgement

Acknowledged the finding: the template's `/api/health` implementation was a
vendored stopgap (`portals/packages/shared/src/health.ts`, built earlier the
same day to satisfy standard 025 before `@vxture/shared` published a real
helper) that deviated from 025's "single shared helper" clause without being
declared - no TD entry, no report to the platform line. Confirmed and
corrected; see `docs/60-operations/00-index.md` TD-002 for the retroactive
registration this letter closes out, filed per the new deviation discipline in
`140-repo-governance-standard.md`.

## Recovery (vxtpl_301 section 3, all four items)

1. `package.json`: `@vxture/shared@^1.5.0` added to `portals/app/package.json`,
   installed (local dev unblocked by `gh auth refresh -s read:packages`;
   `pnpm-lock.yaml` updated).
2. `/api/health` now `import { buildHealthIdentity } from "@vxture/shared"`;
   the vendored identity-assembly copy is deleted
   (`portals/packages/shared/src/health.ts` + `version.ts`, no longer needed -
   `status.ts` and the landing page now call `@vxture/shared`'s
   `serviceIdentity()` directly too).
3. Provenance ENV injection (`APP_VERSION`/`GIT_SHA`/`BUILD_TIME`/
   `DEPLOY_STAGE`) was already wired in `portals/app/Dockerfile` (runner-stage
   `ARG->ENV`, honest `dev`/`unknown` defaults) and derived from git tag/sha/
   date in `.github/workflows/build.yml` - unchanged by this recovery, already
   matched the pattern this letter references.
4. TD register: `docs/60-operations/00-index.md` TD-001 (the related
   entitlement-value-domain wiring, same `@vxture/shared@1.5.0` release) and
   TD-002 (this deviation, retroactively registered) both closed 2026-07-21.

Also noted CI's `pnpm install --frozen-lockfile` steps (`ci.yml` `build` /
`test-coverage` jobs) needed `NODE_AUTH_TOKEN` added - previously unset because
no `@vxture/*` dependency existed yet. Now set from the existing org secret; no
new secret was needed.

## Verification

- `@vxture/shared`'s `TIERS`/`SUBSCRIPTION_STATUSES` confirmed byte-identical
  to the prior local copy (order included - load-bearing for representative-
  status precedence).
- `buildHealthIdentity()` smoke-tested directly (`node -e "import('@vxture/
  shared')..."`): honest `dev`/`unknown` fallback with no env set, matches 025
  section 6 exactly.
- Full local verification green: type-check (shared + app), 64/64 tests,
  docs-numbering + data-architecture guardrails, `git diff --check`, no
  secrets in the diff.
- CI on the PR: all five required checks green, including `build` (confirms
  `NODE_AUTH_TOKEN` resolves `@vxture/shared` from GitHub Packages in CI) and
  `audit` (osv-scanner clean against the new dependency).
- Merged: PR #28, `main` at `26688e9`.

## On the new deviation discipline (acknowledged, no objection)

Read `140-repo-governance-standard.md`'s new execution-model section. Going
forward: any standard clause this repo cannot yet satisfy because an upstream
dependency is not ready gets (1) an inline comment at the implementation site
citing the clause, (2) a same-day TD entry (clause / reason / recovery
condition), (3) a liaison report - before merge, not after platform discovers
it via cross-check. No open question back to the platform line on this letter.

## Not yet closed (separate, already-open liaison items - unaffected)

For completeness, two earlier open requests to the platform line remain
outstanding and are unrelated to this recovery:
`10-2607211400-vxtpl-edge-vhost-request.md` (already resolved per prior
exchange - edge vhost live) and
`20-2607211320-vxtpl-platform-credential-request.md` (C1/C2/C3 live-connection
credentials, still open).
