# Render → Hetzner

One server runs both environments. `main` deploys prod, `develop` deploys dev,
Caddy puts them on different hostnames and holds the certificates.

    GitHub push ──> Actions runner ──> Docker Hub ──> ssh ──> Hetzner
                    build 2 images     :prod/:dev            compose pull && up -d

    Hetzner box
      edge-caddy  :80 :443  ── the only public ports
        ├── worldzero.org, www      -> worldzero-prod-frontend  (static files)
        ├── api.worldzero.org       -> worldzero-prod-backend   -> worldzero-prod-db
        ├── dev.worldzero.org       -> worldzero-dev-frontend
        └── api.dev.worldzero.org   -> worldzero-dev-backend    -> worldzero-dev-db

Files in this directory:

| File | Where it goes | Who updates it |
|---|---|---|
| `docker-compose.yml` | `/srv/worldzero/{prod,dev}/docker-compose.yml` | CI, every deploy |
| `env.example` | `/srv/worldzero/{prod,dev}/.env` | you, by hand, once |
| `edge.docker-compose.yml` | `/srv/worldzero/edge/docker-compose.yml` | you, by hand |
| `Caddyfile` | `/srv/worldzero/edge/Caddyfile` | you, by hand |

Application secrets live only in those `.env` files on the server. GitHub holds
credentials for Docker Hub and SSH and nothing else.

---

## 1. Local development is unchanged

The root `docker-compose.yml` still runs Postgres + the backend, and
`npm run dev` still runs the frontend with HMR. The frontend image exists to
*ship* the build, not to develop against — running Vite through a container
would cost you hot reload and buy nothing.

To smoke-test the production frontend image locally:

```bash
docker build -t wz-frontend --build-arg VITE_API_URL=http://localhost:8000 frontend
```

## 2. The server

A **CX22** (2 vCPU / 4 GB, x86, ~€4/mo) is more than this needs. Take x86, not
the cheaper ARM CAX line: GitHub's standard runners are x86, and cross-building
the backend's Python wheels under emulation turns a 60-second build into ten
minutes.

Pick Ubuntu 24.04 and hand Hetzner your personal SSH public key at create time,
so the box never has a root password at all.

```bash
ssh root@<server-ip>
```

Then, on the server:

```bash
adduser --disabled-password --gecos "" deploy
mkdir -p /home/deploy/.ssh && cp ~/.ssh/authorized_keys /home/deploy/.ssh/
chown -R deploy:deploy /home/deploy/.ssh && chmod 700 /home/deploy/.ssh
curl -fsSL https://get.docker.com | sh
usermod -aG docker deploy
ufw allow 22 && ufw allow 80 && ufw allow 443 && ufw --force enable
```

Then close off password and root login:

```bash
sed -i 's/^#*PermitRootLogin.*/PermitRootLogin no/; s/^#*PasswordAuthentication.*/PasswordAuthentication no/' /etc/ssh/sshd_config && systemctl restart ssh
```

`deploy` is in the `docker` group, which is root-equivalent on this box. That is
the accepted trade for a one-person project — the mitigation is that the key
reaching it is CI-only and revocable by deleting one line from
`authorized_keys`.

ufw is mostly decorative here: Docker writes its own iptables rules *ahead* of
ufw's, so any container publishing a port is public whatever ufw says. That is
why nothing in `docker-compose.yml` publishes one except Caddy.

## 3. The deploy key

On your machine:

```bash
ssh-keygen -t ed25519 -f ~/.ssh/wz_deploy -N "" -C "github-actions-worldzero"
```

```bash
ssh-copy-id -i ~/.ssh/wz_deploy.pub deploy@<server-ip>
```

```bash
ssh-keyscan -t ed25519 <server-ip>
```

A key of its own, not yours: CI keys rotate on a different schedule than human
keys, and this one has to be revocable without locking you out.

## 4. GitHub Actions secrets

**Repo → Settings → Secrets and variables → Actions → Repository secrets → New
repository secret.** Five, exactly:

| Secret | Value |
|---|---|
| `DOCKERHUB_USERNAME` | your Docker Hub username |
| `DOCKERHUB_TOKEN` | Docker Hub → Account settings → Personal access tokens, scope **Read & Write**. Not your password. |
| `SSH_HOST` | the server's IPv4 |
| `SSH_PRIVATE_KEY` | all of `~/.ssh/wz_deploy`, `BEGIN`/`END` lines included |
| `SSH_KNOWN_HOSTS` | the `ssh-keyscan` output line from step 3 |

Repository secrets — not environment secrets, not organization secrets. The
workflow reads them by those exact names.

The host key is pinned rather than `StrictHostKeyChecking=no`. Without the pin,
the first thing that answers on that IP is handed a session that runs Docker as
root.

## 5. DNS at GoDaddy

**My Products → DNS → Manage Zones → worldzero.org.** Five records, all type
**A**, all pointing at the server's IPv4:

| Name | Hostname |
|---|---|
| `@` | worldzero.org |
| `www` | www.worldzero.org |
| `api` | api.worldzero.org |
| `dev` | dev.worldzero.org |
| `api.dev` | api.dev.worldzero.org |

