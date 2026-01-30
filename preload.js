const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
    checkSteamTools: () => ipcRenderer.send('check-steamtools'),
    onSteamToolsCheck: (callback) => ipcRenderer.on('check-steamtools-reply', (_, exists) => callback(exists)),

    startDownload: (query) => ipcRenderer.send('start-download', query),
    confirmSelection: (appid) => ipcRenderer.send('confirm-selection', appid),

    onLog: (callback) => ipcRenderer.on('log-message', (_, msg) => callback(msg)),
    onStatus: (callback) => ipcRenderer.on('status-update', (_, msg) => callback(msg)),
    onSearchError: (callback) => ipcRenderer.on('search-error', (_, msg) => callback(msg)),
    onShowSelection: (callback) => ipcRenderer.on('show-selection', (_, matches) => callback(matches)),
    onProcessComplete: (callback) => ipcRenderer.on('process-complete', (_, result) => callback(result)),
});
