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

function xmlEscape(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');
}

export function patchWallpaperStoreXml(rawStoreXml: string, targetFileURL: string): { rawStoreXml: string; updates: number } {
  const escapedURL = xmlEscape(targetFileURL);
  const relativeFileValuePattern = /(<key>\s*relative\s*<\/key>\s*<string>)[^<]*(<\/string>)/g;

  let updates = 0;
  const nextXml = rawStoreXml.replace(relativeFileValuePattern, (_match, prefix: string, suffix: string) => {
    updates += 1;
    return `${prefix}${escapedURL}${suffix}`;
  });

  return { rawStoreXml: nextXml, updates };
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
  const xmlPath = path.join(tempDir, 'index.xml');

  try {
    dependencies.execSync('plutil', ['-convert', 'xml1', '-o', xmlPath, storePath], { timeout: 10000 });
    const rawStoreXml = dependencies.readFileSync(xmlPath, 'utf8');
    const patchResult = patchWallpaperStoreXml(rawStoreXml, fileURL(filePath));
    if (patchResult.updates === 0) {
      throw new Error('No desktop wallpaper entries were found in macOS wallpaper store.');
    }
    dependencies.writeFileSync(xmlPath, patchResult.rawStoreXml);
    dependencies.execSync('plutil', ['-convert', 'binary1', '-o', storePath, xmlPath], { timeout: 10000 });

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
