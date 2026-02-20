import { app, BrowserWindow, ipcMain, dialog, shell, protocol, net, screen } from 'electron';
import path from 'path';
import fs from 'fs';
import * as persistence from './persistence';
import { applyWallpaper, getScreenSize } from './wallpaper';
import { randomUUID } from 'crypto';

const isDev = !app.isPackaged;

let mainWindow: BrowserWindow | null = null;

function applyFailureSuggestion(message: string): string {
  if (/not authorized to send apple events to system events/i.test(message) || /-1743/.test(message)) {
    return 'Allow Automation for System Events in System Settings > Privacy & Security > Automation, then retry.';
  }

  return 'Try another image or retry.';
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1100,
    height: 720,
    minWidth: 900,
    minHeight: 620,
    titleBarStyle: 'hiddenInset',
    trafficLightPosition: { x: 16, y: 18 },
    backgroundColor: '#F5EDE0',
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

function generatedDir(): string {
  return path.join(app.getPath('userData'), 'Generated');
}

app.whenReady().then(() => {
  protocol.handle('local-file', (request) => {
    const filePath = decodeURIComponent(request.url.replace('local-file://', ''));
    return net.fetch(`file://${filePath}`);
  });

  registerIPC();
  createWindow();
});

app.on('window-all-closed', () => {
  app.quit();
});

function registerIPC() {
  ipcMain.handle('app:bootstrap', async () => {
    try {
      return persistence.bootstrap();
    } catch (error: any) {
      return { error: true, code: 'persistence_failed', message: error.message, suggestion: '' };
    }
  });

  ipcMain.handle('app:apply', async (_event, filePath: string) => {
    try {
      applyWallpaper(filePath);

      const entry = {
        id: randomUUID(),
        fileURL: filePath,
        createdAt: new Date().toISOString(),
        source: 'localImage',
        metadata: {},
      };
      persistence.addHistoryEntry(entry);
      persistence.saveLastApplied(filePath);

      return { success: true, message: 'Wallpaper applied.', entry };
    } catch (error: any) {
      return {
        error: true,
        code: 'apply_failed',
        message: error.message,
        suggestion: applyFailureSuggestion(error.message ?? ''),
      };
    }
  });

  ipcMain.handle('app:save-rendered-image', async (_event, imageData: Uint8Array) => {
    try {
      const dir = generatedDir();
      fs.mkdirSync(dir, { recursive: true });

      const now = new Date();
      const pad = (n: number) => String(n).padStart(2, '0');
      const filename = `goals-${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}.png`;
      const filePath = path.join(dir, filename);

      fs.writeFileSync(filePath, Buffer.from(imageData));

      const { width, height } = getScreenSize();
      return { success: true, fileURL: filePath, width, height };
    } catch (error: any) {
      return { error: true, code: 'render_failed', message: error.message, suggestion: 'Try again.' };
    }
  });

  ipcMain.handle('app:save-draft', async (_event, json: string) => {
    try {
      persistence.saveGoalsDraft(JSON.parse(json));
      return { success: true };
    } catch (error: any) {
      return { error: true, code: 'persistence_failed', message: error.message, suggestion: '' };
    }
  });

  ipcMain.handle('app:delete-history', async (_event, id: string) => {
    try {
      persistence.deleteHistoryEntry(id);
      return { success: true };
    } catch (error: any) {
      return { error: true, code: 'persistence_failed', message: error.message, suggestion: '' };
    }
  });

  ipcMain.handle('app:clear-history', async () => {
    try {
      persistence.clearHistory();
      return { success: true };
    } catch (error: any) {
      return { error: true, code: 'persistence_failed', message: error.message, suggestion: '' };
    }
  });

  ipcMain.handle('app:screen-info', async () => {
    return getScreenSize();
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
