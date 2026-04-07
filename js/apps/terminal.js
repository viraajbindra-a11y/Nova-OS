// Astrion OS — Terminal App
// Real bash shell via WebSocket connection to server.
// Falls back to simulated shell if WebSocket unavailable.

import { processManager } from '../kernel/process-manager.js';

export function registerTerminal() {
  processManager.register('terminal', {
    name: 'Terminal',
    icon: '>_',
    iconClass: 'dock-icon-terminal',
    singleInstance: false,
    width: 700,
    height: 460,
    launch: (contentEl, instanceId) => {
      initTerminal(contentEl, instanceId);
    }
  });
}

function initTerminal(container, instanceId) {
  container.innerHTML = `
    <div style="display:flex; flex-direction:column; height:100%; background:#0a0a14; font-family:'JetBrains Mono','Fira Code','SF Mono',Consolas,monospace;">
      <div style="padding:4px 12px; background:#14141e; border-bottom:1px solid #2a2a3a; display:flex; align-items:center; gap:8px;">
        <span style="font-size:11px; color:rgba(255,255,255,0.5);">astrion@astrion-os</span>
        <span id="term-status-${instanceId}" style="font-size:10px; color:#34c759;">● Connected</span>
      </div>
      <div id="term-output-${instanceId}" style="flex:1; overflow-y:auto; padding:8px 12px; font-size:13px; color:#c9d1d9; line-height:1.5; white-space:pre-wrap; word-break:break-word;"></div>
      <div style="display:flex; border-top:1px solid #1a1a2a;">
        <input type="text" id="term-input-${instanceId}" placeholder="" autocomplete="off" autocorrect="off" spellcheck="false"
          style="flex:1; padding:8px 12px; background:#0a0a14; border:none; color:#c9d1d9;
                 font-family:inherit; font-size:13px; outline:none;">
      </div>
    </div>
  `;

  const output = container.querySelector(`#term-output-${instanceId}`);
  const input = container.querySelector(`#term-input-${instanceId}`);
  const status = container.querySelector(`#term-status-${instanceId}`);
  let ws = null;
  let commandHistory = [];
  let historyIndex = -1;

  function appendOutput(text) {
    // Basic ANSI color support
    const html = text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/\x1b\[1;34m/g, '<span style="color:#58a6ff;font-weight:bold;">')
      .replace(/\x1b\[1;36m/g, '<span style="color:#56d4dd;font-weight:bold;">')
      .replace(/\x1b\[1;32m/g, '<span style="color:#34c759;font-weight:bold;">')
      .replace(/\x1b\[1;31m/g, '<span style="color:#ff6b6b;font-weight:bold;">')
      .replace(/\x1b\[1;33m/g, '<span style="color:#ffd60a;font-weight:bold;">')
      .replace(/\x1b\[0m/g, '</span>')
      .replace(/\x1b\[\d+m/g, '') // strip other codes
      .replace(/\r\n/g, '\n');

    output.innerHTML += html;
    output.scrollTop = output.scrollHeight;
  }

  function connectWebSocket() {
    try {
      const wsUrl = `ws://${window.location.hostname}:3001`;
      ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        status.textContent = '● Connected';
        status.style.color = '#34c759';
        input.focus();
      };

      ws.onmessage = (e) => {
        appendOutput(e.data);
      };

      ws.onclose = () => {
        status.textContent = '● Disconnected';
        status.style.color = '#ff6b6b';
        appendOutput('\n[Connection closed. Press Enter to reconnect]\n');
        ws = null;
      };

      ws.onerror = () => {
        status.textContent = '● Offline';
        status.style.color = '#ff9500';
        appendOutput('\nCould not connect to shell. Using offline mode.\n');
        appendOutput('To get a real shell, ensure the server is running.\n\n');
        ws = null;
        // Fall back to simulated mode
        input.placeholder = 'astrion@astrion-os:~$ ';
      };
    } catch (e) {
      appendOutput('WebSocket not available. Using offline mode.\n');
    }
  }

  // Handle input
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      const cmd = input.value;
      input.value = '';

      if (cmd.trim()) {
        commandHistory.push(cmd);
        historyIndex = commandHistory.length;
      }

      if (ws && ws.readyState === WebSocket.OPEN) {
        // Send to real shell
        ws.send(cmd + '\n');
      } else if (!ws) {
        // Try to reconnect
        if (cmd === '') {
          connectWebSocket();
          return;
        }
        // Offline mode — basic simulation
        appendOutput(`$ ${cmd}\n`);
        handleOfflineCommand(cmd);
      }
    }

    // History navigation
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (historyIndex > 0) {
        historyIndex--;
        input.value = commandHistory[historyIndex] || '';
      }
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyIndex < commandHistory.length - 1) {
        historyIndex++;
        input.value = commandHistory[historyIndex] || '';
      } else {
        historyIndex = commandHistory.length;
        input.value = '';
      }
    }

    // Ctrl+C
    if (e.ctrlKey && e.key === 'c') {
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send('\x03'); // Send interrupt
      }
      input.value = '';
    }

    // Ctrl+L — clear
    if (e.ctrlKey && e.key === 'l') {
      e.preventDefault();
      output.innerHTML = '';
    }
  });

  function handleOfflineCommand(cmd) {
    const parts = cmd.trim().split(/\s+/);
    const command = parts[0];

    switch (command) {
      case 'help':
        appendOutput('Available offline commands: help, echo, date, whoami, hostname, clear, uname\n');
        appendOutput('Connect to the server for a real bash shell.\n');
        break;
      case 'echo':
        appendOutput(parts.slice(1).join(' ') + '\n');
        break;
      case 'date':
        appendOutput(new Date().toString() + '\n');
        break;
      case 'whoami':
        appendOutput('astrion\n');
        break;
      case 'hostname':
        appendOutput('astrion-os\n');
        break;
      case 'uname':
        appendOutput('Astrion OS 1.0 x86_64\n');
        break;
      case 'clear':
        output.innerHTML = '';
        break;
      default:
        appendOutput(`bash: ${command}: command not found (offline mode)\n`);
        appendOutput('Type "help" for available offline commands.\n');
    }
  }

  // Connect on launch
  connectWebSocket();
  input.focus();
}
