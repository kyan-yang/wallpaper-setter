# Manual QA Checklist

## Multi-display Apply

- Connect 2+ displays.
- Select a valid wallpaper.
- Click `Apply`.
- Expected: wallpaper updates on all displays with no silent failure.

## Missing File Failure

- Apply an image so it appears in history.
- Move or delete the image file in Finder.
- Try to apply/select it again.
- Expected: visible error banner with actionable message.

## Unsupported Format Failure

- Try to import an unsupported file type.
- Expected: user-visible format failure (no crash, no silent fallback).

## Relaunch Persistence

- Set goals draft text and apply a wallpaper.
- Quit the app and relaunch.
- Expected: history, goals draft, and last applied selection are restored.

## History Delete Confirmation

- With at least one history entry, click `Delete`.
- Expected: confirmation appears.
- Confirm delete.
- Expected: entry is removed and persisted.

## History Clear Confirmation

- With non-empty history, click `Clear All`.
- Expected: confirmation appears.
- Confirm clear.
- Expected: all entries are removed and persisted.

## Goals Generation Flow

- Enter title/goals and choose theme.
- Click `Generate Preview`.
- Expected: preview updates to generated image.
- Click `Apply`.
- Expected: generated wallpaper applies and appears in history.
