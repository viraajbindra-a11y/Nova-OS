/**
 * NOVA OS — Electron Preload Script
 * Exposes safe APIs to the renderer (NOVA OS web app).
 */

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('novaElectron', {
  toggleFullscreen: () => ipcRenderer.invoke('toggle-fullscreen'),
  isFullscreen: () => ipcRenderer.invoke('get-fullscreen'),
  platform: process.platform,
  isDesktopApp: true,

  // Real browser engine
  browser: {
    navigate: (url, bounds) => ipcRenderer.invoke('browser-navigate', { url, bounds }),
    back: () => ipcRenderer.invoke('browser-back'),
    forward: () => ipcRenderer.invoke('browser-forward'),
    reload: () => ipcRenderer.invoke('browser-reload'),
    close: () => ipcRenderer.invoke('browser-close'),
    resize: (bounds) => ipcRenderer.invoke('browser-resize', bounds),
    onTitle: (callback) => ipcRenderer.on('browser-title', (e, title) => callback(title)),
    onUrl: (callback) => ipcRenderer.on('browser-url', (e, url) => callback(url)),
  }
});
