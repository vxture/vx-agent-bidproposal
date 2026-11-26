#!/usr/bin/env bash
set -euo pipefail
root=/srv/md0/bidproposal/onlyoffice-validation
mode=${1:-inspect}
echo '[office] host capacity'
free -m
df -h /srv/md0
docker version --format '{{.Server.Version}}'
docker ps --format '{{.Names}} {{.Status}}'
if [ "$mode" = inspect ]; then
  # Disposable public sample only: signed config contains no integration secret.
  python3 - <<'PY'
import json,base64,hmac,hashlib,time
secret=open('/srv/md0/bidproposal/onlyoffice-validation/office.env').read().split('JWT_SECRET=',1)[1].splitlines()[0].strip()
config={'documentType':'word','document':{'fileType':'docx','key':'jadera-visual-'+str(int(time.time())),'title':'DOCX editing preview.docx','url':'https://static.onlyoffice.com/assets/docs/samples/demo.docx','permissions':{'edit':True,'download':True,'print':True}},'editorConfig':{'mode':'edit','lang':'zh-CN','user':{'id':'visual-review','name':'Reviewer'},'customization':{'autosave':False,'forcesave':False}}}
enc=lambda x:base64.urlsafe_b64encode(json.dumps(x,separators=(',',':')).encode()).decode().rstrip('=')
payload=enc({'alg':'HS256','typ':'JWT'})+'.'+enc(config)
config['token']=payload+'.'+base64.urlsafe_b64encode(hmac.new(secret.encode(),payload.encode(),hashlib.sha256).digest()).decode().rstrip('=')
print('OFFICE_PREVIEW_CONFIG='+json.dumps(config,separators=(',',':')))
PY
  echo '[office] gateway mounts and networks'
  docker inspect ruyin-nginx --format '{{json .Mounts}} {{json .NetworkSettings.Networks}}'
  echo '[office] gateway virtual hosts and certificate paths'
  docker exec ruyin-nginx nginx -T 2>&1 | grep -E 'configuration file|server_name|ssl_certificate |proxy_pass|listen ' || true
fi
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