Drop TTL to **600** on the records currently pointing at Render *before* cutover
day, and delete Render's CNAMEs as you add the A records. Let's Encrypt issues
per-hostname over HTTP-01, so `api.dev` being two levels deep needs no wildcard
and no DNS challenge.

## 6. First boot

```bash
ssh deploy@<server-ip>
```

```bash
docker network create edge && mkdir -p /srv/worldzero/{edge,prod,dev}
```

Copy `edge.docker-compose.yml` → `/srv/worldzero/edge/docker-compose.yml` and
`Caddyfile` → `/srv/worldzero/edge/Caddyfile` (check the `email` line), then:

```bash
cd /srv/worldzero/edge && docker compose -p edge up -d
```

Copy `env.example` to `/srv/worldzero/prod/.env` and `/srv/worldzero/dev/.env`,
fill both in, then `chmod 600 /srv/worldzero/*/.env`. The dev copy differs in
four places: `COMPOSE_PROJECT_NAME=worldzero-dev`, `TAG=dev`, the redirect /
media / frontend / CORS URLs pointing at the dev hostnames, and its own
`SECRET_KEY` and `POSTGRES_PASSWORD`.

**`ENVIRONMENT=production` in both.** `development` opens
`POST /auth/dev-login` (`backend/routers/auth.py:508`), which mints a valid
session cookie for a caller supplying no credentials whatsoever, and strips
`Secure` off the cookie besides. Harmless on localhost, total account takeover
on a public hostname. If you later want dev-login on `dev.worldzero.org`, it has
to go behind Caddy `basic_auth` on *both* dev hostnames first — and OAuth
callbacks break while it is there.

Add the two new dev redirect URIs to the Google and Discord consoles before the
first dev deploy, or dev OAuth 400s.

Then push `develop` and let the pipeline run. Dev needs no data: `start.sh` runs
`alembic upgrade head` and `seed.py` on every boot, so an empty database fills
itself.

## 7. Moving prod's data off Render

Do this last, with the app still live on Render, then flip DNS.

Database, using the external connection string from the Render dashboard:

```bash
pg_dump --no-owner --no-acl -Fc "<render-external-db-url>" -f wz.dump
```

Media — Render's disk is not downloadable from the dashboard, so go through the
service's shell. Confirm the service id with `render services` first:

```bash
render ssh srv-xxxxx "tar czf - -C /app media" > media.tgz
```

```bash
scp wz.dump media.tgz deploy@<server-ip>:/tmp/
```

On the server, with the prod stack up:

```bash
cd /srv/worldzero/prod && docker compose cp /tmp/wz.dump db:/tmp/wz.dump
```

```bash
docker compose exec db pg_restore -U worldzero -d worldzero --clean --if-exists /tmp/wz.dump
```

```bash
docker compose cp /tmp/media.tgz backend:/tmp/ && docker compose exec backend tar xzf /tmp/media.tgz -C /app
```

```bash
docker compose restart backend
```

The restart re-runs `alembic upgrade head` against the restored data, which is
what you want — the dump carries Render's schema version, not necessarily the
image's.

Verify before touching DNS. From your machine, bypassing DNS entirely:

```bash
curl -sI --resolve api.worldzero.org:443:<server-ip> https://api.worldzero.org/docs
```

Then repoint the GoDaddy A records, watch for a few minutes, and only afterwards
set `autoDeploy: false` in `render.yaml` and suspend the Render services. Keep
the Render database a week before deleting it.

## 8. Backups

Nothing on this box does it for you. One crontab line as `deploy`
(`mkdir -p /srv/backups` first):

```bash
0 4 * * * cd /srv/worldzero/prod && docker compose exec -T db pg_dump -U worldzero -Fc worldzero > /srv/backups/wz-$(date +\%u).dump
```

Seven rotating dumps, no tooling. Pull one down to your machine occasionally — a
backup on the same disk as the database is not a backup.

## 9. Rollback

Every image is also tagged with its commit sha. Set `TAG=<sha>` in that
environment's `.env`, run `docker compose up -d`, and set it back to `prod` when
the fix ships.

## 10. Deliberately not built

- **Tests do not gate deploys.** `test.yml` and `deploy.yml` run in parallel on
  a push to `main`. That is the development-speed choice you asked for; the
  upgrade is one `needs:` away — move the deploy job into `test.yml` behind
  `needs: [test, api-schema, frontend]`.
- **No zero-downtime deploy.** `up -d` recreates the backend container, so the
  API is unreachable for a second or two. A second backend replica is not the
  fix available today: the praxis room keeps its CRDT document in process
  memory, so two backends means two divergent documents (ADR-0073), and the
  advisory lock in `services/praxis_room.acquire_single_instance_lock` makes the
  second one exit rather than corrupt anything.
- **No monitoring or log shipping.** `docker compose logs -f` and Hetzner's own
  graphs. Add something when you have users who would notice an outage first.
- **No prod-data path into dev.** Dev reseeds itself from empty. If you ever
  need prod-shaped data there, restore a nightly dump into the dev stack.
