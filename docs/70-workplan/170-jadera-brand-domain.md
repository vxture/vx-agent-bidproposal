# Jadera brand and domain cutover

## Owner decisions, 2026-11-25

English brand: Jadera. Chinese brand: 瑜章. Complete name:
瑜章 · 投标方案智能体. Use the selected pen-nib mark. Web and desktop
are two environments of the same product, sharing subscriptions, entitlements,
quota and usage. Project synchronization remains outside this release.

The target code is `jadera` and the target domain is `jadera.ruyin.work`.
The existing published commercial code remains `bidproposal` until an in-place
platform migration preserves its product UUID, plans, subscriptions, grants,
usage history and client relationships. Do not copy the product, re-subscribe
customers or run the new-product repository rename script on this stack.

The owner authorizes existing configuration and necessary controlled database
corrections. Platform code work belongs to the platform task. This product task
does not edit platform source or platform environment. The owner subsequently
authorized a separate one-time use of the existing generated-map publication
and graceful Nginx reload for the Jadera domain. That permission is now exhausted;
it does not authorize further worker01 operations or dynamic-routing code.

## Configuration acceptance

Opera now stores the complete Chinese product name and English name Jadera.
Both Web and desktop support are enabled. The original stable confidential
client shows `Jadera · 瑜章` and retains its identity, PKCE, scopes and logout
participation. Exact Jadera login/logout callbacks are added alongside the
working original callbacks.

The uploaded transparent 512-square PNG is 7,898 bytes, with checksum
`641c330332a30b75382691915a2a6436`. Its platform-hosted public URL is:

`https://app.ruyin.work/api/applications/bidproposal/icon?v=641c330332a30b75382691915a2a6436`

Anonymous retrieval returns 200/image/png and bytes matching the original
SHA-256; conditional retrieval returns 304. The client logo uses this URL.
The uploaded icon did not populate `product.products.icon_url`; an explicitly
authorized, backed-up transaction populated that one existing product field.
Product UUID, five plan versions and the existing subscribed record retain
identical association digests before and after. No schema or commercial-data
change was made. The RUYIN public catalog now exposes the new names and icon.

## Product source batch

Update `BRAND`, entry/workbench product marks, entry text, browser metadata,
public logo files and shared contract display name. Keep contract product ID,
API attribution, package scope, database, encrypted runtime, Redis, volumes,
service roles, credentials, deployment stack and image identity unchanged.
The unsigned desktop candidate advances to 1.17.4. Signed publication and
own-product native identity remain separate gates, as recorded in batch 160.

Release the brand through the product's existing feature PR, exact required
checks, squash merge, main checks and protected tag deployment. Retain the
accepted Jadera production origin. Do not include the separate B7 layout
prototype or change the six-stage business application in this brand release.

## Platform handoff and domain acceptance

[Platform #750](https://github.com/vxture-platform/vxture-platform/issues/750)
tracks this handoff and the supported published-product code migration.
[Platform #741](https://github.com/vxture-platform/vxture-platform/issues/741)
tracks route reconciliation without routine manual Nginx reloads.

The owner requested the same temporary publication procedure used for the
original Bid route. Opera now registers the new edge domain, home URL, Webhook
and back-channel logout. Worker02 changed only OIDC_REDIRECT_URI,
OIDC_POST_LOGOUT_REDIRECT_URI and NEXT_PUBLIC_APP_URL. The real Compose preview
allowed only the app recreation with its exact original v0.2.7 image. Database/
Redis IDs and every non-origin environment value, including the master key,
remain unchanged.

The existing platform renderer generated exactly eight routes. Its candidate
replaced only `bidproposal.ruyin.work` with `jadera.ruyin.work`; the seven other
routes are identical. After backup, an atomic map replacement, successful
nginx syntax validation and graceful reload made the new domain live. All
vhost hashes, platform container IDs and the Nginx master PID remained unchanged.
The former domain is no longer in the single-domain map; compatibility aliases
remain platform work rather than a handwritten product vhost.

Public health/readiness pass for v0.2.7 / 8a1d9014. The browser completed actual
customer SSO at the new origin and opened the original subscribed workspace and
project, including all six completed stages and the six-page saved export.
Restricted rollback backups are `/srv/vxture/backups/jadera-domain-20261125T104753Z`
and `/srv/md0/bidproposal/backups/jadera-domain-20261125T104734Z`. No database,
Redis, encrypted project or provider credential was reset.

## Current checkpoint

The owner refined the title to the pen-nib mark, Chinese short name and the
short descriptor at one matching 18px size, using Yucer's 32px mark and 8px gaps.
PR #30 merged as 1ab26146 with all exact PR/main checks and Sonar passing.
Release v0.2.8 was cancelled before protected deployment so this title refinement
can ship together with the brand in one product recreation. Production remains
v0.2.7 at the working Jadera origin. No rollback of the accepted domain is needed.

Protected release run 45605077737 deployed v0.2.9 / 0089245b after PR #30 and #31
and both exact main revisions passed all required checks and Sonar. The approved
image digest is `sha256:8e69bccd38ba33184c6557e833b1828ba4b75bf4b6887dea57af946d960a22cf`.
The ACR mirror matched the exact CI/GHCR digest and supplied the stalled GHCR
layer. Approved PNG bytes, production provenance and the real app-only Compose
preview passed before protected deployment was approved under the owner's
current completion authorization. No required review rule was changed.

Public health/readiness now identify v0.2.9 / 0089245b. The existing customer
session reopens the original project and six completed stages with saved
six-page output. Its live product mark measures 32px; Chinese name and descriptor
both measure 18px, separated by 8px. Original DB/Redis IDs, encrypted volume and
byte-identical current origin environment/master key remain unchanged. The
product release backup is
`/srv/md0/bidproposal/backups/jadera-brand-v028-20261125T110733Z`; the folder was
prepared before cancellation of v0.2.8 and reused for the accepted v0.2.9 image.

The domain and product branding are live. Commercial-code migration and signed
desktop identity/install remain open. The 1.17.4 candidate is reproducible and
unsigned. B7's complete homepage/administration/workflow/assistant prototype is
still local review material, not part of this production branding change.
