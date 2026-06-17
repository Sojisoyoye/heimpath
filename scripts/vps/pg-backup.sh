#!/usr/bin/env bash
# Nightly PostgreSQL backup for both prod and staging databases.
# Intended path: /usr/local/bin/pg-backup.sh
# Run as: sudo -u postgres /usr/local/bin/pg-backup.sh
# Cron (postgres user): 0 2 * * * /usr/local/bin/pg-backup.sh
set -euo pipefail

BACKUP_DIR="/backups/postgres"
LOG_FILE="/var/log/pg-backup.log"
RETENTION_DAYS=7
DATE=$(date +%F)

log() {
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*" | tee -a "$LOG_FILE"
}

mkdir -p "$BACKUP_DIR"

for DB in heimpath heimpath_staging; do
  DEST="${BACKUP_DIR}/${DB}_${DATE}.sql.gz"
  log "Backing up ${DB}..."
  if pg_dump -q "$DB" | gzip > "$DEST"; then
    SIZE=$(du -sh "$DEST" | cut -f1)
    log "OK — ${DB} backed up to ${DEST} (${SIZE})"
  else
    rm -f "$DEST"
    log "ERROR — ${DB} backup failed; partial file removed"
    exit 1
  fi
done

# Prune backups older than RETENTION_DAYS days
find "$BACKUP_DIR" -name "*.sql.gz" -mtime +"$RETENTION_DAYS" -delete
log "Pruned backups older than ${RETENTION_DAYS} days"
