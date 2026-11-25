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

Configuration is saved and independently read back. Original v0.2.7 health and
readiness are healthy. Product brand source is a local candidate, not yet a
release. The domain is live; commercial-code migration remains a platform gate.
Do not describe catalog configuration as deployment of the new product UI.
