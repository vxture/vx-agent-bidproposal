# Bidproposal Web and desktop release

Owner direction, 2026-11-24: one agent product, `bidproposal`, with two
surfaces. Platform integration is configuration only through existing
product onboarding and commerce pages. Do not change platform source code
or server environment variables. Preserve the current platform contract.

| Batch | Scope | Acceptance |
| --- | --- | --- |
| B1: product API | Product-owned identity and C2 read, publishable standalone build, webhook entry, production-safe Web entry | Build from reviewed source; run the standalone artifact and probe public, protected, and unavailable paths. Leave subscription sales off. |
| B2: API release | Existing product workflow and approved product/domain registration | Deployed service identity and contract verified over HTTPS; no template demo in production. Configuration gaps that need server-variable changes stop the release. |
| B3: two deliverables | Web workspace and independent signed RUYIN package | Same product code, different build outputs and interaction. Both may ship different features. Do not publish the desktop artifact from the RUYIN installer release. |
| B4: subscription pilot | Existing Opera/Admin/Console configuration and one real workspace | Publish one product plan; verify login, shared entitlement, quota and usage, revocation, and no duplicate counting. |

## Product and platform boundaries

- The platform owns product plans, subscriptions, entitlements, quotas, and
  usage. The commercial scope is the existing workspace plus product, with
  no Web or desktop dimension. A surface may display a subset.
- Web uses the product's own Accounts RP. RUYIN uses its Workbench session
  for identity and entitlement summaries. Desktop business cloud calls
  require an approved product authentication path; they cannot reuse a
  Workbench session handle as a product bearer or grant Atlas/Runos to RUYIN.
- The product backend owns Bid business operations. Atlas meters its own
  inference once against the calling product. If Bid needs a separate
  product metric, register it through the existing catalog and use the
  existing C3 path from the product backend, for both surfaces. The template
  sample game and debug chat are not product usage producers.
- Web deployment, desktop package signing, and commerce activation are
  separate releases. No new data-sync behavior is implied by sharing
  subscription data.

## B1 local scope

Reuse the existing product C2 token exchange for Web access and capability
authorization. Keep the existing access/entitlement response shapes. A C2
outage must not become an offer to subscribe. Keep the existing public
contract and health paths, make the contract trace explicit, and keep the
template and diagnostics unavailable to visitors on deployed stages. The
first Web entry identifies the product and its preview state; real browser
project workflows follow separately. Use synthetic dependencies to verify the
local artifact; do not deploy or change configuration as part of this batch.

## CoSpace reference

Reviewed [CoSpace main at d8197eb](https://github.com/vxture/vxture-cospace/tree/d8197eb52344c19ede687e2823ca7b96b0eacb27).
Reuse its product-owned OBO C2 read, separate user-bound product assignment,
and reviewed-main release tag gate. The two platform decisions are distinct:
workspace coverage comes from C2, and assignment from the existing
`/platform/product-access`. An unavailable decision is not a denial or an
offer to subscribe. Neither Web nor the product capability endpoints use the
template's shared credential.

For platform configuration, use CoSpace's observed sequence: deploy and verify
product endpoints, complete the existing Opera onboarding checks, publish one
plan in Admin, then subscribe a real pilot workspace in Console. Production
readiness and the platform's post-subscription signals are separate. Do not
fabricate usage signals or copy CoSpace's product classification, prices,
ports, secrets or environment settings. Bidproposal is an agent product.

## B1 verification

- The production-shaped Next.js standalone artifact built and ran without its
  source checkout. Smoke checks covered the product identity, contract/ETag,
  unknown product handling, removal of the public template game and debug
  paths, and anonymous access/webhook refusal.
- A loopback authority and session store drove the compiled APIs with signed
  user claims. Covered Web and capability entry, two workspaces, missing
  coverage, missing member assignment, C2/assignment outage, shared platform
  quota values, and no provider invocation before access checks. Product
  app tests: 254 passed. No live provider calls or production credentials.
- The template usage flush is unavailable on deployed stages. A production
  webhook cannot acknowledge an in-memory delivery when persistence is absent.
  A separate real product-owned usage producer is deferred until a metric and
  actual operation exist; Atlas inference is not counted twice.
- Production deployment remains gated: the product GitHub repository does
  not yet show a production Environment, and the candidate domain has not
  passed public HTTPS acceptance. Do not push a release tag until the existing
  reviewed deployment path is available. No live registration or server
  configuration has been changed by B1.
