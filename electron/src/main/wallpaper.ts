import { execFileSync } from 'child_process';
import { screen } from 'electron';
import fs from 'fs';

const SUPPORTED_EXTENSIONS = ['jpg', 'jpeg', 'png', 'gif', 'heic', 'bmp', 'tiff', 'webp'];

export function applyWallpaper(filePath: string): void {
  if (!fs.existsSync(filePath)) {
    throw new Error(`File not found: ${filePath}`);
  }

  const ext = filePath.split('.').pop()?.toLowerCase() ?? '';
  if (!SUPPORTED_EXTENSIONS.includes(ext)) {
    throw new Error(`Unsupported format: ${ext}. Use: ${SUPPORTED_EXTENSIONS.join(', ')}`);
  }

  try {
    execFileSync('osascript', [
      '-e', 'on run argv',
      '-e', '  tell application "System Events" to tell every desktop to set picture to (item 1 of argv)',
      '-e', 'end run',
      '--',
      filePath,
    ], { timeout: 10000 });
  } catch (error: any) {
    throw new Error(`Failed to set wallpaper: ${error.message}`);
  }
}

export function getScreenSize(): { width: number; height: number } {
  const display = screen.getPrimaryDisplay();
  return { width: display.size.width, height: display.size.height };
}
