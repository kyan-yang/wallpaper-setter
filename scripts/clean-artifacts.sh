#!/usr/bin/env bash
set -euo pipefail

# Remove generated local build/distribution artifacts.
# Optional env: KEEP_DIST (default 1). Set KEEP_DIST=0 to remove dist/.

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$PROJECT_ROOT"

KEEP_DIST="${KEEP_DIST:-1}"

rm -rf .build .derived

if [[ "$KEEP_DIST" == "0" ]]; then
  rm -rf dist
fi

echo "Cleaned .build and .derived."
if [[ "$KEEP_DIST" == "0" ]]; then
  echo "Also removed dist/."
else
  echo "Kept dist/ (set KEEP_DIST=0 to remove it)."
fi
