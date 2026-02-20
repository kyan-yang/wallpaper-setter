import { execFileSync } from 'child_process';
import { screen } from 'electron';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { pathToFileURL } from 'url';

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
const WALLPAPER_STORE_RELATIVE_PATH = ['Library', 'Application Support', 'com.apple.wallpaper', 'Store', 'Index.plist'] as const;

type ExecSync = (command: string, args: string[], options: { timeout: number }) => unknown;

export interface WallpaperDependencies {
  existsSync: (path: string) => boolean;
  execSync: ExecSync;
  readFileSync: (path: string, encoding: 'utf8') => string;
  writeFileSync: (path: string, data: string) => void;
  mkdtempSync: (prefix: string) => string;
  rmSync: (path: string, options: { recursive: boolean; force: boolean }) => void;
  homedir: () => string;
  tmpdir: () => string;
}

const defaultDependencies: WallpaperDependencies = {
  existsSync: (path) => fs.existsSync(path),
  execSync: (command, args, options) => execFileSync(command, args, options),
  readFileSync: (targetPath, encoding) => fs.readFileSync(targetPath, encoding),
  writeFileSync: (targetPath, data) => fs.writeFileSync(targetPath, data),
  mkdtempSync: (prefix) => fs.mkdtempSync(prefix),
  rmSync: (targetPath, options) => fs.rmSync(targetPath, options),
  homedir: () => os.homedir(),
  tmpdir: () => os.tmpdir(),
};

export function buildWallpaperApplyCommand(filePath: string): { command: string; args: string[] } {
  const scriptArgs = WALLPAPER_SCRIPT_LINES.flatMap((line) => ['-e', line]);
  scriptArgs.push(filePath);
  return { command: 'osascript', args: scriptArgs };
}

function extensionFor(path: string): string {
  return path.split('.').pop()?.toLowerCase() ?? '';
}

function wallpaperStorePath(homeDir: string): string {
  return path.join(homeDir, ...WALLPAPER_STORE_RELATIVE_PATH);
}

function fileURL(filePath: string): string {
  return pathToFileURL(filePath).toString();
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function updateDesktopChoices(node: unknown, targetFileURL: string): number {
  if (!isRecord(node)) {
    return 0;
  }

  const desktop = node.Desktop;
  if (!isRecord(desktop)) {
    return 0;
  }

  const content = desktop.Content;
  if (!isRecord(content)) {
    return 0;
  }

  const choices = content.Choices;
  if (!Array.isArray(choices)) {
    return 0;
  }

  let updates = 0;
  for (const choice of choices) {
    if (!isRecord(choice) || !Array.isArray(choice.Files)) {
      continue;
    }

    for (const fileNode of choice.Files) {
      if (!isRecord(fileNode)) {
        continue;
      }

      if (typeof fileNode.relative === 'string') {
        fileNode.relative = targetFileURL;
        updates += 1;
      }
    }
  }

  return updates;
}

export function patchWallpaperStore(rawStoreJson: string, targetFileURL: string): { rawStoreJson: string; updates: number } {
  const parsed = JSON.parse(rawStoreJson) as unknown;

  const pending: unknown[] = [parsed];
  let updates = 0;
  while (pending.length > 0) {
    const candidate = pending.pop();
    if (Array.isArray(candidate)) {
      pending.push(...candidate);
      continue;
    }

    if (!isRecord(candidate)) {
      continue;
    }

    updates += updateDesktopChoices(candidate, targetFileURL);
    pending.push(...Object.values(candidate));
  }

  return { rawStoreJson: JSON.stringify(parsed), updates };
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

function syncWallpaperStore(filePath: string, dependencies: WallpaperDependencies): void {
  const storePath = wallpaperStorePath(dependencies.homedir());
  if (!dependencies.existsSync(storePath)) {
    return;
  }

  const tempDir = dependencies.mkdtempSync(path.join(dependencies.tmpdir(), 'wallpaper-store-'));
  const jsonPath = path.join(tempDir, 'index.json');

  try {
    dependencies.execSync('plutil', ['-convert', 'json', '-o', jsonPath, storePath], { timeout: 10000 });
    const rawStoreJson = dependencies.readFileSync(jsonPath, 'utf8');
    const patchResult = patchWallpaperStore(rawStoreJson, fileURL(filePath));
    if (patchResult.updates === 0) {
      throw new Error('No desktop wallpaper entries were found in macOS wallpaper store.');
    }
    dependencies.writeFileSync(jsonPath, patchResult.rawStoreJson);
    dependencies.execSync('plutil', ['-convert', 'binary1', '-o', storePath, jsonPath], { timeout: 10000 });

    try {
      dependencies.execSync('killall', ['WallpaperAgent'], { timeout: 5000 });
    } catch (error) {
      const message = execErrorMessage(error);
      if (!/No matching processes/i.test(message)) {
        throw error;
      }
      dependencies.execSync('killall', ['Dock'], { timeout: 5000 });
    }
  } catch (error: unknown) {
    throw new Error(`Failed to synchronize wallpaper across Spaces: ${execErrorMessage(error)}`);
  } finally {
    dependencies.rmSync(tempDir, { recursive: true, force: true });
  }
}

export function applyWallpaper(filePath: string, dependencyOverrides: Partial<WallpaperDependencies> = {}): void {
  const dependencies = { ...defaultDependencies, ...dependencyOverrides };
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
    syncWallpaperStore(filePath, dependencies);
  } catch (error: unknown) {
    throw new Error(`Failed to set wallpaper on every desktop: ${execErrorMessage(error)}`);
  }
}

export function getScreenSize(): { width: number; height: number } {
  const display = screen.getPrimaryDisplay();
  return { width: display.size.width, height: display.size.height };
}
