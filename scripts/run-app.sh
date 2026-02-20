#!/usr/bin/env bash
set -euo pipefail

APP_NAME="WallpaperSetter"

echo "Launching ${APP_NAME}..."
swift run "${APP_NAME}" &
APP_PID=$!

# Give LaunchServices time to create the app process/window.
sleep 1

if ! osascript -e "tell application \"System Events\" to set frontmost of process \"${APP_NAME}\" to true" >/dev/null 2>&1; then
  echo "Warning: could not bring ${APP_NAME} to front automatically."
  echo "If needed, use Cmd+Tab or run:"
  echo "  osascript -e 'tell application \"System Events\" to set frontmost of process \"${APP_NAME}\" to true'"
fi

wait "${APP_PID}"
