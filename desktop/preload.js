const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('COSMOS_DESKTOP', {
  status: () => ipcRenderer.invoke('ollama:status'),
  listModels: () => ipcRenderer.invoke('ollama:models'),
  chat: payload => ipcRenderer.invoke('ollama:chat', payload),
  platform: process.platform
});
