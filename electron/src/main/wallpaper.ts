import { execFileSync } from 'child_process';
import { screen } from 'electron';
import fs from 'fs';

const SUPPORTED_EXTENSIONS = ['jpg', 'jpeg', 'png', 'gif', 'heic', 'bmp', 'tiff', 'webp'];
const WALLPAPER_SCRIPT_LINES = [
  'on run argv',
  'set targetFile to POSIX file (item 1 of argv)',
  'tell application "System Events"',
  'repeat with desktopRef in desktops',
  'set picture of desktopRef to targetFile',
  'end repeat',
  'end tell',
  'end run',
] as const;

type ExecSync = (command: string, args: string[], options: { timeout: number }) => unknown;

export interface WallpaperDependencies {
  existsSync: (path: string) => boolean;
  execSync: ExecSync;
}

const defaultDependencies: WallpaperDependencies = {
  existsSync: (path) => fs.existsSync(path),
  execSync: (command, args, options) => execFileSync(command, args, options),
};

export function buildWallpaperApplyCommand(filePath: string): { command: string; args: string[] } {
  const scriptArgs = WALLPAPER_SCRIPT_LINES.flatMap((line) => ['-e', line]);
  scriptArgs.push(filePath);
  return { command: 'osascript', args: scriptArgs };
}

function extensionFor(path: string): string {
  return path.split('.').pop()?.toLowerCase() ?? '';
}

function execErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    const candidate = error as Error & { stderr?: Buffer | string };
    if (typeof candidate.stderr === 'string' && candidate.stderr.trim()) {
      return candidate.stderr.trim();
    }
    if (Buffer.isBuffer(candidate.stderr)) {
      const text = candidate.stderr.toString('utf8').trim();
      if (text) {
        return text;
      }
    }
    return candidate.message;
  }

  return String(error);
}

export function applyWallpaper(filePath: string, dependencies: WallpaperDependencies = defaultDependencies): void {
  if (!dependencies.existsSync(filePath)) {
    throw new Error(`File not found: ${filePath}`);
  }

  const ext = extensionFor(filePath);
  if (!SUPPORTED_EXTENSIONS.includes(ext)) {
    throw new Error(`Unsupported format: ${ext}. Use: ${SUPPORTED_EXTENSIONS.join(', ')}`);
  }

  const { command, args } = buildWallpaperApplyCommand(filePath);

  try {
    dependencies.execSync(command, args, { timeout: 10000 });
  } catch (error: unknown) {
    throw new Error(`Failed to set wallpaper on every desktop: ${execErrorMessage(error)}`);
  }
}

export function getScreenSize(): { width: number; height: number } {
  const display = screen.getPrimaryDisplay();
  return { width: display.size.width, height: display.size.height };
}
