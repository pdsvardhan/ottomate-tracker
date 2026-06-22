#!/usr/bin/env bash
# Boots a disposable Ottomate instance for Playwright E2E (WS-D), using the SAME
# Docker image as production so static assets + migrations + the standalone server
# are wired correctly. Seeds a throwaway DB from the latest clean VACUUM-INTO
# snapshot — never opens live data/ottomate.db (adr-018 one-door: byte-copy of a
# static snapshot; the disposable container opens the /tmp copy).
set -euo pipefail
cd /opt/homeserver/ottomate

SNAP="$(ls -t data/backups/backup-*.db | head -1)"
mkdir -p /tmp/e2e-data
rm -f /tmp/e2e-data/ottomate.db /tmp/e2e-data/ottomate.db-journal /tmp/e2e-data/ottomate.db-wal /tmp/e2e-data/ottomate.db-shm
cp "$SNAP" /tmp/e2e-data/ottomate.db
echo "[e2e] seeded /tmp/e2e-data/ottomate.db from $SNAP"

docker rm -f ottomate-e2e >/dev/null 2>&1 || true
exec docker run --rm --name ottomate-e2e \
  -p 127.0.0.1:3100:3000 \
  --user 1000:1000 \
  -e DATABASE_URL=file:/app/data/ottomate.db \
  -e TRACKER_API_TOKEN=e2e-token \
  -e NODE_ENV=production \
  -v /tmp/e2e-data:/app/data:rw \
  -v /mnt/storage/ottomate/assets:/asset-library:ro \
  ottomate-ottomate:latest
