# Liaison request: platform credentials to connect vxtpl login + subscription

- Stamp: 2607211320 (2026-07-21 13:20 UTC)
- From: vxture-template line
- To: platform line (owns OIDC issuer, platform API, provisioning webhook signer)
- Status: open - awaiting platform-line credential issuance

## Context

The demo product `vxtpl` is deployed and live on worker02
(`https://vxtpl.vxture.com`, verified via `/api/health` and `/api/status`; see
`docs/80-liaison/10-2607211400-vxtpl-edge-vhost-request.md` for the edge
handoff). All three platform-integration channels (C1 login, C2 entitlement,
C3 provisioning/usage) are **implemented and offline-verified** (contract
tests green, `/entitlement-matrix` demonstrates C2 gating), but **none are
live-connected** - `/api/status` on the running instance currently reports:

```json
"c1": {"enabled": false, "clientSecretConfigured": false}
"c2": {"resolver": "mock", "platformApiConfigured": false, "authTokenConfigured": false}
"c3": {"webhookSecretConfigured": false, "internalJobTokenConfigured": true}
```

This means: a real user cannot log in through `accounts.vxture.com`, the
subscription/entitlement data shown is fabricated Mock data (not a real
account's real tier), and the platform cannot push provisioning events to
vxtpl. Closing these three gaps is entirely platform-side credential issuance
+ template-side `.env` values on the deploy host - no further template code
is required.

## Request (platform line) - three credential grants

### 1. C1 - OIDC client secret (enables real login)

Register `vxtpl` as an OIDC relying party (or confirm existing registration)
and issue a client secret.

| Field | Value |
|---|---|
| `client_id` | `vxtpl` |
| `issuer` | `https://accounts.vxture.com` |
| `redirect_uri` | `https://vxtpl.vxture.com/auth/callback` |
| `post_logout_redirect_uri` | `https://vxtpl.vxture.com/` |
| `scopes` | `openid profile email phone` |
| role gate | `org:owner`, `workspace:owner`, `workspace:manager` (scope-prefixed; no bare `admin`) |

Deliver: the issued **client secret** (out-of-band, not over this doc/PR).
Template-side: set `OIDC_CLIENT_SECRET` + `OIDC_RP_ENABLED=on` in
`/srv/md0/vxtpl/etc/.env` on worker02, restart the app container.

### 2. C2 - platform API base + S2S auth token (enables real subscription data)

Issue the internal-network platform API base URL and a service-to-service
auth token so vxtpl's entitlement resolver can query real subscription/tier
data instead of Mock.

| Field | Value |
|---|---|
| Consumes | `PLATFORM_API_URL` (internal-network base) |
| Consumes | `PLATFORM_INTERNAL_AUTH_TOKEN` (shared internal-auth S2S secret) |
| Effect once both set | `/api/status` `c2.resolver` flips from `"mock"` to `"platform"` |

Deliver: the base URL (can go in this doc/PR - not secret) + the S2S token
(out-of-band). Template-side: set both in the same `.env`.

### 3. C3 - provisioning webhook signing secret (enables real supply events)

Issue the HMAC signing secret the platform's provisioning system uses to sign
webhook calls to vxtpl (`t=<ts>,v1=<hex-hmac>` scheme, raw-byte verify).

| Field | Value |
|---|---|
| Consumes | `PROVISION_WEBHOOK_SECRET` (current signing key) |
| Consumes | `PROVISION_WEBHOOK_SECRET_NEXT` (optional, rotation overlap) |
| Webhook target | `POST https://vxtpl.vxture.com/provisioning/webhook` |

Deliver: the signing secret (out-of-band). Template-side: set in `.env`.

## Acceptance (per channel, after credentials land)

- **C1**: browser round-trip through `/auth/login` -> `accounts.vxture.com`
  -> `/auth/callback` sets the `__Host-vx_rp_session` cookie; `/api/status`
  shows `c1.enabled: true`, `c1.clientSecretConfigured: true`.
- **C2**: `/api/status` shows `c2.resolver: "platform"`,
  `c2.platformApiConfigured: true`, `c2.authTokenConfigured: true`; a real
  workspace's tier/status reflects on the app instead of Mock defaults.
- **C3**: platform sends one real provisioning event; vxtpl returns 200 and
  the event is observable as applied (idempotent replay of the same event
  returns 200 without double-applying).

## Non-secret values only in this document

Per repo secret hygiene (public repo, no private fallback): only
non-secret identifiers appear above (`client_id`, `issuer`, URLs, scopes).
Every secret value (client secret, S2S token, webhook signing key) must be
delivered out-of-band (e.g. a secrets manager, a private channel) - never
pasted into this doc, a PR, or a commit.

## Infra reference (product_240 section 2.7)

vxtpl -> host worker02 / port 3232 / stack_root `/srv/md0/vxtpl` / apex
`vxtpl.vxture.com` / `.env` at `/srv/md0/vxtpl/etc/.env` (600, host-only).
