#!/usr/bin/env bash
# @package @bidproposal/app
# @layer Infrastructure
# @category test
# @author AI-Generated
# @date 2026-11-24
# Verify the deploy gate against controlled responses without Docker or a host.
set -euo pipefail
source_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
stage="$(mktemp -d -t bid-verify.XXXXXXXX)"
cleanup() {
  case "$stage" in */bid-verify.*) rm -rf -- "$stage" ;; *) exit 1 ;; esac
}
trap cleanup EXIT
mkdir -p "$stage/deploy" "$stage/etc" "$stage/bin"
cp "$source_root/deploy/deploy.sh" "$stage/deploy/deploy.sh"
printf 'APP_PUBLISH_PORT=4070\n' > "$stage/etc/.env"
printf 'services: {}\n' > "$stage/deploy/docker-compose.yml"
cat > "$stage/bin/docker" <<'DOCKER'
#!/usr/bin/env bash
printf '%s\n' "$*" >> "$BID_VERIFY_LOG"
case "$*" in
  *'/api/health'*) test "$BID_VERIFY_HEALTH" = ok ;;
  *'/api/ready'*) test "$BID_VERIFY_READY" = ok ;;
  *'compose '*) exit 0 ;;
  *) echo 'Unexpected Docker operation' >&2; exit 99 ;;
esac
DOCKER
printf '#!/usr/bin/env bash\nexit 0\n' > "$stage/bin/sleep"
chmod +x "$stage/bin/docker" "$stage/bin/sleep"
export PATH="$stage/bin:$PATH" BID_VERIFY_LOG="$stage/calls"
export BID_VERIFY_HEALTH=ok BID_VERIFY_READY=ok
bash "$stage/deploy/deploy.sh" verify > "$stage/output"
grep -q 'verify OK (health and readiness 200' "$stage/output"
grep -q '/api/ready' "$stage/calls"
export BID_VERIFY_READY=fail
if bash "$stage/deploy/deploy.sh" verify > "$stage/output"; then
  echo 'Liveness incorrectly masked a failed readiness check' >&2; exit 1
fi
grep -q 'verify FAILED' "$stage/output"
! grep -q 'verify OK' "$stage/output"
export BID_VERIFY_HEALTH=fail BID_VERIFY_READY=ok
: > "$stage/calls"
if bash "$stage/deploy/deploy.sh" verify > "$stage/output"; then
  echo 'A failed liveness check passed verification' >&2; exit 1
fi
! grep -q '/api/ready' "$stage/calls"
echo 'Bid deployment readiness gate: 3 scenarios passed'

# A stalled primary registry must reach the fallback, and two failed registries
# must never recreate the serving stack. The mock timeout returns immediately.
cat > "$stage/bin/timeout" <<'TIMEOUT'
#!/usr/bin/env bash
printf 'timeout %s\n' "$*" >> "$BID_VERIFY_LOG"
shift 2
exec "$@"
TIMEOUT
cat > "$stage/bin/docker" <<'DOCKER'
#!/usr/bin/env bash
printf 'docker %s\n' "$*" >> "$BID_VERIFY_LOG"
case "$*" in
  'pull ghcr.io/vxture/bidproposal-app:sha-test') exit "$BID_PRIMARY_EXIT" ;;
  'pull backup.test/vxture/bidproposal-app:sha-test') exit "$BID_FALLBACK_EXIT" ;;
  'tag '*) exit 0 ;;
  'compose '*) exit 0 ;;
  *) echo 'Unexpected Docker operation' >&2; exit 99 ;;
esac
DOCKER
chmod +x "$stage/bin/timeout" "$stage/bin/docker"
export IMAGE_TAG=sha-test FALLBACK_IMAGE_REGISTRY=backup.test FALLBACK_IMAGE_NAMESPACE=vxture
export BID_PRIMARY_EXIT=0 BID_FALLBACK_EXIT=0
: > "$BID_VERIFY_LOG"
bash "$stage/deploy/deploy.sh" start > "$stage/output"
grep -q 'timeout --kill-after=10s 180 docker pull ghcr.io/' "$BID_VERIFY_LOG"
! grep -q 'docker pull backup.test' "$BID_VERIFY_LOG"
grep -q ' up -d' "$BID_VERIFY_LOG"
export BID_PRIMARY_EXIT=124
: > "$BID_VERIFY_LOG"
bash "$stage/deploy/deploy.sh" start > "$stage/output"
grep -q 'timeout --kill-after=10s 600 docker pull backup.test/' "$BID_VERIFY_LOG"
grep -q 'docker tag backup.test/' "$BID_VERIFY_LOG"
grep -q ' up -d' "$BID_VERIFY_LOG"
export BID_FALLBACK_EXIT=1
: > "$BID_VERIFY_LOG"
if bash "$stage/deploy/deploy.sh" start > "$stage/output"; then
  echo 'Two failed registry pulls incorrectly passed deployment' >&2; exit 1
fi
! grep -q ' up -d' "$BID_VERIFY_LOG"
echo 'Bid deployment image pull: primary success, timeout fallback, double failure passed'
