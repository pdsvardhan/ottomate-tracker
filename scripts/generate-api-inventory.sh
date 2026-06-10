#!/usr/bin/env bash
# Generates a markdown inventory of every API route from the route code itself.
# This file's output is the ONLY authoritative list of path/method/auth —
# hand-written API docs drift (audit 2026-06-10 found 4 disagreeing copies).
# Usage: bash scripts/generate-api-inventory.sh > docs/api-inventory.md
set -euo pipefail
cd "$(dirname "$0")/.."

echo "# API inventory (generated)"
echo
echo "> Generated $(date -Is) by \`scripts/generate-api-inventory.sh\` from route code."
echo "> Path/method/auth existence here outranks any prose doc. Do not hand-edit."
echo
echo "| route | methods | bearer-auth |"
echo "|---|---|---|"
find app/api -name route.ts | LC_ALL=C sort | while read -r f; do
  p="${f#app/api}"; p="${p%/route.ts}"; [ -z "$p" ] && p="/"
  methods=$(grep -oE 'export (async )?function (GET|POST|PATCH|PUT|DELETE|HEAD)' "$f" \
    | grep -oE '(GET|POST|PATCH|PUT|DELETE|HEAD)$' | paste -sd' ' -)
  if grep -qE 'requireBearer|readAuthBody' "$f"; then auth="yes"; else auth="no"; fi
  echo "| \`/api$p\` | $methods | $auth |"
done
echo
total=$(find app/api -name route.ts | wc -l)
unauth_mut=$(find app/api -name route.ts | while read -r f; do
  if grep -qE 'export (async )?function (POST|PATCH|PUT|DELETE)' "$f" \
     && ! grep -qE 'requireBearer|readAuthBody' "$f"; then echo "$f"; fi
done | wc -l)
echo "Total route files: $total. Mutating routes WITHOUT bearer auth: $unauth_mut (must be 0 or each one justified below)."
echo
find app/api -name route.ts | LC_ALL=C sort | while read -r f; do
  if grep -qE 'export (async )?function (POST|PATCH|PUT|DELETE)' "$f" \
     && ! grep -qE 'requireBearer|readAuthBody' "$f"; then
    p="${f#app/api}"; p="${p%/route.ts}"
    echo "- UNAUTHENTICATED MUTATION: \`/api$p\`"
  fi
done
