#!/usr/bin/env bash
# Turn a fresh Ubuntu 24.04 box into a World Zero host. Run ONCE, as root:
#
#   scp deploy/bootstrap.sh root@<server-ip>:/tmp/
#   ssh root@<server-ip> 'bash /tmp/bootstrap.sh'
#
# This script is the reason "migrate servers as we need to" is a property and
# not a hope: the box holds no configuration that is not either in this repo or
# in the two .env files you fill in afterwards. Rebuilding on new hardware is
# this script, five DNS records, and a restore.
#
# Idempotent — safe to re-run. It does NOT deploy the app; CI does that.
set -euo pipefail

log() { printf '\n==> %s\n' "$1"; }

[ "$(id -u)" -eq 0 ] || { echo "Run as root." >&2; exit 1; }

log 'deploy user'
if id deploy >/dev/null 2>&1; then
    echo 'already exists'
else
    adduser --disabled-password --gecos "" deploy
fi

log 'authorized keys for deploy'
install -d -m 700 -o deploy -g deploy /home/deploy/.ssh
if [ -s /root/.ssh/authorized_keys ]; then
    # Seed from root's keys so you are never locked out between here and the
    # CI key being added. Append rather than overwrite: re-running must not drop
    # the CI deploy key you added later.
    touch /home/deploy/.ssh/authorized_keys
    while IFS= read -r key; do
        [ -n "$key" ] || continue
        grep -qxF "$key" /home/deploy/.ssh/authorized_keys \
            || printf '%s\n' "$key" >> /home/deploy/.ssh/authorized_keys
    done < /root/.ssh/authorized_keys
    chown -R deploy:deploy /home/deploy/.ssh
    chmod 600 /home/deploy/.ssh/authorized_keys
else
    echo 'WARNING: root has no authorized_keys to copy.' >&2
    echo 'Add a key to /home/deploy/.ssh/authorized_keys before the sshd step.' >&2
fi

log 'docker'
if command -v docker >/dev/null 2>&1; then
    echo 'already installed'
else
    curl -fsSL https://get.docker.com | sh
fi
# root-equivalent on this box, and the accepted trade for a one-person project.
# The mitigation is that the key reaching it is CI-only and revocable by
# deleting one line from authorized_keys.
usermod -aG docker deploy

log 'firewall'
# Mostly decorative: Docker writes its own iptables rules AHEAD of ufw's, so any
# container publishing a port is public whatever ufw says. That is why nothing
# in deploy/docker-compose.yml publishes one except Caddy. Kept because it does
# still cover anything running outside Docker.
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable

log 'directories and the shared network'
docker network inspect edge >/dev/null 2>&1 || docker network create edge
install -d -o deploy -g deploy /srv/worldzero/edge /srv/worldzero/prod /srv/worldzero/dev /srv/backups

log 'sshd hardening'
# Last, and guarded: turning off password auth with no working key is how a box
# becomes unreachable. Refuse rather than risk it.
if [ -s /home/deploy/.ssh/authorized_keys ]; then
    # A drop-in, NOT a sed over /etc/ssh/sshd_config. That file begins with
    # `Include /etc/ssh/sshd_config.d/*.conf`, and sshd takes the FIRST value it
    # obtains for a keyword, not the last — so on a cloud-init image carrying
    # 50-cloud-init.conf with `PasswordAuthentication yes`, editing the main
    # file changes a directive that never takes effect. The box stays open to
    # password auth while this script reports it closed, which is the worst of
    # both: insecure and believed secure. 99- sorts after anything cloud-init
    # ships, so this is the first value sshd sees.
    cat > /etc/ssh/sshd_config.d/99-worldzero.conf <<'SSHD'
# Managed by deploy/bootstrap.sh. Keys only, no root.
PermitRootLogin no
PasswordAuthentication no
KbdInteractiveAuthentication no
SSHD
    chmod 644 /etc/ssh/sshd_config.d/99-worldzero.conf

    # Refuse to restart on a config this box would reject anyway.
    sshd -t
    systemctl restart ssh

    # Read the EFFECTIVE config back rather than trusting the write. This is the
    # check the sed version never had, and the reason it could lie.
    # Assert the GOOD values rather than listing bad ones: permitrootlogin has
    # synonyms (without-password, prohibit-password, forced-commands-only) and a
    # deny-list that misses one fails open, which is the exact bug this check
    # exists to catch.
    effective=$(sshd -T)
    printf '%s\n' "$effective" | grep -E '^(permitrootlogin|passwordauthentication) '
    for setting in 'permitrootlogin no' 'passwordauthentication no'; do
        if ! printf '%s\n' "$effective" | grep -qx "$setting"; then
            echo "ERROR: sshd does not report '$setting'." >&2
            echo 'Something in /etc/ssh/sshd_config.d/ is overriding the drop-in.' >&2
            echo 'Fix it before exposing the box — do NOT treat this run as successful.' >&2
            exit 1
        fi
    done
    echo 'root login and password auth disabled (verified with sshd -T)'
else
    echo 'SKIPPED: /home/deploy/.ssh/authorized_keys is empty.' >&2
    echo 'Add a key, then re-run this script.' >&2
fi

log 'nightly backup'
cp /tmp/backup.sh /srv/worldzero/backup.sh 2>/dev/null || true
if [ -f /srv/worldzero/backup.sh ]; then
    chown deploy:deploy /srv/worldzero/backup.sh
    chmod 750 /srv/worldzero/backup.sh
    crontab -u deploy -l 2>/dev/null | grep -q '/srv/worldzero/backup.sh' \
        || (crontab -u deploy -l 2>/dev/null; echo '0 4 * * * /srv/worldzero/backup.sh prod') \
           | crontab -u deploy -
    echo 'cron installed (04:00 daily, prod)'
else
    echo 'scp deploy/backup.sh to /tmp first if you want the cron installed here.' >&2
fi

cat <<'NEXT'

Done. Still to do, by hand:
  1. /srv/worldzero/edge/{docker-compose.yml,Caddyfile}  <- deploy/edge.docker-compose.yml, deploy/Caddyfile
     then: cd /srv/worldzero/edge && docker compose -p edge up -d
  2. /srv/worldzero/{prod,dev}/.env                      <- deploy/env.example, filled in, chmod 600
  3. DNS: A records for @, www, api, dev, api.dev
  4. GitHub secrets: SSH_HOST, SSH_PRIVATE_KEY, SSH_KNOWN_HOSTS
See deploy/README.md.
NEXT
