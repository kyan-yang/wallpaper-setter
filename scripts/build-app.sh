#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ELECTRON_DIR="$ROOT_DIR/electron"
DIST_DIR="$ROOT_DIR/dist"
PRODUCT_NAME="${PRODUCT_NAME:-WallpaperSetter}"
APP_BUNDLE_PATH="${APP_BUNDLE_PATH:-$DIST_DIR/${PRODUCT_NAME}.app}"

echo "Installing dependencies in $ELECTRON_DIR"
npm ci --prefix "$ELECTRON_DIR"

echo "Building app bundle (mac dir target)"
npm run package:app --prefix "$ELECTRON_DIR"

rm -rf "$DIST_DIR"
mkdir -p "$DIST_DIR"

APP_FROM_BUILD="$(find "$ELECTRON_DIR/dist" -maxdepth 4 -type d -name "${PRODUCT_NAME}.app" | head -n 1)"
if [[ -z "$APP_FROM_BUILD" ]]; then
  APP_FROM_BUILD="$(find "$ELECTRON_DIR/dist" -maxdepth 4 -type d -name "*.app" | head -n 1)"
fi

if [[ -z "$APP_FROM_BUILD" ]]; then
  echo "No .app bundle found under $ELECTRON_DIR/dist"
  exit 1
fi

echo "Copying app bundle to $APP_BUNDLE_PATH"
ditto "$APP_FROM_BUILD" "$APP_BUNDLE_PATH"

echo "App bundle ready: $APP_BUNDLE_PATH"
