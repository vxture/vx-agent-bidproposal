# Liaison note: vxtpl app port reassigned 3232 -> 3210

- Stamp: 2607241900 (2026-07-24 19:00)
- From: platform line
- To: vxture-template line
- Status: closed - platform-side edge vhost updated, template-side host and
  docs updated to match

## Context

The platform line reassigned the demo product `vxtpl`'s upstream port on
worker02 from `3232` to `3210` and has already updated the shared edge vhost
(`vxtpl.vxture.com` -> `vx-worker-02:3210`) per
`docs/80-liaison/10-2607211400-vxtpl-edge-vhost-request.md`. That original
letter and `docs/80-liaison/20-2607211320-vxtpl-platform-credential-request.md`
are left unedited as historical record of the original `3232` allocation.

## Template-side changes (this letter)

- `APP_PUBLISH_PORT` repo variable: `3232` -> `3210`.
- `/srv/md0/vxtpl/etc/.env` on `vx-worker-02`: `APP_PUBLISH_PORT=3210`,
  container recreated via `docker compose ... up -d` to bind the new port.
- `docs/50-deployment/20-github-bootstrap-checklist.md` infra allocation
  updated to `3210`.

## Acceptance

- `curl https://vxtpl.vxture.com/api/health` returns 200 (edge -> new upstream
  port, verified end-to-end).
- `docker exec vxtpl-app wget -qO- http://127.0.0.1:3000/api/health` returns
  200 on the host (container-internal port is unchanged at 3000; only the
  host-published port moved).
- Host listens on `3210`, no longer on `3232`.

## Infra allocation (for the registry, product_240 section 2.7)

vxtpl -> host worker02 / port 3210 (was 3232) / stack_root `/srv/md0/vxtpl` /
apex `vxtpl.vxture.com`.
