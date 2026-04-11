/**
 * Astrion OS — Electron Preload Script
 * Exposes safe APIs to the renderer (Astrion OS web app).
 */

const { contextBridge, ipcRenderer } = require('electron');

const astrionElectron = {
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
  },

  // Auto-updater (Polish Sprint Day 6-7)
  // Returns { ok, state: { available, downloaded, version, error } }
  updater: {
    check: () => ipcRenderer.invoke('updater:check'),
    install: () => ipcRenderer.invoke('updater:install'),
    state: () => ipcRenderer.invoke('updater:state'),
    openReleases: () => ipcRenderer.invoke('updater:open-releases'),
    onChecking: (cb) => ipcRenderer.on('updater:checking', () => cb()),
    onAvailable: (cb) => ipcRenderer.on('updater:available', (e, info) => cb(info)),
    onNone: (cb) => ipcRenderer.on('updater:none', () => cb()),
    onDownloaded: (cb) => ipcRenderer.on('updater:downloaded', (e, info) => cb(info)),
    onError: (cb) => ipcRenderer.on('updater:error', (e, info) => cb(info)),
  },
};

// Expose under the new name AND the legacy name so existing renderer code
// that references `window.novaElectron` keeps working during the rename.
contextBridge.exposeInMainWorld('astrionElectron', astrionElectron);
contextBridge.exposeInMainWorld('novaElectron', astrionElectron);
