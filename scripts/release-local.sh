#!/usr/bin/env bash
set -euo pipefail

# Full local packaging flow: build app, package DMG, optionally open.
# Optional env: VERSION (default 0.1.0), OPEN_DMG (default 1)

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$PROJECT_ROOT"

VERSION="${VERSION:-0.1.0}"
OPEN_DMG="${OPEN_DMG:-1}"
export VERSION

# Build app
APP_PATH=$(./scripts/build-app.sh | tail -n 1)

# Package DMG
DMG_PATH=$(./scripts/package-dmg.sh | tail -n 1)

echo ""
echo "Release complete:"
echo "  App: $APP_PATH"
echo "  DMG: $DMG_PATH"

if [[ "$OPEN_DMG" == "1" ]]; then
  open "$DMG_PATH"
fi
