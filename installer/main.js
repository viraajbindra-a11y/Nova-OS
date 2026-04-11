/**
 * Astrion OS — Electron Desktop App
 *
 * This wraps Astrion OS into a downloadable desktop application.
 * Users download the .dmg (Mac), .exe (Windows), or .AppImage (Linux),
 * double-click, and they're running Astrion OS as a native app.
 *
 * The app runs a local Express server and opens Astrion OS in a
 * frameless window that looks like a real operating system.
 */

const { app, BrowserWindow, screen, globalShortcut, Menu, ipcMain, autoUpdater, dialog, shell } = require('electron');
const path = require('path');
const express = require('express');

// --- Auto-Updater ---
// Polish Sprint Day 6-7: uses update-electron-app (a thin wrapper around
// Electron's built-in Squirrel autoUpdater). It checks GitHub releases
// every hour and notifies the user via an OS-native dialog. On macOS
// this requires a signed build (we're unsigned for v0.2 — Gatekeeper
// will show a warning). On Linux/Windows it works out of the box.
//
// We also forward update events into the Astrion notification center
// inside the renderer so users see a native-feel toast, and we expose
// a manual "Check for updates" IPC handler that the Astrion menubar
// can call from the Apple menu.
let updaterState = { available: false, downloaded: false, version: null, error: null };

function setupAutoUpdater() {
  try {
    const { updateElectronApp } = require('update-electron-app');
    updateElectronApp({
      repo: 'viraajbindra-a11y/Astrion-OS',
      updateInterval: '1 hour',
      notifyUser: true,
      logger: {
        log: (msg) => console.log('[auto-updater]', msg),
        info: (msg) => console.log('[auto-updater]', msg),
        warn: (msg) => console.warn('[auto-updater]', msg),
        error: (msg) => { console.error('[auto-updater]', msg); updaterState.error = String(msg); },
      },
    });
  } catch (e) {
    // update-electron-app not installed or not in production, skip
    console.log('[auto-updater] not available:', e.message);
    updaterState.error = e.message;
  }

  // Forward Squirrel events into Astrion notifications via IPC
  // (update-electron-app configures the underlying autoUpdater for us)
  try {
    autoUpdater.on('checking-for-update', () => {
      mainWindow?.webContents.send('updater:checking');
    });
    autoUpdater.on('update-available', (info) => {
      updaterState.available = true;
      updaterState.version = info?.version || null;
      mainWindow?.webContents.send('updater:available', info || {});
    });
    autoUpdater.on('update-not-available', () => {
      mainWindow?.webContents.send('updater:none');
    });
    autoUpdater.on('update-downloaded', (info) => {
      updaterState.downloaded = true;
      updaterState.version = info?.version || updaterState.version;
      mainWindow?.webContents.send('updater:downloaded', info || {});
    });
    autoUpdater.on('error', (err) => {
      updaterState.error = String(err?.message || err);
      mainWindow?.webContents.send('updater:error', { message: updaterState.error });
    });
  } catch (err) {
    console.log('[auto-updater] event wiring skipped:', err.message);
  }
}

// IPC: manual check-for-updates trigger (called from the Astrion menubar)
ipcMain.handle('updater:check', async () => {
  try {
    autoUpdater.checkForUpdates?.();
    return { ok: true, state: updaterState };
  } catch (err) {
    return { ok: false, error: err.message, state: updaterState };
  }
});

// IPC: install the pending update immediately (called after user approves)
ipcMain.handle('updater:install', async () => {
  if (!updaterState.downloaded) return { ok: false, error: 'no update downloaded' };
  try {
    autoUpdater.quitAndInstall?.();
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err.message };
  }
});

// IPC: get current updater state (for settings / about dialogs)
ipcMain.handle('updater:state', () => updaterState);

// IPC: open the GitHub releases page as a manual fallback
ipcMain.handle('updater:open-releases', () => {
  shell.openExternal('https://github.com/viraajbindra-a11y/Astrion-OS/releases/latest');
  return { ok: true };
});

let mainWindow;
let server;
const PORT = 19840; // Random high port to avoid conflicts

