// NOVA OS — App Switcher (Cmd+Tab)
// Hold Cmd and press Tab to cycle through open apps in a visual overlay.
// Release Cmd to switch to the highlighted app.

import { windowManager } from '../kernel/window-manager.js';
import { processManager } from '../kernel/process-manager.js';

let isActive = false;
let overlay = null;
let selectedIdx = 0;
let appList = [];

export function initAppSwitcher() {
  document.addEventListener('keydown', (e) => {
    // Cmd+Tab (Mac) / Alt+Tab (PC)
    if ((e.metaKey || e.altKey) && e.key === 'Tab') {
      e.preventDefault();
      if (!isActive) {
        openSwitcher();
      } else {
        // Cycle — Shift+Tab goes backwards
        if (e.shiftKey) cycleBackward();
        else cycleForward();
      }
    }
  });

  document.addEventListener('keyup', (e) => {
    if (isActive && (e.key === 'Meta' || e.key === 'Alt')) {
      commitSelection();
    }
  });
}

function openSwitcher() {
  // Group windows by app, keep only one representative per app
  const seen = new Map();
  for (const [id, state] of windowManager.windows) {
    if (!seen.has(state.app)) {
      const appDef = processManager.getAppDefinition(state.app);
      seen.set(state.app, {
        appId: state.app,
        windowId: id,
        title: appDef?.name || state.title,
        icon: appDef?.icon || '',
        iconPath: `/assets/icons/${state.app}.svg`,
      });
    }
  }
  appList = [...seen.values()];

  if (appList.length < 2) return; // No point if only one app

  // Start at the second app (like macOS — next one after current)
  const currentApp = windowManager.windows.get(windowManager.activeWindowId)?.app;
  const currentIdx = appList.findIndex(a => a.appId === currentApp);
  selectedIdx = (currentIdx + 1) % appList.length;

  isActive = true;
  render();
}

function render() {
  if (overlay) overlay.remove();

  overlay = document.createElement('div');
  overlay.id = 'app-switcher-overlay';
  overlay.style.cssText = `
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background: rgba(30, 30, 36, 0.85);
    backdrop-filter: blur(40px);
    -webkit-backdrop-filter: blur(40px);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 20px;
    padding: 24px;
    z-index: 99999;
    font-family: var(--font);
    box-shadow: 0 30px 90px rgba(0, 0, 0, 0.6);
    animation: switcherScale 0.15s cubic-bezier(0.16, 1, 0.3, 1);
  `;

  const grid = document.createElement('div');
  grid.style.cssText = `
    display: flex;
    gap: 16px;
    align-items: center;
    justify-content: center;
  `;

  appList.forEach((app, i) => {
    const item = document.createElement('div');
    item.style.cssText = `
      width: 88px;
      height: 88px;
      border-radius: 16px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: ${i === selectedIdx ? 'rgba(255,255,255,0.15)' : 'transparent'};
      border: 2px solid ${i === selectedIdx ? 'var(--accent)' : 'transparent'};
      transition: all 0.15s ease;
      cursor: pointer;
      position: relative;
    `;

    // App icon — try SVG first, fallback to emoji
    const img = document.createElement('img');
    img.src = app.iconPath;
    img.style.cssText = 'width: 64px; height: 64px; border-radius: 12px;';
    img.onerror = () => {
      img.remove();
      const fallback = document.createElement('div');
      fallback.style.cssText = 'font-size:48px;';
      fallback.textContent = app.icon || '\uD83D\uDCC4';
      item.appendChild(fallback);
    };
    item.appendChild(img);

    // Click to commit
    item.addEventListener('click', () => {
      selectedIdx = i;
      commitSelection();
    });

    grid.appendChild(item);
  });

  // App name label
  const label = document.createElement('div');
  label.id = 'app-switcher-label';
  label.style.cssText = `
    text-align: center;
    color: white;
    font-size: 14px;
    font-weight: 500;
    margin-top: 14px;
    min-height: 18px;
  `;
  label.textContent = appList[selectedIdx]?.title || '';

  overlay.appendChild(grid);
  overlay.appendChild(label);
  document.body.appendChild(overlay);

  // Inject animation style once
  if (!document.getElementById('switcher-styles')) {
    const style = document.createElement('style');
    style.id = 'switcher-styles';
    style.textContent = `
      @keyframes switcherScale {
        from { opacity: 0; transform: translate(-50%, -50%) scale(0.94); }
        to { opacity: 1; transform: translate(-50%, -50%) scale(1); }
      }
    `;
    document.head.appendChild(style);
  }
}

function cycleForward() {
  selectedIdx = (selectedIdx + 1) % appList.length;
  render();
}

function cycleBackward() {
  selectedIdx = (selectedIdx - 1 + appList.length) % appList.length;
  render();
}

function commitSelection() {
  if (!isActive) return;
  const app = appList[selectedIdx];
  if (app) {
    const state = windowManager.windows.get(app.windowId);
    if (state?.minimized) windowManager.unminimize(app.windowId);
    else windowManager.focus(app.windowId);
  }

  if (overlay) overlay.remove();
  overlay = null;
  isActive = false;
}
