import { app, BrowserWindow, dialog, ipcMain, Menu, nativeImage, protocol, screen, shell, systemPreferences } from 'electron';
import fs from 'fs';
import os from 'os';
import path from 'path';
import type { BootState, MenuCommand, WallpaperState } from '../shared/api';
import { countImages, listFolder } from './files';
import { readPrefs, writePrefs, type Prefs } from './prefs';
import { readWallpapers, setWallpaper } from './wallpaper';

const isDev = !app.isPackaged;

let mainWindow: BrowserWindow | null = null;
let prefs: Prefs | null = null;
let watcher: fs.FSWatcher | null = null;
// Wallpaper changes run one at a time so rapid Returns or Undos cannot interleave.
let wallpaperQueue: Promise<unknown> = Promise.resolve();

protocol.registerSchemesAsPrivileged([
  { scheme: 'wp', privileges: { standard: true, secure: true, supportFetchAPI: true } },
]);

function prefsFile(): string {
  return path.join(app.getPath('userData'), 'prefs.json');
}

function currentPrefs(): Prefs {
  if (!prefs) throw new Error('Settings were not loaded.');
  return prefs;
}

function updatePrefs(change: (draft: Prefs) => void): Prefs {
  const next = structuredClone(currentPrefs());
  change(next);
  writePrefs(prefsFile(), next);
  prefs = next;
  return next;
}

function sendMenu(command: MenuCommand): void {
  mainWindow?.webContents.send('menu', command);
}

function buildMenu(): void {
  Menu.setApplicationMenu(Menu.buildFromTemplate([
    { role: 'appMenu' },
    {
      label: 'File',
      submenu: [
        { label: 'Open Folder…', accelerator: 'CmdOrCtrl+O', click: () => sendMenu('open-folder') },
        { type: 'separator' },
        { role: 'close' },
      ],
    },
    {
      label: 'Edit',
      submenu: [
        { label: 'Undo Wallpaper Change', accelerator: 'CmdOrCtrl+Z', click: () => sendMenu('undo') },
      ],
    },
    {
      label: 'View',
      submenu: [
        ...(isDev ? [{ role: 'reload' as const }, { role: 'toggleDevTools' as const }, { type: 'separator' as const }] : []),
        { role: 'togglefullscreen' },
      ],
    },
    { role: 'windowMenu' },
  ]));
}

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 860,
    minHeight: 600,
    title: 'Wallpaper',
    titleBarStyle: 'hiddenInset',
    trafficLightPosition: { x: 16, y: 18 },
    vibrancy: 'sidebar',
    visualEffectState: 'followWindow',
    backgroundColor: '#00000000',
    show: false,
    webPreferences: {
      preload: path.join(__dirname, '..', 'preload', 'index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
  } else {
    mainWindow.loadFile(path.join(__dirname, '..', 'renderer', 'index.html'));
  }

  mainWindow.once('ready-to-show', () => mainWindow?.show());
  mainWindow.on('closed', () => {
    mainWindow = null;
    watcher?.close();
    watcher = null;
  });
}

// Serves wp://image/?path=…&size=… as a JPEG thumbnail rendered by Quick Look,
// so the grid never decodes full-size originals.
function registerImageProtocol(): void {
  protocol.handle('wp', async (request) => {
    const url = new URL(request.url);
    const file = url.searchParams.get('path');
    const size = Number(url.searchParams.get('size'));
    if (!file || !Number.isFinite(size) || size <= 0) {
      return new Response('Bad image request', { status: 400 });
    }
    try {
      const image = await nativeImage.createThumbnailFromPath(file, { width: size, height: size });
      return new Response(new Uint8Array(image.toJPEG(90)), {
        headers: { 'content-type': 'image/jpeg', 'cache-control': 'max-age=31536000, immutable' },
      });
    } catch (error) {
      return new Response(`Could not render ${file}: ${(error as Error).message}`, { status: 500 });
    }
  });
}

async function changeWallpaper(change: () => Promise<WallpaperState>): Promise<WallpaperState> {
  const next = wallpaperQueue.then(change);
  wallpaperQueue = next.catch(() => undefined);
  return next;
}

function registerIPC(): void {
  ipcMain.handle('boot', async (): Promise<BootState> => {
    prefs = readPrefs(prefsFile());
    const [wallpaper] = await readWallpapers();
    const { width, height } = screen.getPrimaryDisplay().size;
    return {
      home: os.homedir(),
      folders: prefs.folders,
      lastFolder: prefs.lastFolder,
      wallpaper,
      canUndo: prefs.undo.length > 0,
      screen: { width, height },
      accentColor: `#${systemPreferences.getAccentColor().slice(0, 6)}`,
    };
  });

  ipcMain.handle('list-folder', (_event, dir: string) => listFolder(dir));
  ipcMain.handle('count-images', (_event, dir: string) => countImages(dir));

  ipcMain.handle('set-wallpaper', (_event, imagePath: string) => changeWallpaper(async () => {
    const [previous] = await readWallpapers();
    await setWallpaper(imagePath);
    const next = updatePrefs((draft) => {
      if (previous && previous !== imagePath) draft.undo.push(previous);
    });
    return { wallpaper: imagePath, canUndo: next.undo.length > 0 };
  }));

  ipcMain.handle('undo-wallpaper', () => changeWallpaper(async () => {
    const target = currentPrefs().undo.at(-1);
    if (!target) throw new Error('There is no earlier wallpaper to go back to.');
    try {
      await setWallpaper(target);
    } catch (error) {
      // A wallpaper file that has since been moved or deleted can never be
      // restored, so drop it and tell the user; other failures keep it.
      if (!fs.existsSync(target)) updatePrefs((draft) => { draft.undo.pop(); });
      throw error;
    }
    const next = updatePrefs((draft) => { draft.undo.pop(); });
    return { wallpaper: target, canUndo: next.undo.length > 0 };
  }));

  ipcMain.handle('choose-folder', async () => {
    if (!mainWindow) throw new Error('The window is closed.');
    const result = await dialog.showOpenDialog(mainWindow, {
      properties: ['openDirectory'],
      defaultPath: currentPrefs().lastFolder ?? os.homedir(),
    });
    return result.canceled ? null : result.filePaths[0];
  });

  ipcMain.handle('add-folder', (_event, dir: string) => {
    const home = os.homedir();
    return updatePrefs((draft) => {
      if (dir !== home && !draft.folders.includes(dir)) draft.folders.push(dir);
    }).folders;
  });

  ipcMain.handle('remove-folder', (_event, dir: string) =>
    updatePrefs((draft) => { draft.folders = draft.folders.filter((folder) => folder !== dir); }).folders);

  ipcMain.handle('remember-folder', (_event, dir: string) => {
    updatePrefs((draft) => { draft.lastFolder = dir; });
  });

  ipcMain.handle('watch-folder', (event, dir: string) => {
    watcher?.close();
    let timer: NodeJS.Timeout | undefined;
    watcher = fs.watch(dir, () => {
      clearTimeout(timer);
      timer = setTimeout(() => event.sender.send('folder-changed', dir), 200);
    });
    watcher.on('error', () => {
      watcher?.close();
      watcher = null;
      event.sender.send('folder-changed', dir);
    });
  });

  ipcMain.handle('reveal-in-finder', (_event, target: string) => shell.showItemInFolder(target));
}

app.whenReady().then(() => {
  registerImageProtocol();
  registerIPC();
  buildMenu();
  createWindow();
});

app.on('window-all-closed', () => app.quit());
