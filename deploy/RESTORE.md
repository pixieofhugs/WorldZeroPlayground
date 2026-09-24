# Getting World Zero back

Given a dump, a tarball, and a box, this is the sequence back to a running
World Zero. Written the night the restore was first actually performed
(2026-09-24, #3043) rather than from memory at 2am — every trap below is one
that was hit on the way through, not one that was imagined.

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

**Order is the trap.** Restore the database *before* the backend ever starts.
`start.sh` runs `alembic upgrade head` and `seed.py` on every boot, so a
backend that comes up first writes a seeded schema into the empty database,
and then the restore is fighting rows it did not put there.

```bash
cd /srv/worldzero/<env>

# 1. Database first, with the backend still down.
docker compose up -d db
docker compose cp /srv/backups/<env>-db-<label>.dump db:/tmp/wz.dump
docker compose exec -T db pg_restore -U worldzero -d worldzero \
    --clean --if-exists /tmp/wz.dump

# 2. Now the backend. Its alembic run lands on the restored schema, which is
#    what you want: the dump carries whatever revision it was taken at, not
#    necessarily the image's.
docker compose up -d backend

# 3. Media, into the running backend.
docker compose cp /srv/backups/<env>-media-<label>.tgz backend:/tmp/media.tgz
docker compose exec -T backend tar xzf /tmp/media.tgz -C /app
```

`pg_restore` prints nothing on success. Errors about objects that do not exist
are normal with `--clean --if-exists` against an empty database.

---

## Check it actually worked

Two checks, because each catches what the other misses.

**Rows** — and count something the seed could not have created. A fresh
`seed.py` produces one account, one character and the level-0 onboarding task
all by itself, so "1 account" proves nothing about your restore:

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
```

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

Losing the box rather than the data:

1. New server, then `bootstrap.sh` (README §1) — Docker, the `deploy` user,
   the `edge` network, the firewall, the backup cron.
2. Put `.env` back in `/srv/worldzero/<env>/`, `chmod 600`. **It is not in any
   backup and not in this repo.** Its `SECRET_KEY` is what makes existing
   session cookies valid; a new one logs everybody out once.
3. `docker compose up -d db`, then the restore above.
4. Point DNS at the new address and restart `edge-caddy` — see the note below.

Step 2 is the one that bites. The dump restores the world; it does not restore
the credentials the world runs on.

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

A `systemd --user` timer on a workstation pulls the directory down daily and
notifies when the newest prod dump is over 26 hours old, is 0 bytes, or a
`.part` file is present — so a backup job that has quietly stopped working
announces itself instead of waiting to be needed. Its first run found a real
failed run from the same morning.

That still leaves one machine and one box. Pushing to object storage from the
box covers losing both, and is the next thing to build when there is data worth
grieving.
