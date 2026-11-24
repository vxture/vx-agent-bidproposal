# 40-implementation - Package guides, coding rules, dev setup

Layer/package guides, coding conventions, and local dev setup for this repo.

| Doc | Covers |
|-----|--------|
| [10-app-workspace.md](10-app-workspace.md) | the pnpm workspace layout, `@bidproposal/*` packages, local dev, and how the integration modules fit together |
| [20-creating-a-product-from-bidproposal.md](20-creating-a-product-from-bidproposal.md) | copying this repo into a new product: the rename script, the name cascade, and what a human still owns |
| [30-product-front-door.md](30-product-front-door.md) | the access gate every product reuses: verify on entry, one-call resolution, and why the middleware is deliberately dumb |
| [40-challenge-game.md](40-challenge-game.md)（范本示例，非本产品） | the game module's layering (engine / rules / store / surfaces), the three copy rules, and the traps already paid for |
| [50-desktop-baseline.md](50-desktop-baseline.md) | complete desktop baseline: host chrome, workflow/timing, product pages, runtime facilities, evidence and Web migration inventory |
| [60-runtime-adaptation-preflight.md](60-runtime-adaptation-preflight.md) | verified package/identity boundaries, Linux reading, layout fidelity failure, runtime adaptation and complete UI reuse prerequisites |

Each workspace package carries a thin `AGENTS.md` at its root pointing back here;
the substantive guidance lives in this decade under `NN-slug.md`.
