// The contract between the main process and the renderer. The preload script
// exposes an object of type `Api` as `window.api`.

export interface FolderEntry {
  path: string;
  name: string;
}

export interface ImageEntry {
  path: string;
  name: string;
  mtimeMs: number;
}

// Folders are sorted by name; images newest first, so new files land at the top.
export interface FolderListing {
  folders: FolderEntry[];
  images: ImageEntry[];
}

export interface BootState {
  home: string;
  // Extra tree roots the user added with ⌘O or by dropping a folder.
  folders: string[];
  lastFolder: string | null;
  // The wallpaper macOS reports for the main display right now.
  wallpaper: string;
  canUndo: boolean;
  // Main display size in points; the preview uses its aspect ratio.
  screen: { width: number; height: number };
  // macOS accent color as #rrggbb.
  accentColor: string;
}

export interface WallpaperState {
  wallpaper: string;
  canUndo: boolean;
}

export type MenuCommand = 'open-folder' | 'undo';

export interface Api {
  boot(): Promise<BootState>;
  listFolder(dir: string): Promise<FolderListing>;
  countImages(dir: string): Promise<number>;
  setWallpaper(path: string): Promise<WallpaperState>;
  undoWallpaper(): Promise<WallpaperState>;
  chooseFolder(): Promise<string | null>;
  addFolder(dir: string): Promise<string[]>;
  removeFolder(dir: string): Promise<string[]>;
  rememberFolder(dir: string): Promise<void>;
  // Watches one folder at a time; calling it again replaces the previous watch.
  watchFolder(dir: string): Promise<void>;
  revealInFinder(path: string): Promise<void>;
  onFolderChanged(listener: (dir: string) => void): () => void;
  onMenu(listener: (command: MenuCommand) => void): () => void;
  // Absolute path of a file dropped onto the window.
  pathForFile(file: File): string;
}

export const IMAGE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'heic', 'heif', 'tif', 'tiff', 'gif', 'bmp', 'webp'];

export function isImagePath(path: string): boolean {
  const dot = path.lastIndexOf('.');
  return dot !== -1 && IMAGE_EXTENSIONS.includes(path.slice(dot + 1).toLowerCase());
}

// Served by the main process: a JPEG of the image scaled to fit `size` pixels.
// `mtimeMs` busts the browser cache when the file changes.
export function imageUrl(path: string, size: number, mtimeMs: number): string {
  return `wp://image/?path=${encodeURIComponent(path)}&size=${size}&v=${Math.round(mtimeMs)}`;
}

// ipcRenderer.invoke wraps main-process errors as
// "Error invoking remote method 'x': Error: message"; show only the message.
export function errorMessage(error: unknown): string {
  const raw = error instanceof Error ? error.message : String(error);
  return raw.replace(/^Error invoking remote method '[^']+': /, '').replace(/^Error: /, '');
}
