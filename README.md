# Wallpaper Setter

Local-first macOS wallpaper app with fast preview, safe apply, and goals wallpaper generation. Built with Electron + React.

## Prerequisites

- macOS 13+ (Ventura or later)
- Node.js 18+

## Quick Start

```bash
cd electron && npm install
npm run dev
```

## Architecture

```
electron/
  src/main/               # Electron main process (wallpaper apply via osascript, JSON persistence)
  src/preload/            # Context bridge
  src/renderer/           # React UI (dark theme, goals canvas rendering)
```

- **Main process**: Manages window, applies wallpaper via `osascript`, persists state as JSON via Node.js
- **Renderer**: Dark-mode-first React UI with goals wallpaper generation on Canvas

## Current Scope

- Import local images (file picker + drag & drop)
- Preview selected/generated wallpaper
- Apply wallpaper to all displays via `osascript`
- Generate goals wallpaper with dark/light themes
- Persist history, last applied wallpaper, and goals draft
- Delete entry / clear history

## Known Limitations

- macOS-only
- Same image applied to all displays (no per-display selection yet)
- Supported formats: `jpg`, `jpeg`, `png`, `gif`, `heic`, `bmp`, `tiff`, `webp`
