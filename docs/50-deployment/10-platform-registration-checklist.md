# Platform-side registration checklist

Platform-line actions that must exist before a product repo can make a real call.
They are code-external: performed in the platform repo and platform consoles, not
here. Authority: `product_240_repo-template.md` section 2.8.

**State for bid (2026-09-05): nothing below exists yet.** The platform seed
(`deploy/database`) carries no `bid` row of any kind. Every item was requested,
with provisional names, in vxture-platform/vxture-platform#198; that issue is the
single place where a name change or a completed step gets recorded. An
unregistered product gets a plausible-looking `400 invalid_client` or
`400 invalid_target` and no hint about which of these steps is missing.

## Blocker that is not a registration item

- [ ] **OBO subject_token audience.** `token-exchange.service.ts`
      (`resolveOboContext`) rejects any subject_token whose `aud` is not the
      caller's own client id. bid's subject_token comes from the Ruyin desktop
      login (`aud='ruyin'`), so every OBO mint by bid is `400 invalid_request`
      until the platform picks one of the two options in #198 section 1
      (Ruyin requests `aud=bid` via RFC 8707 `resource`, preferred; or a
      delegation table consulted by `resolveOboContext`). Spec
      `docs/20-specs/30-capability-surface.md` section 4.

## Directory and plan

- [ ] **bid** product row in the platform product directory (`product.products`,
      `product_code='bid'`, `status='active'`, name 标书编写). The contract's
      `product.id='vxture.bid'` is ruyin-side and needs nothing here.
- [ ] Plan structure (subscription tiers) seeded for the product (provisional
      `bid-free`), or provisioning coverage. Without either, the subscription leg
      of the S2S coverage gate cannot be satisfied.

## OIDC (customer realm)

- [ ] **bid** OIDC client registered, realm = customer, status active,
      `client_id='bid'`.
- [ ] `bid-beta` client: **deliberately not requested** - bid is prod-only. A
      copy that wants a beta tier registers both, since the double client is
      canonical (back-channel logout is a single-URI hard constraint).
- [ ] `client_secret_hash` provisioned; secret delivered out of band. **This same
      client_id/client_secret pair is also the S2S credential** (ADR-003 of the
      template) - there is no separate S2S secret to request.
- [ ] `redirect_uri=https://bid.vxture.com/auth/callback`,
      `post_logout_redirect_uri=https://bid.vxture.com/`,
      `back_channel_logout_uri=https://bid.vxture.com/auth/backchannel-logout`
      (host provisional).
- [ ] Allowed scopes `openid profile email phone`. Nothing needs adding for S2S:
      the exchange grant never reads `allowed_scopes` and derives the minted
      scope from the audience alone.
- [ ] **`oidc_clients.product_id` backfilled to the product row.** Easy to miss
      because it is separate from registering the client and registering the
      product, and it is what makes `act.sub` resolve. Without it every token
      exchange answers `400 invalid_client` even with a correct secret. Verify:
      `select p.product_code from appoidc.oidc_clients c join product.products p on p.id = c.product_id where c.client_id = 'bid'`
- [ ] Ruyin-to-bid relation registered (`ruyin`, a client-type product, may
      request the `bid` audience / act for bid) - whichever form the platform
      chooses in #198 section 1.

## Workspace coverage (gates every S2S call)

- [ ] The product must be **provisioned into each workspace it will speak for**,
      or hold an active/trialing subscription there. This is the S2S D2 gate, and
      it checks coverage by the **calling** product - bid calling Atlas for
      workspace W requires *bid* to cover W; Atlas's own coverage is irrelevant.
      Absent, minting fails with `400 invalid_target`.

## Provisioning webhook (C3)

- [ ] **bid** registered in `product_webhooks` with its delivery address
      (`BID_WEBHOOK_BASE_URL`) - requested once a deploy host exists.
- [ ] `BID_PROVISION_WEBHOOK_SECRET` live on the platform side and transported
      to the deploy host.

## Provider grants (not the platform line's to do; tracked here so they are not forgotten)

- [ ] **Atlas**: a product-grant per endpoint the product calls -
      `(product_code, endpointCode)`, created by an Atlas operator in opera.
      Without one, every call is `403 GRANT_DENIED` regardless of how valid the
      token is. bid's catalog is `chat/cheap`, `chat/default`, `chat/pro`.
      There is no runtime way to discover or verify this from the product side
      (`GET /v1/models` is not grant-filtered and the endpoint registry is
      operator-only), so it is liaison-maintained: adding a model to
      `chat/catalog.ts` means asking for the endpoint to exist AND be granted.
- [ ] **Runos**: capability-grants for `subjectType: "product"`, `subjectRef:
      "bid"` (`POST /commerce/capability-grants`), consulted only when the
      deployment sets `RUNOS_ENTITLEMENT_ENFORCED` (production does not today,
      vxture-runos#116). Requested in vxture-foundation/vxture-runos#14 together
      with the skill catalogue. A product cannot self-grant.

## Secrets transport

- [ ] All secret values are owner-transported - never committed, never sent over
      insecure channels. Org-level shared credentials (ACR, tailscale, npm token)
      are configured once at the org and shared to the repo, not duplicated.
