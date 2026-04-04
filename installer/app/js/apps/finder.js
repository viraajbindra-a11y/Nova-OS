// NOVA OS — Finder App

import { fileSystem } from '../kernel/file-system.js';
import { processManager } from '../kernel/process-manager.js';
import { windowManager } from '../kernel/window-manager.js';

export function registerFinder() {
  processManager.register('finder', {
    name: 'Finder',
    icon: '\uD83D\uDCC2',
    iconClass: 'dock-icon-finder',
    singleInstance: false,
    width: 750,
    height: 480,
    launch: (contentEl, instanceId, options) => {
      initFinder(contentEl, instanceId, options.openPath || '/');
    }
  });
}

async function initFinder(container, instanceId, startPath) {
  let currentPath = startPath;
  let history = [startPath];
  let historyIndex = 0;
  let viewMode = 'grid'; // 'grid' or 'list'

  container.innerHTML = `
    <div class="finder">
      <div class="finder-sidebar">
        <div class="finder-sidebar-section">Favorites</div>
        <div class="finder-sidebar-item active" data-path="/Desktop">
          <span class="finder-sidebar-icon">\uD83D\uDDA5\uFE0F</span> Desktop
        </div>
        <div class="finder-sidebar-item" data-path="/Documents">
          <span class="finder-sidebar-icon">\uD83D\uDCC4</span> Documents
        </div>
        <div class="finder-sidebar-item" data-path="/Downloads">
          <span class="finder-sidebar-icon">\u2B07\uFE0F</span> Downloads
        </div>
        <div class="finder-sidebar-item" data-path="/Pictures">
          <span class="finder-sidebar-icon">\uD83D\uDDBC\uFE0F</span> Pictures
        </div>
        <div class="finder-sidebar-item" data-path="/Music">
          <span class="finder-sidebar-icon">\uD83C\uDFB5</span> Music
        </div>
        <div class="finder-sidebar-section">Locations</div>
        <div class="finder-sidebar-item" data-path="/">
          <span class="finder-sidebar-icon">\uD83D\uDCBB</span> NOVA HD
        </div>
      </div>
      <div class="finder-main">
        <div class="finder-toolbar">
          <button class="finder-nav-btn" id="finder-back-${instanceId}" disabled>\u25C0</button>
          <button class="finder-nav-btn" id="finder-forward-${instanceId}" disabled>\u25B6</button>
          <span class="finder-path" id="finder-path-${instanceId}">${currentPath}</span>
          <input type="text" class="finder-search" id="finder-search-${instanceId}" placeholder="Search...">
        </div>
        <div class="finder-files ${viewMode === 'list' ? 'list-view' : ''}" id="finder-files-${instanceId}"></div>
        <div class="finder-statusbar" id="finder-status-${instanceId}">0 items</div>
      </div>
    </div>
  `;

  const filesContainer = container.querySelector(`#finder-files-${instanceId}`);
  const pathEl = container.querySelector(`#finder-path-${instanceId}`);
  const statusEl = container.querySelector(`#finder-status-${instanceId}`);
  const backBtn = container.querySelector(`#finder-back-${instanceId}`);
  const forwardBtn = container.querySelector(`#finder-forward-${instanceId}`);
  const searchInput = container.querySelector(`#finder-search-${instanceId}`);

  // Sidebar navigation
  container.querySelectorAll('.finder-sidebar-item').forEach(item => {
    item.addEventListener('click', () => {
      container.querySelectorAll('.finder-sidebar-item').forEach(i => i.classList.remove('active'));
      item.classList.add('active');
      navigateTo(item.dataset.path);
    });
  });

  // Navigation
  backBtn.addEventListener('click', () => {
    if (historyIndex > 0) {
      historyIndex--;
      currentPath = history[historyIndex];
      loadFiles();
    }
  });

  forwardBtn.addEventListener('click', () => {
    if (historyIndex < history.length - 1) {
      historyIndex++;
      currentPath = history[historyIndex];
      loadFiles();
    }
  });

  // Search
  let searchTimer;
  searchInput.addEventListener('input', () => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(async () => {
      const query = searchInput.value.trim();
      if (!query) {
        loadFiles();
        return;
      }
      const results = await fileSystem.search(query);
      renderFiles(results);
      statusEl.textContent = `${results.length} results for "${query}"`;
    }, 300);
  });

  function navigateTo(path) {
    currentPath = path;
    history = history.slice(0, historyIndex + 1);
    history.push(path);
    historyIndex = history.length - 1;
    loadFiles();
  }

  async function loadFiles() {
    const files = await fileSystem.readDir(currentPath);
    renderFiles(files);
    pathEl.textContent = currentPath;
    statusEl.textContent = `${files.length} item${files.length !== 1 ? 's' : ''}`;
    backBtn.disabled = historyIndex <= 0;
    forwardBtn.disabled = historyIndex >= history.length - 1;

    // Update sidebar active state
    container.querySelectorAll('.finder-sidebar-item').forEach(item => {
      item.classList.toggle('active', item.dataset.path === currentPath);
    });

    // Update window title
    const windowId = instanceId;
    const folderName = currentPath === '/' ? 'NOVA HD' : fileSystem.getFileName(currentPath);
    windowManager.setTitle(windowId, folderName);
  }

  function renderFiles(files) {
    if (files.length === 0) {
      filesContainer.innerHTML = '<div class="finder-empty">This folder is empty</div>';
      return;
    }

    filesContainer.innerHTML = '';
    files.forEach(file => {
      const name = fileSystem.getFileName(file.path);
      const icon = fileSystem.getFileIcon(file);

      const el = document.createElement('div');
      el.className = 'finder-file';
      el.innerHTML = `
        <div class="finder-file-icon">${icon}</div>
        <div class="finder-file-name">${name}</div>
      `;

      el.addEventListener('click', (e) => {
        if (!e.metaKey && !e.ctrlKey) {
          filesContainer.querySelectorAll('.finder-file').forEach(f => f.classList.remove('selected'));
        }
        el.classList.toggle('selected');
      });

      el.addEventListener('dblclick', () => {
        if (file.type === 'folder') {
          navigateTo(file.path);
        } else {
          processManager.launch('text-editor', { filePath: file.path, title: name });
        }
      });

      filesContainer.appendChild(el);
    });
  }

  // Initial load
  loadFiles();
}
