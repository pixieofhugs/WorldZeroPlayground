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
vCPU / 4 GB, x86, ~€8.50/mo) for more headroom — both stacks idle well under
1 GB, and every build happens on GitHub's runners, so neither size is under
real pressure. (An earlier version of this doc said CX22; the **CX line is
EU-only**. CPX is the equivalent that also exists in US regions.) Take x86,
not the cheaper ARM line — **CAX** is the ARM trap in US regions too, same as
EU: the runners are x86, and cross-building the backend's Python wheels under
emulation turns a 60-second build into ten minutes.

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
`api.dev`. Let's Encrypt issues per-hostname over HTTP-01, so `api.dev` being two levels
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

## 7. History

Prod was moved here from Render in October 2026 and launched seeded (#3042).
Render is deleted; nothing in this repo deploys to it.

## 8. Backups

Restoring one: `RESTORE.md`.

`bootstrap.sh` installs one crontab line running `backup.sh prod` at 04:00.
Seven rotating copies of **the database and the media volume** — media is half
the job, and the half that cannot be rebuilt from this repo.

**Off-box bucket (#3620).** After the pair is written, `backup.sh prod` pushes
both files to `s3://<bucket>/prod/<YYYY-MM-DD>/`, through the `amazon/aws-cli`
image on the box's Docker (no new install). Any S3-compatible vendor that is
not Hetzner works; nothing in the script names one. Keys in
`/srv/worldzero/prod/offsite.env` (template: `offsite.env.example`, `chmod 600`).
It is a separate file, in no compose `env_file`, and only `backup.sh` reads it,
so a compromised app never holds the bucket key:

| Key | Example |
|---|---|
| `WZ_OFFSITE_ENDPOINT` | `https://s3.us-west-004.backblazeb2.com` |
| `WZ_OFFSITE_BUCKET` | bucket name |
| `WZ_OFFSITE_REGION` | `us-west-004` (R2: `auto`) |
| `WZ_OFFSITE_KEY_ID`, `WZ_OFFSITE_SECRET` | the bucket-scoped key pair |

Owner, once: create a private bucket; create a key limited to that bucket with
**write and list, no delete**; set a **lifecycle rule expiring objects after 30
days** (this is the remote retention, chosen over a prune step so the box's key
cannot erase history); copy `offsite.env.example` to that path and fill in the five keys; run
`/srv/worldzero/backup.sh prod` once by hand and see the objects appear.

A failed push (or a missing key) exits non-zero and writes
`/srv/backups/offsite-failed.txt`. `wz-backup-pull` rsyncs that down and raises
it as `backup-red`; the next good push deletes the file. Check without a box:
`deploy/test-backup-push`. Getting data back: `RESTORE.md` "Off-box copies".

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

The installed script is a **copy**. After the one in this directory changes,
`cp` it again or the timer keeps running the old one.

**A failure opens a GitHub issue** (#3043, #3621). The desktop notification only
reaches the desk the timer runs on, and GitHub never notifies you of your own
actions, so the script does not touch issues. After every run, red or green,
it sends one `repository_dispatch` event (`backup-pull`) carrying the status,
the problems, the run time, the newest prod dump's name and age, the
`RESTORE.md` advice and the tail of its output. `.github/workflows/backup-pull.yml`
acts on it as `github-actions[bot]`: red keeps exactly one open `backup-red`
issue (files it, or comments on the open one); green comments on and closes
it. So an open `backup-red` issue means the backups are red *right now*, and
you are notified as a repo watcher. The payload only ever reaches the workflow
through `env:`, never interpolated into a script.

**The credential** is the workstation's `gh` login (`gh auth login`, kept in
the desktop keyring): classic `repo` scope. Sending a dispatch needs nothing
more than write access to this repo's contents. If you would rather the box
hold less, make a **fine-grained token on this repo only with Contents:
read-and-write** (the permission GitHub requires for `POST /dispatches`; it
grants no issue access) and give it to the unit: `systemctl --user edit
wz-backup-pull.service`, `EnvironmentFile=` a `chmod 600` file holding
`GH_TOKEN=`. Either way `gh` must be on the `systemd --user` PATH; check with
`systemd-run --user --wait --pipe -q gh auth status`.

If the dispatch fails the script says `could not report to GitHub` and still
exits 1 for the original problem. A healthy pull that cannot reach GitHub still
exits 0 and sends no desktop alert: one `warning:` line goes to the journal.

Test it, in this order. The first line stubs everything; the rest are real
pulls that really write to GitHub:

```bash
deploy/test-wz-backup-pull               # stubs only: no pull, nothing filed
WZ_MAX_AGE_HOURS=0 ~/.local/bin/wz-backup-pull   # exit 1, one backup-red issue appears
WZ_MAX_AGE_HOURS=0 ~/.local/bin/wz-backup-pull   # exit 1, a comment on it, no second issue
~/.local/bin/wz-backup-pull                      # exit 0, the issue is closed
journalctl --user -u wz-backup-pull.service -n 30   # the timer's own run, next morning
```

**What this does not cover:** if the workstation is off, or the timer has
stopped, nothing runs and nothing is filed. A job cannot report its own
absence; that needs a check that runs somewhere else, and there is not one.

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

## 10. Running a script on dev or prod

A one-off under `backend/` (`elevate_admin.py`, `seed.py`, …) runs inside that
stack's backend container:

    ssh -i ~/.ssh/wz_deploy deploy@<server-ip> \
      'cd /srv/worldzero/dev && docker compose exec -T backend python elevate_admin.py testing'

Use `/srv/worldzero/prod` for production. The `deploy` user and key are §2's, and
the IP is the `SSH_HOST` repo secret. The container's own `DATABASE_URL`
outranks the `.env` file a script's `--env` flag picks, so the script hits that
stack's database whatever `--env` says; pass `--env prod` on prod anyway, so the
banner it prints is true. Character lookups take the **username**, not the display
name. It is derived from the display name (lowercased, non-`[a-z0-9]` stripped, truncated,
numbered on collision), so read it from the database, e.g.
`select username from character where display_name = '…'` in psql on that stack.

The API answers on `api.dev.worldzero.org` and `api.worldzero.org`, not on the
site's hostnames. A request to `dev.worldzero.org/auth/…` gets the SPA's 200.

Each stack runs **one** uvicorn process (`backend/start.sh` passes no
`--workers`). That's deliberate: see the praxis room under §11.

### Scrubbing location from media stored before #3486/#3487

`scrub_stored_media.py` runs every file under `MEDIA_ROOT` (and the
`MEDIA_ROOT-quarantine` sibling) through the upload strip and rewrites it in
place (idempotent, each write temp + fsync + rename). HEIC/HEIF/AVIF/BMP files
are converted to `.jpg` as #3589 does for new uploads: the `MediaItem` path is
updated in the transaction and the old file is deleted only after the commit,
so old hotlinks stop working. A file it cannot strip or delete is listed, the
rest carry on, and the exit code is 1. The rewrite has no undo. In order:

1. Back up prod: `ssh deploy@<server-ip> '/srv/worldzero/backup.sh prod pre-scrub'` (§8).
2. Dev dry run, then read the list:
   `cd /srv/worldzero/dev && docker compose exec -T backend python scripts/scrub_stored_media.py --env dev`
3. Dev `--apply` (same command plus `--apply`).
4. Prod dry run: same, from `/srv/worldzero/prod` with `--env prod`.
5. Prod `--apply`.
6. Run `sweep_orphan_media.py` (dry run first) to clear any unreferenced original the script reported.

Use the `ssh -i ~/.ssh/wz_deploy deploy@<server-ip> '…'` wrapper from above for each.

- Ran on dev: (date)
- Ran on prod: (date)

## 10b. Backfilling display copies

New photos get a `<name>.display.webp` beside the original (1600 px, q80) and the
feed uses it (#3626). Photos uploaded before that have none and are served full
size until this runs. It is idempotent and writes only new files:

    docker compose exec -T backend python scripts/backfill_display_copies.py --env prod          # dry run
    docker compose exec -T backend python scripts/backfill_display_copies.py --env prod --apply

Run it after `scrub_stored_media.py --apply`. Ran on: dev ____ / prod ____ (owner fills in).

## 11. Deliberately not built

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
