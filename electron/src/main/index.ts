import { app, BrowserWindow, ipcMain, dialog, shell } from 'electron';
import path from 'path';
import { Sidecar } from './sidecar';

const isDev = !app.isPackaged;

let mainWindow: BrowserWindow | null = null;
let sidecar: Sidecar;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1100,
    height: 720,
    minWidth: 900,
    minHeight: 620,
    titleBarStyle: 'hiddenInset',
    trafficLightPosition: { x: 16, y: 18 },
    backgroundColor: '#0F0F11',
    show: false,
    webPreferences: {
      preload: path.join(__dirname, '..', 'preload', 'index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
  } else {
    mainWindow.loadFile(path.join(__dirname, '..', 'renderer', 'index.html'));
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function getSidecarPath(): string {
  if (process.env.SIDECAR_PATH) {
    return process.env.SIDECAR_PATH;
  }
  if (isDev) {
    return path.resolve(__dirname, '..', '..', '..', '.build', 'debug', 'WallpaperSetterCLI');
  }
  return path.join(process.resourcesPath!, 'sidecar', 'WallpaperSetterCLI');
}

app.whenReady().then(() => {
  sidecar = new Sidecar(getSidecarPath());
  registerIPC();
  createWindow();
});

app.on('window-all-closed', () => {
  app.quit();
});

function registerIPC() {
  ipcMain.handle('sidecar:bootstrap', async () => {
    return sidecar.run('bootstrap');
  });

  ipcMain.handle('sidecar:apply', async (_event, filePath: string) => {
    return sidecar.run('apply', [filePath]);
  });

  ipcMain.handle('sidecar:generate-goals', async (_event, json: string) => {
    return sidecar.run('generate-goals', [json]);
  });

  ipcMain.handle('sidecar:save-draft', async (_event, json: string) => {
    return sidecar.run('save-draft', [json]);
  });

  ipcMain.handle('sidecar:delete-history', async (_event, id: string) => {
    return sidecar.run('delete-history', [id]);
  });

  ipcMain.handle('sidecar:clear-history', async () => {
    return sidecar.run('clear-history');
  });

  ipcMain.handle('sidecar:screen-info', async () => {
    return sidecar.run('screen-info');
  });

  ipcMain.handle('dialog:open-file', async () => {
    if (!mainWindow) return null;
    const result = await dialog.showOpenDialog(mainWindow, {
      properties: ['openFile'],
      filters: [
        { name: 'Images', extensions: ['jpg', 'jpeg', 'png', 'gif', 'heic', 'bmp', 'tiff', 'webp'] },
      ],
    });
    if (result.canceled || result.filePaths.length === 0) return null;
    return result.filePaths[0];
  });

  ipcMain.handle('shell:show-in-finder', async (_event, filePath: string) => {
    shell.showItemInFolder(filePath);
  });
}
