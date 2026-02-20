import { contextBridge, ipcRenderer } from 'electron';

const api = {
  bootstrap: () => ipcRenderer.invoke('sidecar:bootstrap'),
  apply: (filePath: string) => ipcRenderer.invoke('sidecar:apply', filePath),
  generateGoals: (json: string) => ipcRenderer.invoke('sidecar:generate-goals', json),
  saveDraft: (json: string) => ipcRenderer.invoke('sidecar:save-draft', json),
  deleteHistory: (id: string) => ipcRenderer.invoke('sidecar:delete-history', id),
  clearHistory: () => ipcRenderer.invoke('sidecar:clear-history'),
  screenInfo: () => ipcRenderer.invoke('sidecar:screen-info'),
  openFile: () => ipcRenderer.invoke('dialog:open-file'),
  showInFinder: (filePath: string) => ipcRenderer.invoke('shell:show-in-finder', filePath),
};

contextBridge.exposeInMainWorld('api', api);
