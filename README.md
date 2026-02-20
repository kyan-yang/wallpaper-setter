# Wallpaper Setter

Local-first macOS wallpaper app with fast preview, safe apply, and goals wallpaper generation.

## Prerequisites

- macOS 13+ (Ventura or later)
- Xcode 15+ or Swift 5.10 toolchain

## Run and Test

```bash
swift build
swift run WallpaperSetter
./scripts/run-app.sh
swift test
```

## Build Downloadable App

Build a local macOS app bundle and DMG:

```bash
./scripts/build-app.sh
./scripts/package-dmg.sh
```

One-step release (build + package + optionally open DMG):

```bash
VERSION=0.2.0 ./scripts/release-local.sh
```

Use `OPEN_DMG=0` to skip auto-opening the DMG after packaging.

Cleanup generated artifacts:

```bash
./scripts/clean-artifacts.sh
```

Use `KEEP_DIST=0 ./scripts/clean-artifacts.sh` to also remove `dist/`.

Outputs:
- `dist/WallpaperSetter.app`
- `dist/WallpaperSetter-0.1.0.dmg` (or `WallpaperSetter-$VERSION.dmg` if `VERSION` is set)

For CI release packaging, see `.github/README-release-secrets.md`.

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
