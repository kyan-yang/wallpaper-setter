#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DIST_DIR="$ROOT_DIR/dist"
PRODUCT_NAME="${PRODUCT_NAME:-WallpaperSetter}"
APP_BUNDLE_PATH="${APP_BUNDLE_PATH:-$DIST_DIR/${PRODUCT_NAME}.app}"
APP_VERSION="$(node -p "require('$ROOT_DIR/electron/package.json').version")"
DMG_PATH="$DIST_DIR/${PRODUCT_NAME}-${APP_VERSION}.dmg"

if [[ ! -d "$APP_BUNDLE_PATH" ]]; then
  echo "App bundle not found at $APP_BUNDLE_PATH"
  exit 1
fi

mkdir -p "$DIST_DIR"
STAGING_DIR="$(mktemp -d "${DIST_DIR}/dmg-staging.XXXXXX")"

echo "Preparing DMG staging directory: $STAGING_DIR"
ditto "$APP_BUNDLE_PATH" "$STAGING_DIR/${PRODUCT_NAME}.app"
ln -s /Applications "$STAGING_DIR/Applications"

echo "Creating DMG: $DMG_PATH"
rm -f "$DMG_PATH"
hdiutil create \
  -volname "$PRODUCT_NAME" \
  -srcfolder "$STAGING_DIR" \
  -ov \
  -format UDZO \
  "$DMG_PATH"

rm -rf "$STAGING_DIR"

echo "DMG ready: $DMG_PATH"
