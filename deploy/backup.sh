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
STACK_DIR="${WZ_STACK_ROOT:-/srv/worldzero}/$ENVIRONMENT"
DEST="${WZ_BACKUP_DEST:-/srv/backups}"

[ -d "$STACK_DIR" ] || { echo "No such stack: $STACK_DIR" >&2; exit 1; }
mkdir -p "$DEST"
cd "$STACK_DIR"

DB_FILE="$DEST/$ENVIRONMENT-db-$LABEL.dump"
MEDIA_FILE="$DEST/$ENVIRONMENT-media-$LABEL.tgz"

# The shell creates `.part` before pg_dump writes a byte, and `set -e` aborts
# before the `mv`, so a failed run leaves a 0-byte file behind. Nothing ever
# removed it — and the off-box checker alerts on `.part` being present, so one
# transient failure would fire every day until somebody deleted it by hand.
# That is the road to an alert people learn to ignore. Clean up on the way out
# so the signal is one-shot: still loud, still exactly once.
trap 'rm -f "$DB_FILE.part" "$MEDIA_FILE.part"' EXIT

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

# Off-box copy, prod only. Any failure, a missing key included, leaves
# $DEST/offsite-failed.txt for wz-backup-pull to rsync down and raise as
# backup-red, and exits non-zero. The local pair is safe on disk either way.
# Retention is a bucket lifecycle rule (README §8), not a prune here: the box's
# key then needs no delete right, so a hacked box cannot erase its own history.
# Pinned: newer aws-cli sends checksum headers some S3 vendors reject.
AWS_IMAGE=${WZ_OFFSITE_AWS_IMAGE:-amazon/aws-cli:2.17.0}

offsite_push() {
  local k v day f
  # Its own file, in no compose env_file, so the app never holds the key.
  [ -f offsite.env ] || { echo "$STACK_DIR/offsite.env is missing" >&2; return 1; }
  while IFS='=' read -r k v; do export "$k=$v"; done < <(grep -E '^WZ_OFFSITE_[A-Z_]+=' offsite.env || true)
  for k in ENDPOINT BUCKET REGION KEY_ID SECRET; do
    v=WZ_OFFSITE_$k
    [ -n "${!v:-}" ] || { echo "$v is not set in $STACK_DIR/offsite.env" >&2; return 1; }
  done
  export AWS_ACCESS_KEY_ID=$WZ_OFFSITE_KEY_ID AWS_SECRET_ACCESS_KEY=$WZ_OFFSITE_SECRET \
         AWS_DEFAULT_REGION=$WZ_OFFSITE_REGION
  day=$(date +%F)
  for f in "$DB_FILE" "$MEDIA_FILE"; do
    echo "==> off-box -> $WZ_OFFSITE_BUCKET/$ENVIRONMENT/$day/$(basename "$f")"
    docker run --rm -e AWS_ACCESS_KEY_ID -e AWS_SECRET_ACCESS_KEY -e AWS_DEFAULT_REGION \
      -v "$DEST:/data:ro" "$AWS_IMAGE" s3 cp --endpoint-url "$WZ_OFFSITE_ENDPOINT" \
      "/data/$(basename "$f")" "s3://$WZ_OFFSITE_BUCKET/$ENVIRONMENT/$day/$(basename "$f")" || return 1
  done
}

if [ "$ENVIRONMENT" = prod ]; then
  if err=$(offsite_push 2>&1); then
    echo "$err"
    rm -f "$DEST/offsite-failed.txt"
  else
    echo "$err" >&2
    printf '%s off-box push failed:\n%s\n' "$(date '+%F %H:%M')" "$err" > "$DEST/offsite-failed.txt"
    exit 1
  fi
fi
