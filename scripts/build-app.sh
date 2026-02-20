#!/usr/bin/env bash
set -euo pipefail

# Build a Swift package app via xcodebuild and produce a minimal .app bundle.
# Optional env: CONFIGURATION, DERIVED_DATA_PATH, PRODUCT_NAME, OUTPUT_DIR

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$PROJECT_ROOT"

CONFIGURATION="${CONFIGURATION:-Release}"
DERIVED_DATA_PATH="${DERIVED_DATA_PATH:-.derived}"
PRODUCT_NAME="${PRODUCT_NAME:-WallpaperSetter}"
OUTPUT_DIR="${OUTPUT_DIR:-dist}"
SCHEME="wallpaper-setter"

# Build via xcodebuild
xcodebuild build \
  -scheme "$SCHEME" \
  -destination "platform=macOS" \
  -configuration "$CONFIGURATION" \
  -derivedDataPath "$DERIVED_DATA_PATH" \
  -quiet

PRODUCTS="$DERIVED_DATA_PATH/Build/Products/$CONFIGURATION"
APP_BUNDLE="$PRODUCTS/$PRODUCT_NAME.app"
BINARY_PATH="$PRODUCTS/$PRODUCT_NAME"

# Prefer existing .app bundle; otherwise create minimal bundle from binary
if [[ -d "$APP_BUNDLE" ]]; then
  # Copy existing app to output
  mkdir -p "$OUTPUT_DIR"
  rm -rf "$OUTPUT_DIR/$PRODUCT_NAME.app"
  cp -R "$APP_BUNDLE" "$OUTPUT_DIR/"
else
  # Create minimal app bundle (binary-only output)
  if [[ ! -f "$BINARY_PATH" ]]; then
    echo "Error: No built product at $BINARY_PATH or $APP_BUNDLE" >&2
    exit 1
  fi

  mkdir -p "$OUTPUT_DIR/$PRODUCT_NAME.app/Contents/MacOS"
  cp "$BINARY_PATH" "$OUTPUT_DIR/$PRODUCT_NAME.app/Contents/MacOS/$PRODUCT_NAME"
  chmod +x "$OUTPUT_DIR/$PRODUCT_NAME.app/Contents/MacOS/$PRODUCT_NAME"

  # Generate minimal Info.plist
  cat > "$OUTPUT_DIR/$PRODUCT_NAME.app/Contents/Info.plist" << EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>CFBundleExecutable</key>
  <string>$PRODUCT_NAME</string>
  <key>CFBundleIdentifier</key>
  <string>com.wallpaper-setter.app</string>
  <key>CFBundleName</key>
  <string>$PRODUCT_NAME</string>
  <key>CFBundlePackageType</key>
  <string>APPL</string>
  <key>CFBundleShortVersionString</key>
  <string>1.0.0</string>
  <key>LSMinimumSystemVersion</key>
  <string>13.0</string>
</dict>
</plist>
EOF
fi

FINAL_APP="$OUTPUT_DIR/$PRODUCT_NAME.app"
echo "$FINAL_APP"
