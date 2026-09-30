# Wallpaper Setter

A macOS app for setting your background from your own images. Browse your folders, preview an image cropped exactly as your display will show it, and set it on every display and Space. Undo puts the previous wallpaper back.

## Prerequisites

- macOS 15 (Sequoia)
- Node.js 20+

## Quick Start

```bash
cd electron && npm install
npm run dev
```

## Keyboard

| Key | Action |
| --- | --- |
| Arrow keys | Browse images |
| Space | Full preview |
| Return | Set as wallpaper |
| ⌘Z | Undo the last wallpaper change |
| ⌘O | Open any folder |

## Packaging

```bash
npm run release:local
```

This builds `dist/WallpaperSetter.app` and `dist/WallpaperSetter-<version>.dmg`.

## Architecture

```
electron/
  src/main/       # window, IPC, wallpaper apply, folder listing, thumbnails, prefs
  src/preload/    # exposes the typed API from src/shared/api.ts as window.api
  src/shared/     # IPC contract shared by main and renderer
  src/renderer/   # React UI
```

macOS has no public API that sets one wallpaper on every Space. The app writes WallpaperAgent's store in its all-Spaces form (the state System Settings writes when "Show on all Spaces" is on), restarts WallpaperAgent, and confirms through `NSWorkspace` that every display shows the new image. If macOS changes the store's layout, applying fails with an error instead of guessing.

## Known Limitations

- macOS only.
- Every display gets the same image.
- Supported formats: `jpg`, `jpeg`, `png`, `heic`, `heif`, `tif`, `tiff`, `gif`, `bmp`, `webp`.
