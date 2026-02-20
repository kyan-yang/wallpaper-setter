#!/usr/bin/env bash
set -euo pipefail

# Create a DMG for the built app. Builds app if missing.
# Optional env: PRODUCT_NAME, OUTPUT_DIR, VERSION

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$PROJECT_ROOT"

PRODUCT_NAME="${PRODUCT_NAME:-WallpaperSetter}"
OUTPUT_DIR="${OUTPUT_DIR:-dist}"
VERSION="${VERSION:-0.1.0}"

APP_PATH="$OUTPUT_DIR/$PRODUCT_NAME.app"

# Ensure app exists; build if not
if [[ ! -d "$APP_PATH" ]]; then
  "$SCRIPT_DIR/build-app.sh"
fi

# Staging directory for DMG contents
STAGING="$OUTPUT_DIR/dmg-staging"
rm -rf "$STAGING"
mkdir -p "$STAGING"

# Copy app and add Applications symlink
cp -R "$APP_PATH" "$STAGING/"
ln -s /Applications "$STAGING/Applications"

# Create DMG
DMG_NAME="$PRODUCT_NAME-$VERSION.dmg"
DMG_PATH="$OUTPUT_DIR/$DMG_NAME"
rm -f "$DMG_PATH"

hdiutil create \
  -volname "$PRODUCT_NAME" \
  -srcfolder "$STAGING" \
  -ov \
  -format UDZO \
  -fs HFS+ \
  "$DMG_PATH"

rm -rf "$STAGING"
echo "$DMG_PATH"
