// NOVA OS — Desktop (icons, wallpaper, right-click menu)

import { processManager } from '../kernel/process-manager.js';
import { fileSystem } from '../kernel/file-system.js';

export function initDesktop() {
  loadDesktopIcons();
  setupContextMenu();
}

async function loadDesktopIcons() {
  const container = document.getElementById('desktop-icons');
  const files = await fileSystem.readDir('/Desktop');

  container.innerHTML = '';

  files.forEach(file => {
    const name = fileSystem.getFileName(file.path);
    const icon = fileSystem.getFileIcon(file);

    const el = document.createElement('div');
    el.className = 'desktop-icon';
    el.innerHTML = `
      <div class="desktop-icon-img">${icon}</div>
      <div class="desktop-icon-label">${name}</div>
    `;

    el.addEventListener('click', (e) => {
      container.querySelectorAll('.desktop-icon').forEach(i => i.classList.remove('selected'));
      el.classList.add('selected');
    });

    el.addEventListener('dblclick', () => {
      if (file.type === 'folder') {
        processManager.launch('finder', { openPath: file.path });
      } else {
        processManager.launch('text-editor', { filePath: file.path, title: name });
      }
    });

    container.appendChild(el);
  });
}

function setupContextMenu() {
  const menu = document.getElementById('context-menu');
  const menuItems = document.getElementById('context-menu-items');

  document.getElementById('desktop').addEventListener('contextmenu', (e) => {
    if (e.target.closest('.window') || e.target.closest('#dock') || e.target.closest('#menubar')) return;
    e.preventDefault();

    menuItems.innerHTML = `
      <div class="context-menu-item" data-action="new-folder">New Folder</div>
      <div class="context-menu-item" data-action="new-file">New File</div>
      <div class="context-menu-separator"></div>
      <div class="context-menu-item" data-action="change-wallpaper">Change Wallpaper</div>
      <div class="context-menu-separator"></div>
      <div class="context-menu-item" data-action="refresh">Refresh Desktop</div>
    `;

    menu.classList.remove('hidden');
    menu.style.left = Math.min(e.clientX, window.innerWidth - 220) + 'px';
    menu.style.top = Math.min(e.clientY, window.innerHeight - 200) + 'px';
  });

  document.addEventListener('click', () => {
    menu.classList.add('hidden');
  });

  menuItems.addEventListener('click', async (e) => {
    const action = e.target.closest('.context-menu-item')?.dataset.action;
    if (!action) return;

    if (action === 'new-folder') {
      const name = prompt('Folder name:');
      if (name) {
        await fileSystem.createFolder(`/Desktop/${name}`);
        loadDesktopIcons();
      }
    } else if (action === 'new-file') {
      const name = prompt('File name:');
      if (name) {
        await fileSystem.writeFile(`/Desktop/${name}`, '');
        loadDesktopIcons();
      }
    } else if (action === 'change-wallpaper') {
      processManager.launch('settings');
    } else if (action === 'refresh') {
      loadDesktopIcons();
    }
  });
}

// Re-export for refreshing
export { loadDesktopIcons };
