# Wallpaper Setter

Local-first macOS wallpaper app with fast preview, safe apply, and goals wallpaper generation.

## Prerequisites

- macOS 13+ (Ventura or later)
- Xcode 15+ or Swift 5.10 toolchain

## Run and Test

```bash
swift build
swift run WallpaperSetter
swift test
```

## Architecture

- `UI`: SwiftUI views (`ContentView`) with library, preview, and goals panels
- `State`: `WallpaperStateStore` for selection, status, history, and errors
- `Adapters`: `MacOSWallpaperAdapter` for `NSWorkspace` wallpaper apply
- `Renderer`: `GoalsPNGRenderer` for goals text -> local PNG
- `Persistence`: `FileWallpaperPersistence` in `~/Library/Application Support/WallpaperSetter`

## Current Scope

- Import local image
- Preview selected/generated wallpaper
- Apply wallpaper to all displays
- Generate goals wallpaper with themes
- Persist history, last applied wallpaper, and goals draft
- Delete entry / clear history with confirmation

## Known Limitations

- macOS-only
- Same image applied to all displays (no per-display selection yet)
- Lock screen control is not independently automated
- Supported extensions: `jpg`, `jpeg`, `png`, `gif`, `heic`, `bmp`, `tiff`, `webp`

## Manual QA

Use `docs/manual-qa-checklist.md`.
