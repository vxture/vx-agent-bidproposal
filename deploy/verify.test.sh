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
