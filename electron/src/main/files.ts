import fs from 'fs';
import path from 'path';
import { isImagePath, type FolderEntry, type FolderListing, type ImageEntry } from '../shared/api';

// Directories that Finder shows as single files (apps, libraries, documents).
const PACKAGE_EXTENSIONS = new Set([
  'app', 'bundle', 'framework', 'plugin', 'kext', 'photoslibrary', 'photolibrary', 'migratedphotolibrary',
  'aplibrary', 'musiclibrary', 'tvlibrary', 'imovielibrary', 'fcpbundle', 'lrdata', 'lrlibrary', 'rtfd',
  'pages', 'numbers', 'key', 'xcodeproj', 'xcworkspace', 'playground', 'sparsebundle', 'photobooth',
]);

function isHidden(name: string): boolean {
  return name.startsWith('.');
}

function isPackage(name: string): boolean {
  const dot = name.lastIndexOf('.');
  return dot > 0 && PACKAGE_EXTENSIONS.has(name.slice(dot + 1).toLowerCase());
}

function describeError(error: NodeJS.ErrnoException, target: string): Error {
  if (error.code === 'EPERM' || error.code === 'EACCES') {
    return new Error(
      `macOS blocked access to ${target}. Allow WallpaperSetter in System Settings › Privacy & Security › Files and Folders, then open the folder again.`,
    );
  }
  if (error.code === 'ENOENT') return new Error(`${target} no longer exists.`);
  if (error.code === 'ENOTDIR') return new Error(`${target} is not a folder.`);
  return new Error(`Could not read ${target}: ${error.message}`);
}

async function readEntries(dir: string): Promise<fs.Dirent[]> {
  try {
    return await fs.promises.readdir(dir, { withFileTypes: true });
  } catch (error) {
    throw describeError(error as NodeJS.ErrnoException, dir);
  }
}

// Follows symlinks so a linked folder or image behaves like the real thing.
async function kindOf(dir: string, entry: fs.Dirent): Promise<'folder' | 'file' | 'other'> {
  if (entry.isDirectory()) return 'folder';
  if (entry.isFile()) return 'file';
  if (!entry.isSymbolicLink()) return 'other';
  const stat = await fs.promises.stat(path.join(dir, entry.name)).catch(() => null);
  if (!stat) return 'other';
  return stat.isDirectory() ? 'folder' : stat.isFile() ? 'file' : 'other';
}

export async function listFolder(dir: string): Promise<FolderListing> {
  const entries = (await readEntries(dir)).filter((entry) => !isHidden(entry.name));
  const kinds = await Promise.all(entries.map((entry) => kindOf(dir, entry)));

  const folders: FolderEntry[] = [];
  const imagePaths: string[] = [];
  entries.forEach((entry, i) => {
    const full = path.join(dir, entry.name);
    if (kinds[i] === 'folder' && !isPackage(entry.name)) folders.push({ path: full, name: entry.name });
    if (kinds[i] === 'file' && isImagePath(entry.name)) imagePaths.push(full);
  });

  const images: ImageEntry[] = await Promise.all(imagePaths.map(async (full) => {
    const stat = await fs.promises.stat(full);
    return { path: full, name: path.basename(full), mtimeMs: stat.mtimeMs };
  }));

  folders.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' }));
  images.sort((a, b) => b.mtimeMs - a.mtimeMs || a.name.localeCompare(b.name, undefined, { numeric: true }));
  return { folders, images };
}

export async function countImages(dir: string): Promise<number> {
  const entries = await readEntries(dir);
  return entries.filter((entry) => !isHidden(entry.name) && !entry.isDirectory() && isImagePath(entry.name)).length;
}
