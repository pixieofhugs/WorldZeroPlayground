# The deployed environments

One Hetzner box runs both. `main` deploys dev, a `v*` tag deploys prod, Caddy
puts them on different hostnames and holds the certificates.

    merge to main ──> Test ──> (green only) ──> build ──> GHCR ──> ssh ──> dev.worldzero.org
                                                                            │
                                                                        smoke passes
                                                                            │
    git tag v1.2.3 ──> gates ──> your approval ──> promote the SAME image ──> worldzero.org

    Hetzner box
      edge-caddy  :80 :443  ── the only public ports
        ├── worldzero.org, www      -> worldzero-prod-frontend  (static files)
        ├── api.worldzero.org       -> worldzero-prod-backend   -> worldzero-prod-db
        ├── dev.worldzero.org       -> worldzero-dev-frontend
        └── api.dev.worldzero.org   -> worldzero-dev-backend    -> worldzero-dev-db

| File | Where it goes | Who updates it |
|---|---|---|
| `docker-compose.yml` | `/srv/worldzero/{prod,dev}/docker-compose.yml` | CI, every deploy |
| `env.example` | `/srv/worldzero/{prod,dev}/.env` | you, by hand, once |
| `edge.docker-compose.yml` | `/srv/worldzero/edge/docker-compose.yml` | you, by hand |
| `Caddyfile` | `/srv/worldzero/edge/Caddyfile` | you, by hand |
| `bootstrap.sh` | run once on a fresh box | you, by hand |
| `backup.sh` | `/srv/worldzero/backup.sh` | `bootstrap.sh` installs the cron |

Application secrets live only in those `.env` files on the server. GitHub holds
three secrets — an SSH host, key and pinned host key — and nothing else. Images
are public on GHCR, so the box needs no registry login.

**Local development is not this.** `docker-compose.yml` at the repo root builds
instead of pulling and turns on the development seams; see
`docs/agents/local-world.md`. Both keep media in a named `media` volume; the
mount path differs (`/app/media` here, `/media` locally) and is set by
`MEDIA_ROOT` on both sides.

---

## 1. The server

Take **CPX11** (2 vCPU / 2 GB, x86, ~€4.35/mo) as the floor, or **CPX21** (3
vCPU / 4 GB, x86, ~€8.50/mo) to match the 4 GB the rest of this document
assumes — both stacks idle well under 1 GB, and every build happens on
GitHub's runners, so neither size is under real pressure. (An earlier version
of this doc said CX22; the **CX line is EU-only**. CPX is the equivalent that
also exists in US regions.) Take x86, not the cheaper ARM line — **CAX** is
the ARM trap in US regions too, same as EU: the runners are x86, and
cross-building the backend's Python wheels under emulation turns a 60-second
build into ten minutes.

Resizing later is a **reboot, not a recreate** — it keeps the same IPv4 *and*
the same SSH host key. Deleting and recreating the server instead can hand
the same IPv4 to a *different* host key, which breaks the key GitHub has
pinned in the `SSH_KNOWN_HOSTS` secret (§3) as well as everyone's local
`~/.ssh/known_hosts`. If more headroom is ever needed, resize up rather than
recreate.

Pick Ubuntu 24.04 and hand Hetzner your SSH public key at create time, so the box
never has a root password at all. Then:

```bash
scp deploy/bootstrap.sh deploy/backup.sh root@<server-ip>:/tmp/
```

```bash
ssh root@<server-ip> 'bash /tmp/bootstrap.sh'
```

That creates the `deploy` user, installs Docker, opens 22/80/443, creates the
`edge` network and `/srv/worldzero/{edge,prod,dev}`, installs the backup cron,
and — last, and only once a key is in place — disables root login and password
authentication. It is idempotent; re-run it after any change.

`deploy` is in the `docker` group, which is root-equivalent on this box. That is
the accepted trade for a one-person project — the mitigation is that the key
reaching it is CI-only and revocable by deleting one line from
`authorized_keys`.

ufw is mostly decorative: Docker writes its own iptables rules *ahead* of ufw's,
so any container publishing a port is public whatever ufw says. That is why
nothing in `docker-compose.yml` publishes one except Caddy.