// Start the local web server
function startServer() {
  return new Promise((resolve) => {
    const expressApp = express();

    // Serve Astrion OS files
    expressApp.use(express.static(path.join(__dirname, 'app')));
    expressApp.use(express.json());

    // AI proxy endpoint (forwards to Anthropic if key is set)
    expressApp.post('/api/ai', async (req, res) => {
      const apiKey = process.env.ANTHROPIC_API_KEY || '';
      if (!apiKey) {
        return res.status(200).json({
          content: [{ text: '' }]
        });
      }

      try {
        const response = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'x-api-key': apiKey,
            'content-type': 'application/json',
            'anthropic-version': '2023-06-01',
          },
          body: JSON.stringify(req.body),
        });
        const data = await response.json();
        res.json(data);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    server = expressApp.listen(PORT, () => {
      console.log(`Astrion OS server running on port ${PORT}`);
      resolve();
    });
  });
}

function createWindow() {
  const { width, height } = screen.getPrimaryDisplay().workAreaSize;

  mainWindow = new BrowserWindow({
    width: Math.min(1440, width),
    height: Math.min(900, height),
    minWidth: 800,
    minHeight: 600,
    frame: false,           // No native title bar — Astrion OS has its own
    titleBarStyle: 'hidden',
    trafficLightPosition: { x: -100, y: -100 }, // Hide native traffic lights
    backgroundColor: '#000000',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      webviewTag: true,
    },
    icon: path.join(__dirname, 'icons', 'icon.png'),
    show: false, // Show after loading
  });

  // Load Astrion OS from local server
  mainWindow.loadURL(`http://localhost:${PORT}`);

  // Show window when ready
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  // Hide menu bar
  Menu.setApplicationMenu(null);

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// Handle full-screen toggle from renderer
ipcMain.handle('toggle-fullscreen', () => {
  if (mainWindow) {
    mainWindow.setFullScreen(!mainWindow.isFullScreen());
  }
});

ipcMain.handle('get-fullscreen', () => {
  return mainWindow ? mainWindow.isFullScreen() : false;
});

// Handle browser navigation from renderer — opens URL in a BrowserView
// This gives the NOVA browser app a REAL Chromium browser engine
const { BrowserView } = require('electron');
let browserView = null;

ipcMain.handle('browser-navigate', (event, { url, bounds }) => {
  if (!mainWindow) return;

  if (!browserView) {
    browserView = new BrowserView({
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
      }
    });
    mainWindow.addBrowserView(browserView);
  }

  browserView.setBounds({
    x: Math.round(bounds.x),
    y: Math.round(bounds.y),
    width: Math.round(bounds.width),
    height: Math.round(bounds.height),
  });

  browserView.webContents.loadURL(url);

  // Send title updates back to renderer
  browserView.webContents.on('page-title-updated', (e, title) => {
    if (mainWindow) mainWindow.webContents.send('browser-title', title);
  });

  browserView.webContents.on('did-navigate', (e, url) => {
    if (mainWindow) mainWindow.webContents.send('browser-url', url);
  });

  browserView.webContents.on('did-navigate-in-page', (e, url) => {
    if (mainWindow) mainWindow.webContents.send('browser-url', url);
  });

  return { success: true };
});

ipcMain.handle('browser-back', () => {
  if (browserView?.webContents.canGoBack()) browserView.webContents.goBack();
});

ipcMain.handle('browser-forward', () => {
  if (browserView?.webContents.canGoForward()) browserView.webContents.goForward();
});

ipcMain.handle('browser-reload', () => {
  if (browserView) browserView.webContents.reload();
});

ipcMain.handle('browser-close', () => {
  if (browserView && mainWindow) {
    mainWindow.removeBrowserView(browserView);
    browserView.webContents.destroy();
    browserView = null;
  }
});

ipcMain.handle('browser-resize', (event, bounds) => {
  if (browserView) {
    browserView.setBounds({
      x: Math.round(bounds.x),
      y: Math.round(bounds.y),
      width: Math.round(bounds.width),
      height: Math.round(bounds.height),
    });
  }
});

app.whenReady().then(async () => {
  await startServer();
  createWindow();
  setupAutoUpdater();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (server) server.close();
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Clean up server on quit
app.on('before-quit', () => {
  if (server) server.close();
});
