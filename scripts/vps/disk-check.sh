#!/usr/bin/env bash
# Daily VPS health check: disk, swap, and PostgreSQL process.
# Intended path: /usr/local/bin/disk-check.sh
# Cron (root): 0 8 * * * /usr/local/bin/disk-check.sh
set -euo pipefail

LOG_FILE="/var/log/disk-alert.log"
DISK_THRESHOLD=70
SWAP_THRESHOLD=90

log() {
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*" | tee -a "$LOG_FILE"
}

# --- Root filesystem ---
DISK_PCT=$(df / --output=pcent | tail -1 | tr -dc '0-9')
if [ "$DISK_PCT" -ge "$DISK_THRESHOLD" ]; then
  log "ALERT: root filesystem at ${DISK_PCT}% (threshold: ${DISK_THRESHOLD}%)"
  log "  Run: docker image prune -a   # to recover space"
  log "  Check: du -sh /backups/postgres/*"
else
  log "OK: root filesystem at ${DISK_PCT}%"
fi

# --- Swap ---
SWAP_TOTAL=$(awk '/^SwapTotal:/ {print $2}' /proc/meminfo)
if [ "${SWAP_TOTAL:-0}" -gt 0 ]; then
  SWAP_FREE=$(awk '/^SwapFree:/ {print $2}' /proc/meminfo)
  SWAP_USED=$(( SWAP_TOTAL - SWAP_FREE ))
  SWAP_PCT=$(( SWAP_USED * 100 / SWAP_TOTAL ))
  if [ "$SWAP_PCT" -ge "$SWAP_THRESHOLD" ]; then
    log "ALERT: swap at ${SWAP_PCT}% used (threshold: ${SWAP_THRESHOLD}%)"
  else
    log "OK: swap at ${SWAP_PCT}% used"
  fi
fi

# --- PostgreSQL process ---
if systemctl is-active --quiet postgresql; then
  log "OK: postgresql is active"
else
  log "ALERT: postgresql is NOT active — check: systemctl status postgresql"
fi
