#!/usr/bin/env bash
# Idempotent installer for HeimPath VPS cron jobs and supporting scripts.
# Run once on the Hetzner VPS as root:
#   bash scripts/vps/setup-crons.sh
set -euo pipefail

REPO_DIR="$(cd "$(dirname "$0")/../.." && pwd)"

echo "==> Installing backup script"
install -m 0750 -o root -g postgres "$REPO_DIR/scripts/vps/pg-backup.sh" /usr/local/bin/pg-backup.sh

echo "==> Installing disk-check script"
install -m 0755 "$REPO_DIR/scripts/vps/disk-check.sh" /usr/local/bin/disk-check.sh

echo "==> Creating backup output directory"
mkdir -p /backups/postgres
chown postgres:postgres /backups/postgres
chmod 750 /backups/postgres

echo "==> Creating log files (if absent)"
# pg-backup.sh runs as the postgres user, so it must own its log file
touch /var/log/pg-backup.log
chown postgres:postgres /var/log/pg-backup.log
chmod 0640 /var/log/pg-backup.log

# disk-check.sh and pg-health run as root — standard root:adm ownership
for LOG_FILE in /var/log/disk-alert.log /var/log/pg-health.log; do
  touch "$LOG_FILE"
  chown root:adm "$LOG_FILE"
  chmod 0640 "$LOG_FILE"
done

echo "==> Installing logrotate config"
install -m 0644 "$REPO_DIR/scripts/vps/logrotate-heimpath-postgres.conf" \
  /etc/logrotate.d/heimpath-postgres

echo "==> Adding postgres cron: pg-backup at 02:00"
BACKUP_CRON="0 2 * * * /usr/local/bin/pg-backup.sh"
if sudo -u postgres crontab -l 2>/dev/null | grep -qF "pg-backup.sh"; then
  echo "     already present — skipping"
else
  (sudo -u postgres crontab -l 2>/dev/null; echo "$BACKUP_CRON") | sudo -u postgres crontab -
  echo "     added"
fi

echo "==> Adding root cron: disk-check at 08:00"
DISK_CRON="0 8 * * * /usr/local/bin/disk-check.sh"
if crontab -l 2>/dev/null | grep -qF "disk-check.sh"; then
  echo "     already present — skipping"
else
  (crontab -l 2>/dev/null; echo "$DISK_CRON") | crontab -
  echo "     added"
fi

echo "==> Setup complete. Run a manual test:"
echo "     sudo -u postgres /usr/local/bin/pg-backup.sh"
echo "     /usr/local/bin/disk-check.sh"
