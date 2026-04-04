// NOVA OS — Process Manager (app lifecycle)

import { windowManager } from './window-manager.js';
import { eventBus } from './event-bus.js';

class ProcessManager {
  constructor() {
    this.apps = new Map(); // appId → app definition
    this.running = new Map(); // instanceId → { appId, windowId }
  }

  register(appId, definition) {
    // definition: { name, icon, iconClass, launch(contentEl, instanceId), menus }
    this.apps.set(appId, definition);
  }

  launch(appId, options = {}) {
    const app = this.apps.get(appId);
    if (!app) {
      console.warn(`App not found: ${appId}`);
      return null;
    }

    // Check if already running and single-instance
    if (app.singleInstance) {
      const existing = [...this.running.entries()].find(([, v]) => v.appId === appId);
      if (existing) {
        const [instanceId, proc] = existing;
        const winState = windowManager.getState(proc.windowId);
        if (winState?.minimized) {
          windowManager.unminimize(proc.windowId);
        } else {
          windowManager.focus(proc.windowId);
        }
        return instanceId;
      }
    }

    const instanceId = `${appId}-${Date.now()}`;
    const windowId = instanceId;

    const contentEl = windowManager.create({
      id: windowId,
      title: options.title || app.name,
      app: appId,
      width: app.width || 700,
      height: app.height || 480,
      minWidth: app.minWidth,
      minHeight: app.minHeight,
      ...options,
    });

    this.running.set(instanceId, { appId, windowId });

    // Launch the app into its window content area
    if (app.launch) {
      app.launch(contentEl, instanceId, options);
    }

    eventBus.emit('app:launched', { appId, instanceId });
    return instanceId;
  }

  terminate(instanceId) {
    const proc = this.running.get(instanceId);
    if (!proc) return;

    const app = this.apps.get(proc.appId);
    if (app?.cleanup) {
      app.cleanup(instanceId);
    }

    this.running.delete(instanceId);
    eventBus.emit('app:terminated', { appId: proc.appId, instanceId });
  }

  isRunning(appId) {
    return [...this.running.values()].some(p => p.appId === appId);
  }

  getRunningApps() {
    const result = [];
    for (const [instanceId, proc] of this.running) {
      result.push({ instanceId, ...proc, app: this.apps.get(proc.appId) });
    }
    return result;
  }

  getAppDefinition(appId) {
    return this.apps.get(appId);
  }

  getAllApps() {
    return [...this.apps.entries()].map(([id, def]) => ({ id, ...def }));
  }
}

export const processManager = new ProcessManager();

// Listen for window close events and terminate associated processes
eventBus.on('window:closed', ({ id }) => {
  for (const [instanceId, proc] of processManager.running) {
    if (proc.windowId === id) {
      processManager.terminate(instanceId);
      break;
    }
  }
});
