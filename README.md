# Wallpaper Setter

Local-first macOS wallpaper app with fast preview, safe apply, and goals wallpaper generation. Electron + React frontend with a Swift native backend.

## Prerequisites

- macOS 13+ (Ventura or later)
- Xcode 15+ or Swift 5.10 toolchain
- Node.js 18+

## Quick Start (Electron)

```bash
# 1. Build the Swift CLI sidecar
swift build

# 2. Install Electron dependencies
cd electron && npm install

# 3. Run in development mode
npm run dev
```

## Run Native SwiftUI App (legacy)

```bash
swift build
swift run WallpaperSetter
```

## Tests

```bash
swift test
```

## Architecture

```
Sources/
  WallpaperSetterCore/    # Shared library (Adapters, Core, Models, Persistence, Renderer)
  WallpaperSetter/        # SwiftUI app (legacy)
  WallpaperSetterCLI/     # JSON CLI sidecar for Electron
electron/
  src/main/               # Electron main process + sidecar bridge
  src/preload/            # Context bridge
  src/renderer/           # React UI (Linear-inspired dark theme)
```

- **WallpaperSetterCore**: Shared Swift library with all backend logic
- **WallpaperSetterCLI**: Stateless CLI that accepts commands, returns JSON — bridge between Electron and native APIs
- **Electron main**: Spawns CLI sidecar, manages window, handles IPC
- **React renderer**: Dark-mode-first UI with custom design tokens

### CLI Sidecar Commands

```bash
WallpaperSetterCLI bootstrap          # Load persisted state
WallpaperSetterCLI apply <path>       # Apply wallpaper to all displays
WallpaperSetterCLI generate-goals '<json>'  # Render goals wallpaper
WallpaperSetterCLI save-draft '<json>'      # Persist goals draft
WallpaperSetterCLI delete-history <uuid>    # Delete history entry
WallpaperSetterCLI clear-history            # Clear all history
WallpaperSetterCLI screen-info              # Get main screen dimensions
```

## Current Scope

- Import local images (file picker + drag & drop)
- Preview selected/generated wallpaper
- Apply wallpaper to all displays via `NSWorkspace`
- Generate goals wallpaper with dark/light themes
- Persist history, last applied wallpaper, and goals draft
- Delete entry / clear history

## Known Limitations

- macOS-only
- Same image applied to all displays (no per-display selection yet)
- Supported formats: `jpg`, `jpeg`, `png`, `gif`, `heic`, `bmp`, `tiff`, `webp`
