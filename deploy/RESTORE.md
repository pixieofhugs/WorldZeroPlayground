# Getting World Zero back

Given a dump, a tarball, and a box, this is the sequence back to a running
World Zero. Written the night the restore was first actually performed
(2026-09-24, #3043) rather than from memory at 2am.

`README.md` §8 covers what the backups *are* and §9 covers rolling back a bad
image. This file covers the case where the data itself has to come back.

---

## What you are restoring from

`backup.sh` writes a pair per run, and both halves matter:

```
/srv/backups/<env>-db-<label>.dump      pg_dump -Fc of the database
/srv/backups/<env>-media-<label>.tgz    tar of the media volume
```

`<label>` is the day of week (1–7, rotating) or the label you passed. A
`.part` suffix means a run **died mid-write** — `backup.sh` writes to `.part`
and renames on success precisely so a truncated file never sits where a
restore would trust it. A `.part` file is not a backup. It is a bug report.

An empty media tarball is 109 bytes, not 0 — an empty `tar.gz` still carries a
header. A 0-byte file is a failure wearing a backup's name.

---

## The restore, in order

**Stop the app first.** Every service is `restart: unless-stopped`, and
`docker compose up -d db` stops nothing — so on the rollback path (README §9),
the backend is still live and holding connections. `pg_restore --clean` then
cannot drop the tables it needs to, and `start.sh`'s `alembic upgrade head`
and `seed.py` can run against a half-restored schema while you watch.

**Then the database, before the backend comes back.** `start.sh` seeds on
every boot, so a backend that starts first writes a seeded schema into an
empty database and the restore ends up fighting rows it did not put there.

```bash
cd /srv/worldzero/<env>

# 1. Quiet the stack. The database stays up; nothing else may touch it.
docker compose stop backend frontend

# 2. Database. `--wait` blocks on the healthcheck: `up -d` returns when the
#    container is CREATED, and on a fresh volume initdb takes several seconds,
#    during which pg_restore fails with "the database system is starting up".
docker compose up -d --wait db
docker compose cp /srv/backups/<env>-db-<label>.dump db:/tmp/wz.dump
docker compose exec -T db pg_restore -U worldzero -d worldzero \
    --clean --if-exists --exit-on-error /tmp/wz.dump

# 3. Backend back. Its alembic run lands on the restored schema, which is what
#    you want: the dump carries whatever revision it was taken at, not
#    necessarily the image's.
docker compose up -d backend frontend

# 4. Media, into the running backend.
docker compose cp /srv/backups/<env>-media-<label>.tgz backend:/tmp/media.tgz
docker compose exec -T backend tar xzf /tmp/media.tgz -C /app
```

### `--exit-on-error` is not optional

Without it, `pg_restore` reports per-object failures as warnings and **still
exits 0**. A restore that dropped half your tables looks exactly like a clean
one, which is the precise silent failure the rest of this document exists to
prevent. `--if-exists` already suppresses the "object does not exist" noise
that the flag would otherwise trip over, so against an empty database the
errors that remain are real.

### If the dump predates the migration squash

`start.sh` runs `scripts/check_db_stamp.py` before alembic. A dump whose
`alembic_version` is older than the `0002_squashed` baseline fails that check
and the backend crashloops.

**Read what it prints, do not follow it.** The recovery line names
`scripts/reset_render_db.py`, which drops and recreates the `public` schema
*and* empties `MEDIA_ROOT` — it will destroy the restore you just performed,
and it refers to a Render shell that no longer exists. The fix is to
`alembic stamp` the restored database to a revision the image knows, then let
`alembic upgrade head` carry it forward.

---

## Check it actually worked

Two checks, because each catches what the other misses.

**Rows** — and count something the seed could not have created. A fresh
`seed.py` produces one account, one character and the level-0 onboarding task
all by itself, so "1 account" proves nothing:

```bash
docker compose exec -T db psql -U worldzero -d worldzero -c "
select 'account', count(*) from account
union all select 'character', count(*) from character
union all select 'praxis',  count(*) from praxis"
```

**An actual image file, by checksum.** This is the half that cannot be
rebuilt from the repo, and the half most likely to land wrong:

```bash
docker compose exec -T backend sh -c 'ls -l /app/media/ | head; sha256sum /app/media/<a-known-file>'
```

The tarball was created with `-C /app media`, so it unpacks a `media/`
directory **relative to wherever you extract it**. Extract it in the wrong
place and you get `/app/media/media/...`, which shows up as every avatar and
every praxis image 404ing against a completely healthy API. `ls` catches it in
a second; `/health` never will.

---

## Rehearsing it without touching a live stack

A restore nobody has performed is a hope. Rehearse into a third compose
project — same file, different project name, therefore different containers,
different volumes, different database:

```bash
mkdir -p ~/scratch && cd ~/scratch
cp /srv/worldzero/dev/docker-compose.yml .
sed 's/^COMPOSE_PROJECT_NAME=.*/COMPOSE_PROJECT_NAME=worldzero-scratch/' \
    /srv/worldzero/dev/.env > .env
chmod 600 .env

# CHECK THIS BEFORE RUNNING ANYTHING ELSE HERE.
docker compose config | grep '^name:'
```

It must say `name: worldzero-scratch`. That `sed` matches `^COMPOSE_PROJECT_NAME=`
and writes an unchanged copy if the key is ever commented, spaced
(`COMPOSE_PROJECT_NAME = ...`), `export`-prefixed, or absent — in which case
every command below targets **dev**, from a directory you believe is isolated,
and `docker compose down -v` takes dev's database and media volumes with it.

`~/scratch`, not `/srv/worldzero/scratch`: **`/srv/worldzero` is owned by
root**, and the `deploy` user cannot create a directory there.

Then run the restore above against it, and tear it down with its volumes:

```bash
docker compose down -v && rm -rf ~/scratch
```

The scratch backend joins the `edge` network like every other stack, but Caddy
routes by container name and no site block names `worldzero-scratch-*`, so it
is unreachable from outside. Nothing is published to a port.

---

## From nothing at all

Losing the box rather than the data. This is README §1 and §5 in full, not a
shortcut around them — the steps below are only the ones the restore adds.

1. New server, then `bootstrap.sh` (README §1): Docker, the `deploy` user, the
   `edge` network, the firewall, the backup cron. It creates
   `/srv/worldzero/{edge,prod,dev}` as **empty directories** and nothing else.
2. **Put the stack file there yourself.** `bootstrap.sh` does not deliver it
   and there is no copy on the box — CI scp's `deploy/docker-compose.yml` on
   every deploy. Copy it from the repo into `/srv/worldzero/<env>/`, or run a
   deploy first and let CI place it. Without this, step 4 fails with
   `no configuration file provided: not found`.
3. **Put `.env` back** in `/srv/worldzero/<env>/`, `chmod 600`. It is in no
   backup and not in this repo. Its `SECRET_KEY` is what makes existing session
   cookies valid; a new one logs everybody out once.
4. The restore above.
5. **Bring up the edge stack** (README §5). `bootstrap.sh` creates the `edge`
   *network*, not Caddy: `edge.docker-compose.yml` and the `Caddyfile` are
   hand-deployed, `docker compose -p edge up -d`. Until this exists nothing is
   reachable, whatever the restore did.
6. Confirm `frontend` is running, not just `backend`. Caddy proxies
   `worldzero.org` to `worldzero-<env>-frontend`, so a backend-only stack
   answers the API perfectly and serves 502 to every human.
7. Re-register the OAuth redirect URIs if the hostnames changed (README §5).
8. Point DNS at the new address, then restart `edge-caddy` — see below.

Steps 2, 3 and 5 are the ones that bite. The dump restores the world; it does
not restore the compose file, the credentials, or the thing that serves it.

---

## Certificates, after any address change

Caddy obtains certificates over HTTP-01, which needs DNS already pointing at
the box. When issuance fails it backs off, and the retry interval grows past
the point where waiting is useful — it will sit there for hours after DNS has
been correct.

**So restart it as soon as the records resolve**, rather than waiting:

```bash
docker restart edge-caddy
docker logs --since 2m edge-caddy | grep -i 'certificate obtained'
```

Issuance takes seconds once the name resolves. This cost an hour on the dev
cutover and would have cost the same on prod.

---

## Off-box copies

Everything above assumes `/srv/backups` still exists. It is on the same disk as
the database, so it survives `DROP TABLE` and not the disk.

`wz-backup-pull` (in this directory, installed as a `systemd --user` timer on a
workstation) pulls the directory down daily and notifies when the newest prod
dump is over 26 hours old, is 0 bytes, or a `.part` file is present — so a
backup job that has quietly stopped working announces itself instead of waiting
to be needed. Its first run found a real failed run from the same morning.

It lives here rather than only on the workstation on purpose: if the copies and
the thing that checks them are both on one machine, losing that machine loses
the ability to rebuild the monitor as well as the copies.

That still leaves one machine and one box. Pushing to object storage from the
box covers losing both, and is the next thing to build when there is data worth
grieving.
