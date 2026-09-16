#!/usr/bin/env bash
# Back up one environment: the database AND the media volume.
#
#   /srv/worldzero/backup.sh prod          # what cron runs, 04:00 daily
#   /srv/worldzero/backup.sh prod pre-v1.4 # a labelled snapshot before a deploy
#
# Media is half the job and the half that used to be missing. The database can
# be rebuilt from a dump; user-uploaded media exists nowhere else on earth once
# the volume is gone.
#
# Seven rotating copies, keyed on day-of-week, no tooling. A labelled snapshot
# is keyed on its label instead and is never rotated over.
#
# A backup on the same disk as the database is not a backup. Pull these down
# to another machine periodically:
#   rsync -av deploy@<server>:/srv/backups/ ./wz-backups/
set -euo pipefail

ENVIRONMENT=${1:-prod}
LABEL=${2:-$(date +%u)}
STACK_DIR="/srv/worldzero/$ENVIRONMENT"
DEST="/srv/backups"

[ -d "$STACK_DIR" ] || { echo "No such stack: $STACK_DIR" >&2; exit 1; }
mkdir -p "$DEST"
cd "$STACK_DIR"

DB_FILE="$DEST/$ENVIRONMENT-db-$LABEL.dump"
MEDIA_FILE="$DEST/$ENVIRONMENT-media-$LABEL.tgz"

# Write to a temp name and move into place, so an interrupted run cannot leave a
# truncated file sitting where a restore would trust it.
echo "==> database -> $DB_FILE"
docker compose exec -T db pg_dump -U worldzero -Fc worldzero > "$DB_FILE.part"
mv "$DB_FILE.part" "$DB_FILE"

echo "==> media -> $MEDIA_FILE"
docker compose exec -T backend tar czf - -C /app media > "$MEDIA_FILE.part"
mv "$MEDIA_FILE.part" "$MEDIA_FILE"

echo "==> done"
ls -lh "$DB_FILE" "$MEDIA_FILE"
