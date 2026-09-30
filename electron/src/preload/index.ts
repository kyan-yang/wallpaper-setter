import { contextBridge, ipcRenderer, webUtils, type IpcRendererEvent } from 'electron';
import type { Api, MenuCommand } from '../shared/api';

function subscribe<T>(channel: string, listener: (value: T) => void): () => void {
  const handler = (_event: IpcRendererEvent, value: T) => listener(value);
  ipcRenderer.on(channel, handler);
  return () => ipcRenderer.removeListener(channel, handler);
}

const api: Api = {
  boot: () => ipcRenderer.invoke('boot'),
  listFolder: (dir) => ipcRenderer.invoke('list-folder', dir),
  countImages: (dir) => ipcRenderer.invoke('count-images', dir),
  setWallpaper: (path) => ipcRenderer.invoke('set-wallpaper', path),
  undoWallpaper: () => ipcRenderer.invoke('undo-wallpaper'),
  chooseFolder: () => ipcRenderer.invoke('choose-folder'),
  addFolder: (dir) => ipcRenderer.invoke('add-folder', dir),
  removeFolder: (dir) => ipcRenderer.invoke('remove-folder', dir),
  rememberFolder: (dir) => ipcRenderer.invoke('remember-folder', dir),
  watchFolder: (dir) => ipcRenderer.invoke('watch-folder', dir),
  revealInFinder: (path) => ipcRenderer.invoke('reveal-in-finder', path),
  onFolderChanged: (listener) => subscribe<string>('folder-changed', listener),
  onMenu: (listener) => subscribe<MenuCommand>('menu', listener),
  pathForFile: (file) => webUtils.getPathForFile(file),
};

contextBridge.exposeInMainWorld('api', api);
