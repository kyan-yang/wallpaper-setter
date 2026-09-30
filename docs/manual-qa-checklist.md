# Manual QA Checklist

## Browse

- Launch the app. Expected: the folder holding the current wallpaper (or the last folder you opened) is open and revealed in the tree, and the current wallpaper is selected and badged.
- Expand folders in the tree with the mouse and with the arrow keys. Expected: image counts appear beside folders that hold images.
- Move through the grid with the arrow keys. Expected: the preview updates immediately and sharpens a moment later.
- Save a new image into the open folder from Finder. Expected: it appears at the top of the grid without reopening the folder.

## Preview

- Press Space. Expected: a full-window preview cropped to the display's aspect ratio; arrows keep browsing; Escape or Space closes it.

## Set and undo

- Press Return on an image. Expected: the button shows progress, then a confirmation, and the Current badge moves.
- Switch to every other Space and connect a second display. Expected: all of them show the new image.
- Press ⌘Z. Expected: the previous wallpaper returns everywhere.
- Undo until nothing is left. Expected: Undo is disabled.

## Adding folders

- Press ⌘O and pick a folder outside your home folder. Expected: it is added to the tree and opened.
- Drop a folder on the window. Expected: same as ⌘O. Drop an image. Expected: its folder opens with the image selected.
- Remove an added folder from the tree. Expected: it disappears and the files are untouched.

## Failures

- Deny access to Desktop or Documents when macOS asks, then open that folder. Expected: an error explaining where to allow access.
- Delete the selected image in Finder, then press Return. Expected: a persistent error saying the file no longer exists.
- Corrupt `~/Library/Application Support/WallpaperSetter/prefs.json`, then launch. Expected: a full-window error naming the file.
