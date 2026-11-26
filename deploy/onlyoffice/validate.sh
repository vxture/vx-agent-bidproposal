#!/usr/bin/env bash
set -euo pipefail
root=/srv/md0/bidproposal/onlyoffice-validation
mode=${1:-inspect}
echo '[office] host capacity'
free -m
df -h /srv/md0
docker version --format '{{.Server.Version}}'
docker ps --format '{{.Names}} {{.Status}}'
if [ "$mode" = inspect ]; then exit 0; fi
test "$mode" = deploy
# Leave the currently serving product untouched; refuse inadequate capacity.
available_mb=$(awk '/MemAvailable:/ {print int($2/1024)}' /proc/meminfo)
available_kb=$(df -Pk /srv/md0 | awk 'NR==2 {print $4}')
test "$available_mb" -ge 6144 || { echo 'At least 6 GiB available RAM required'; exit 1; }
test "$available_kb" -ge 41943040 || { echo 'At least 40 GiB free disk required'; exit 1; }
mkdir -p "$root"
cd "$root"
if [ ! -f office.env ]; then
  umask 077
  printf 'JWT_SECRET=%s\n' "$(openssl rand -hex 32)" > office.env
fi
test -s office.env
docker compose -f compose.yml pull
docker compose -f compose.yml up -d
for attempt in $(seq 1 90); do
  if docker exec jadera-office-validation curl -fsS http://127.0.0.1/healthcheck | grep -qx true; then
    docker exec jadera-office-validation curl -fsS http://127.0.0.1/web-apps/apps/api/documents/api.js >/dev/null
    echo '[office] healthcheck and editor API passed'
    docker inspect jadera-office-validation --format '{{.Config.Image}} {{.State.Status}}'
    exit 0
  fi
  sleep 5
done
echo '[office] startup failed; product container was not changed'
exit 1
