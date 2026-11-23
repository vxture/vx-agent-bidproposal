# configs/edge - public-edge vhost source

The public origin for Bid is `https://bidproposal.ruyin.work`. The existing
shared edge terminates TLS for `*.ruyin.work` and proxies to the approved
product runtime using the Opera registration.

- `bidproposal.vxture.com.conf` is the inherited example for the retired
  candidate name. **Do not install it.** Register Bid's allocation in the
  [Vxture port registry](https://claude.ai/code/artifact/0f44735a-c6bc-4881-a440-3446a2411a5f)
  before preparing the live route.

## Release checks

1. Confirm the approved runtime and allocated port. The existing
   `*.ruyin.work` edge accepts TLS for the Bid hostname.
2. Use the existing Bid record in Opera. Only after the upstream is ready,
   set it and use the existing edge synchronization workflow. A separate
   Nginx vhost is not required.
3. Verify that `https://bidproposal.ruyin.work/api/health` reports
   `product=bidproposal` and the released Git SHA.

The upstream must agree with the product's published port; DNS alone
does not establish the application route.
