import { contextBridge, ipcRenderer } from 'electron';

const api = {
  bootstrap: () => ipcRenderer.invoke('app:bootstrap'),
  apply: (filePath: string) => ipcRenderer.invoke('app:apply', filePath),
  saveRenderedImage: (imageData: Uint8Array) => ipcRenderer.invoke('app:save-rendered-image', imageData),
  saveDraft: (json: string) => ipcRenderer.invoke('app:save-draft', json),
  deleteHistory: (id: string) => ipcRenderer.invoke('app:delete-history', id),
  clearHistory: () => ipcRenderer.invoke('app:clear-history'),
  screenInfo: () => ipcRenderer.invoke('app:screen-info'),
  openFile: () => ipcRenderer.invoke('dialog:open-file'),
  showInFinder: (filePath: string) => ipcRenderer.invoke('shell:show-in-finder', filePath),
};

contextBridge.exposeInMainWorld('api', api);
