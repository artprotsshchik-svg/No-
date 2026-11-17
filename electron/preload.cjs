const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('desktopAPI', {
  isDesktop: true,
  getAppMeta: () => ipcRenderer.invoke('get-app-meta'),
  checkHotDbUpdate: () => ipcRenderer.invoke('check-hot-db-update'),
  checkAppUpdate: () => ipcRenderer.invoke('check-app-update'),
  installAppUpdate: () => ipcRenderer.invoke('install-app-update'),
  scanModsFolder: () => ipcRenderer.invoke('scan-mods-folder'),
  onAppUpdateStatus: (callback) => {
    const handler = (_event, payload) => callback(payload);
    ipcRenderer.on('app-update-status', handler);
    return () => ipcRenderer.removeListener('app-update-status', handler);
  },
});