## 2. The deploy key

A key of its own, not yours: CI keys rotate on a different schedule than human
keys, and this one has to be revocable without locking you out.

```bash
ssh-keygen -t ed25519 -f ~/.ssh/wz_deploy -N "" -C "github-actions-worldzero"
```

```bash
ssh-copy-id -i ~/.ssh/wz_deploy.pub deploy@<server-ip>
```

```bash
ssh-keyscan -t ed25519 <server-ip>
```

## 3. GitHub

**Settings → Secrets and variables → Actions → Repository secrets.** Three:

| Secret | Value |
|---|---|
| `SSH_HOST` | the server's IPv4 |
| `SSH_PRIVATE_KEY` | all of `~/.ssh/wz_deploy`, `BEGIN`/`END` lines included |
| `SSH_KNOWN_HOSTS` | the `ssh-keyscan` output line from step 2 |

**Settings → Environments → New environment → `production`.** Add yourself under
*Required reviewers*, and set the deployment branch/tag rule to `v*`. This is the
approval gate: the `prod` job in `deploy.yml` pauses until you click.

## 4. DNS

Five **A** records, all pointing at the server's IPv4: `@`, `www`, `api`, `dev`,
`api.dev`. Drop TTL to **600** on the records currently pointing at Render
*before* cutover day, and delete Render's CNAMEs as you add the A records.
Let's Encrypt issues per-hostname over HTTP-01, so `api.dev` being two levels
deep needs no wildcard and no DNS challenge.

## 5. First boot

```bash
ssh deploy@<server-ip>
```

Copy `edge.docker-compose.yml` → `/srv/worldzero/edge/docker-compose.yml` and
`Caddyfile` → `/srv/worldzero/edge/Caddyfile` (check the `email` line), then:

```bash
cd /srv/worldzero/edge && docker compose -p edge up -d
```

Copy `env.example` to `/srv/worldzero/prod/.env` and `/srv/worldzero/dev/.env`,
fill both in, then `chmod 600 /srv/worldzero/*/.env`. The dev copy differs in
five places: `COMPOSE_PROJECT_NAME=worldzero-dev`, `TAG=dev`, the redirect /
media / frontend / CORS URLs pointing at the dev hostnames, and its own
`SECRET_KEY` and `POSTGRES_PASSWORD`.

**`ENVIRONMENT=production` in both.** `development` opens `POST /auth/dev-login`
(`backend/routers/auth.py:507`), which mints a valid session cookie for a caller
supplying no credentials whatsoever, and strips `Secure` off the cookie besides.
Harmless on localhost, total account takeover on a public hostname. The smoke
suite asserts this, on every deploy, by checking that dev-login answers 404.

Add the two new dev redirect URIs to the Google and Discord consoles before the
first dev deploy, or dev OAuth 400s.

Then merge to `main` and let the pipeline run. Dev needs no data: `start.sh` runs
`alembic upgrade head` and `seed.py` on every boot, so an empty database fills
itself.

## 6. Shipping to production

```bash
git tag v1.0.0 <merged-commit> && git push origin v1.0.0
```

The `prod` job then refuses to run unless **all** of these hold, in this order:

1. the commit is an ancestor of `main` (a tag can be pushed anywhere);
2. a `Test` workflow run for that exact commit concluded success;
3. the `dev-smoke` commit status for it is `success`;
4. you approve the `production` environment.

Only then does it promote. The **backend image is not rebuilt** — `docker buildx
imagetools create` copies the manifest, so `:prod` and the image dev has been
running resolve to the same digest. The frontend is rebuilt from the same
commit, because Vite inlines `VITE_API_URL` into the bundle
(`frontend/src/api/baseUrl.ts`) and the dev bundle points at the dev API.

## 7. Moving prod's data off Render

Do this last, with the app still live on Render, then flip DNS.

```bash
pg_dump --no-owner --no-acl -Fc "<render-external-db-url>" -f wz.dump
```

Render's disk is not downloadable from the dashboard, so media goes through the
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

Verify before touching DNS, from your machine, bypassing DNS entirely:

```bash
curl -sI --resolve api.worldzero.org:443:<server-ip> https://api.worldzero.org/health
```

Then repoint the A records, watch for a few minutes, and only afterwards set
`autoDeploy: false` in `render.yaml` and suspend the Render services. **Keep the
Render database a week** before deleting it.

## 8. Backups

Restoring one: `RESTORE.md`.

`bootstrap.sh` installs one crontab line running `backup.sh prod` at 04:00.
Seven rotating copies of **the database and the media volume** — media is half
the job, and the half that cannot be rebuilt from this repo.

A backup on the same disk as the database is not a backup, and "pull them down
periodically" is an intention rather than a mechanism — it runs when somebody
remembers. A `systemd --user` timer does it daily and, in the same pass, checks
that the newest prod dump is recent, non-empty, and not a `.part` file, so a
backup job that has stopped working says so instead of waiting to be needed:

`wz-backup-pull` in this directory is that timer. Install it on a workstation:

```bash
cp deploy/wz-backup-pull ~/.local/bin/
cp deploy/wz-backup-pull.{service,timer} ~/.config/systemd/user/
systemctl --user daemon-reload
systemctl --user enable --now wz-backup-pull.timer
```

It is kept in the repo rather than only on the machine that runs it: if the
copies and the thing that checks them both live on one workstation, losing it
loses the ability to rebuild the monitor as well as the backups. The bare
`rsync` below is the copy WITHOUT any of the checking, for a one-off:

```bash
rsync -az -e 'ssh -i ~/.ssh/wz_deploy' deploy@<server-ip>:/srv/backups/ ~/wz-backups/
```

A `.part` file means a run died mid-write. `backup.sh` writes to `.part` and
renames on success, so a truncated file never sits where a restore would trust
it — but nothing tells you it happened unless something is checking.

Before a risky deploy, take a labelled snapshot that the rotation will not
overwrite:

```bash
ssh deploy@<server-ip> '/srv/worldzero/backup.sh prod pre-v1.4'
```

## 9. Rollback

Every image is tagged with its commit sha. On the box, set the environment's
`TAG` in its `.env` and `docker compose up -d`. This needs no CI run and no
approval, which is what makes it the right answer in an emergency — faster than
any pipeline path.

**The two environments use different tag shapes, and mixing them up is not a
loud failure.** One `TAG` drives both the backend and the frontend, so it has
to name a tag that exists for each.

| Environment | Roll back to | Set back to |
|---|---|---|
| dev | `TAG=sha-<commit>` | `TAG=dev` |
| prod | `TAG=prod-sha-<commit>` | `TAG=prod` |

Prod takes `prod-sha-`, never plain `sha-`. The plain `sha-` frontend is the
**dev** build: Vite inlines `VITE_API_URL` into the bundle, so that image has
`api.dev.worldzero.org` baked in. Setting `TAG=sha-<commit>` on prod therefore
brings up a site that loads perfectly and sends every credentialed request to
the dev API, against dev's database. The prod job tags the backend
`prod-sha-<commit>` alongside `prod` precisely so one `TAG` covers both.

A rollback does **not** undo an Alembic migration. If the bad deploy migrated,
restore from `/srv/backups` as well — `RESTORE.md` has the sequence, and the
order matters: the database goes back *before* the backend starts, or
`start.sh`'s `seed.py` writes into the empty one first.

## 10. Deliberately not built

- **Zero-downtime deploys.** `up -d` recreates the backend container, so the API
  is unreachable for a second or two. A second replica is not the fix available:
  the praxis room keeps its CRDT document in process memory (ADR-0073), and
  `services/praxis_room.acquire_single_instance_lock` makes a second instance
  exit rather than corrupt anything.
- **A CI bypass for the prod gates.** There is no `--force`. The emergency path
  is the rollback above, which is faster than a bypass would be anyway.
- **Monitoring or log shipping.** `docker compose logs -f` and Hetzner's own
  graphs. Add something when you have users who would notice an outage first.
- **A prod-data path into dev.** Dev reseeds itself from empty. If you ever need
  prod-shaped data there, restore a nightly dump into the dev stack.
