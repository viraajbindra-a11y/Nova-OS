// NOVA OS — Activity Monitor App

import { processManager } from '../kernel/process-manager.js';
import { windowManager } from '../kernel/window-manager.js';

export function registerActivityMonitor() {
  processManager.register('activity-monitor', {
    name: 'Activity Monitor',
    icon: '\uD83D\uDCCA',
    iconClass: 'dock-icon-activity',
    singleInstance: true,
    width: 620,
    height: 440,
    launch: (contentEl, instanceId) => {
      initActivityMonitor(contentEl, instanceId);
    }
  });
}

function initActivityMonitor(container, instanceId) {
  // Simulated system metrics
  let cpuHistory = Array(60).fill(0);
  let memHistory = Array(60).fill(0);
  let netHistory = Array(60).fill(0);

  container.innerHTML = `
    <div class="activity-monitor">
      <div class="am-tabs">
        <div class="am-tab active" data-tab="cpu">CPU</div>
        <div class="am-tab" data-tab="memory">Memory</div>
        <div class="am-tab" data-tab="network">Network</div>
        <div class="am-tab" data-tab="processes">Processes</div>
      </div>
      <div class="am-content" id="am-content-${instanceId}"></div>
    </div>
  `;

  let activeTab = 'cpu';
  let updateInterval;

  // Tab switching
  container.querySelectorAll('.am-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      container.querySelectorAll('.am-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      activeTab = tab.dataset.tab;
      render();
    });
  });

  function render() {
    const content = container.querySelector(`#am-content-${instanceId}`);
    if (!content) return;

    switch (activeTab) {
      case 'cpu': renderCPU(content); break;
      case 'memory': renderMemory(content); break;
      case 'network': renderNetwork(content); break;
      case 'processes': renderProcesses(content); break;
    }
  }

  function renderCPU(content) {
    const cpuUsage = getSimulatedCPU();
    cpuHistory.push(cpuUsage);
    cpuHistory.shift();

    const runningApps = processManager.getRunningApps().length;
    const threads = 4 + runningApps * 2;

    content.innerHTML = `
      <div class="am-chart-section">
        <div class="am-chart-header">
          <span class="am-chart-title">CPU Usage</span>
          <span class="am-chart-value" style="color:#28c840;">${cpuUsage.toFixed(1)}%</span>
        </div>
        <canvas id="am-cpu-canvas-${instanceId}" class="am-chart-canvas" width="560" height="140"></canvas>
        <div class="am-stats-row">
          <div class="am-stat">
            <div class="am-stat-label">System</div>
            <div class="am-stat-value">${(cpuUsage * 0.3).toFixed(1)}%</div>
          </div>
          <div class="am-stat">
            <div class="am-stat-label">User</div>
            <div class="am-stat-value">${(cpuUsage * 0.7).toFixed(1)}%</div>
          </div>
          <div class="am-stat">
            <div class="am-stat-label">Idle</div>
            <div class="am-stat-value">${(100 - cpuUsage).toFixed(1)}%</div>
          </div>
          <div class="am-stat">
            <div class="am-stat-label">Threads</div>
            <div class="am-stat-value">${threads}</div>
          </div>
          <div class="am-stat">
            <div class="am-stat-label">Processes</div>
            <div class="am-stat-value">${runningApps + 8}</div>
          </div>
        </div>
      </div>
    `;

    drawChart(content.querySelector(`#am-cpu-canvas-${instanceId}`), cpuHistory, '#28c840', '#1a5c28');
  }

  function renderMemory(content) {
    const runningApps = processManager.getRunningApps().length;
    const usedGB = 2.4 + runningApps * 0.3;
    const totalGB = 8;
    const usedPct = (usedGB / totalGB) * 100;
    memHistory.push(usedPct);
    memHistory.shift();

    const appMemory = runningApps * 0.3;
    const wiredMemory = 1.2;
    const cached = usedGB - appMemory - wiredMemory;

    content.innerHTML = `
      <div class="am-chart-section">
        <div class="am-chart-header">
          <span class="am-chart-title">Memory Pressure</span>
          <span class="am-chart-value" style="color:#ffd60a;">${usedGB.toFixed(1)} GB / ${totalGB} GB</span>
        </div>
        <canvas id="am-mem-canvas-${instanceId}" class="am-chart-canvas" width="560" height="140"></canvas>
        <div class="am-memory-bar">
          <div class="am-memory-segment" style="width:${(wiredMemory/totalGB*100)}%;background:#ff5f57;" title="Wired: ${wiredMemory.toFixed(1)} GB"></div>
          <div class="am-memory-segment" style="width:${(appMemory/totalGB*100)}%;background:#ffd60a;" title="App: ${appMemory.toFixed(1)} GB"></div>
          <div class="am-memory-segment" style="width:${(cached/totalGB*100)}%;background:#28c840;" title="Cached: ${Math.max(0,cached).toFixed(1)} GB"></div>
        </div>
        <div class="am-stats-row">
          <div class="am-stat">
            <div class="am-stat-label">Physical Memory</div>
            <div class="am-stat-value">${totalGB} GB</div>
          </div>
          <div class="am-stat">
            <div class="am-stat-label">Memory Used</div>
            <div class="am-stat-value">${usedGB.toFixed(1)} GB</div>
          </div>
          <div class="am-stat">
            <div class="am-stat-label">App Memory</div>
            <div class="am-stat-value">${appMemory.toFixed(1)} GB</div>
          </div>
          <div class="am-stat">
            <div class="am-stat-label">Wired</div>
            <div class="am-stat-value">${wiredMemory.toFixed(1)} GB</div>
          </div>
          <div class="am-stat">
            <div class="am-stat-label">Cached</div>
            <div class="am-stat-value">${Math.max(0,cached).toFixed(1)} GB</div>
          </div>
        </div>
      </div>
    `;

    drawChart(content.querySelector(`#am-mem-canvas-${instanceId}`), memHistory, '#ffd60a', '#665400');
  }

  function renderNetwork(content) {
    const netUsage = Math.random() * 30 + 5;
    netHistory.push(netUsage);
    netHistory.shift();

    const downloadSpeed = (netUsage * 0.7).toFixed(1);
    const uploadSpeed = (netUsage * 0.3).toFixed(1);

    content.innerHTML = `
      <div class="am-chart-section">
        <div class="am-chart-header">
          <span class="am-chart-title">Network Activity</span>
          <span class="am-chart-value" style="color:#007aff;">${netUsage.toFixed(1)} Mbps</span>
        </div>
        <canvas id="am-net-canvas-${instanceId}" class="am-chart-canvas" width="560" height="140"></canvas>
        <div class="am-stats-row">
          <div class="am-stat">
            <div class="am-stat-label">Download</div>
            <div class="am-stat-value" style="color:#28c840;">\u2193 ${downloadSpeed} Mbps</div>
          </div>
          <div class="am-stat">
            <div class="am-stat-label">Upload</div>
            <div class="am-stat-value" style="color:#ff5f57;">\u2191 ${uploadSpeed} Mbps</div>
          </div>
          <div class="am-stat">
            <div class="am-stat-label">Data Received</div>
            <div class="am-stat-value">${(Math.random() * 500 + 100).toFixed(0)} MB</div>
          </div>
          <div class="am-stat">
            <div class="am-stat-label">Data Sent</div>
            <div class="am-stat-value">${(Math.random() * 100 + 20).toFixed(0)} MB</div>
          </div>
          <div class="am-stat">
            <div class="am-stat-label">Interface</div>
            <div class="am-stat-value">Wi-Fi</div>
          </div>
        </div>
      </div>
    `;

    drawChart(content.querySelector(`#am-net-canvas-${instanceId}`), netHistory, '#007aff', '#003366');
  }

  function renderProcesses(content) {
    const running = processManager.getRunningApps();
    const systemProcesses = [
      { name: 'nova-kernel', cpu: '0.8', mem: '120 MB', pid: 1 },
      { name: 'window-manager', cpu: '1.2', mem: '85 MB', pid: 2 },
      { name: 'file-system', cpu: '0.3', mem: '64 MB', pid: 3 },
      { name: 'notification-daemon', cpu: '0.1', mem: '24 MB', pid: 4 },
      { name: 'menubar', cpu: '0.2', mem: '32 MB', pid: 5 },
      { name: 'dock', cpu: '0.4', mem: '28 MB', pid: 6 },
      { name: 'spotlight-indexer', cpu: '0.5', mem: '56 MB', pid: 7 },
      { name: 'event-bus', cpu: '0.1', mem: '16 MB', pid: 8 },
    ];

    let rows = '';

    // App processes
    running.forEach((proc, i) => {
      const app = proc.app;
      const cpu = (Math.random() * 5 + 0.5).toFixed(1);
      const mem = Math.floor(Math.random() * 150 + 40);
      rows += `
        <div class="am-process-row">
          <span class="am-process-icon">${app?.icon || '\uD83D\uDCC4'}</span>
          <span class="am-process-name">${app?.name || proc.appId}</span>
          <span class="am-process-pid">${1000 + i}</span>
          <span class="am-process-cpu">${cpu}%</span>
          <span class="am-process-mem">${mem} MB</span>
          <button class="am-process-kill" data-instance="${proc.instanceId}" title="Force Quit">\u2715</button>
        </div>
      `;
    });

    // System processes
    systemProcesses.forEach(p => {
      rows += `
        <div class="am-process-row am-system-process">
          <span class="am-process-icon">\u2699\uFE0F</span>
          <span class="am-process-name">${p.name}</span>
          <span class="am-process-pid">${p.pid}</span>
          <span class="am-process-cpu">${p.cpu}%</span>
          <span class="am-process-mem">${p.mem}</span>
          <button class="am-process-kill" style="visibility:hidden">\u2715</button>
        </div>
      `;
    });

    content.innerHTML = `
      <div class="am-process-list">
        <div class="am-process-header">
          <span class="am-process-icon"></span>
          <span class="am-process-name">Process Name</span>
          <span class="am-process-pid">PID</span>
          <span class="am-process-cpu">CPU</span>
          <span class="am-process-mem">Memory</span>
          <span style="width:24px"></span>
        </div>
        ${rows}
      </div>
      <div class="am-process-summary">
        <span>Total Processes: ${running.length + systemProcesses.length}</span>
        <span>App Processes: ${running.length}</span>
        <span>System: ${systemProcesses.length}</span>
      </div>
    `;

    // Kill button handlers
    content.querySelectorAll('.am-process-kill[data-instance]').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.instance;
        const proc = processManager.running.get(id);
        if (proc) {
          windowManager.close(proc.windowId);
        }
        setTimeout(render, 200);
      });
    });
  }

  function drawChart(canvas, data, lineColor, fillColor) {
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const w = canvas.width;
    const h = canvas.height;
    const max = 100;

    ctx.clearRect(0, 0, w, h);

    // Grid lines
    ctx.strokeStyle = 'rgba(255,255,255,0.05)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
      const y = (h / 4) * i;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }

    // Draw filled area
    ctx.beginPath();
    ctx.moveTo(0, h);
    data.forEach((val, i) => {
      const x = (i / (data.length - 1)) * w;
      const y = h - (val / max) * h;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.lineTo(w, h);
    ctx.closePath();

    const gradient = ctx.createLinearGradient(0, 0, 0, h);
    gradient.addColorStop(0, fillColor + 'aa');
    gradient.addColorStop(1, fillColor + '11');
    ctx.fillStyle = gradient;
    ctx.fill();

    // Draw line
    ctx.beginPath();
    data.forEach((val, i) => {
      const x = (i / (data.length - 1)) * w;
      const y = h - (val / max) * h;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.strokeStyle = lineColor;
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  function getSimulatedCPU() {
    const runningApps = processManager.getRunningApps().length;
    const base = 5 + runningApps * 4;
    return Math.min(95, base + Math.random() * 15 - 7);
  }

  // Initial render
  render();

  // Update every 2 seconds
  updateInterval = setInterval(render, 2000);

  // Cleanup on window close — use MutationObserver to detect removal
  const observer = new MutationObserver(() => {
    if (!document.contains(container)) {
      clearInterval(updateInterval);
      observer.disconnect();
    }
  });
  observer.observe(container.parentElement || document.body, { childList: true, subtree: true });
}
