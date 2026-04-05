// NOVA OS — Trash
// Stores deleted files in /.Trash and lets users restore or empty them.
// Deleted files keep their original path in metadata so "Restore" works.

import { processManager } from '../kernel/process-manager.js';
import { fileSystem } from '../kernel/file-system.js';
import { notifications } from '../kernel/notifications.js';
import { sounds } from '../kernel/sound.js';

const TRASH_FOLDER = '/.Trash';
const TRASH_META_KEY = 'nova-trash-meta';

export function registerTrash() {
  processManager.register('trash', {
    name: 'Trash',
    icon: '\uD83D\uDDD1\uFE0F',
    singleInstance: true,
    width: 640,
    height: 440,
    launch: (contentEl) => initTrash(contentEl),
  });
}

// Helper: move a file to trash from anywhere in the app
export async function moveToTrash(path) {
  const name = path.split('/').pop();
  const newPath = `${TRASH_FOLDER}/${Date.now()}-${name}`;

  try { await fileSystem.createFolder(TRASH_FOLDER); } catch {}
  await fileSystem.rename(path, newPath);

  // Save original path in metadata
  const meta = getMeta();
  meta[newPath] = { original: path, deleted: Date.now() };
  saveMeta(meta);

  sounds.click();
}

function getMeta() {
  try { return JSON.parse(localStorage.getItem(TRASH_META_KEY)) || {}; }
  catch { return {}; }
}

function saveMeta(meta) {
  localStorage.setItem(TRASH_META_KEY, JSON.stringify(meta));
}

async function initTrash(container) {
  await render(container);
}

async function render(container) {
  let items = [];
  try {
    items = await fileSystem.readDir(TRASH_FOLDER) || [];
  } catch {}

  const meta = getMeta();

  container.innerHTML = `
    <div style="display:flex; flex-direction:column; height:100%; font-family:var(--font); color:white; background:#1a1a22;">
      <div style="padding:14px 18px; border-bottom:1px solid rgba(255,255,255,0.06); display:flex; align-items:center; justify-content:space-between;">
        <div style="display:flex; align-items:center; gap:10px;">
          <div style="font-size:22px;">\uD83D\uDDD1\uFE0F</div>
          <div>
            <div style="font-size:13px; font-weight:600;">Trash</div>
            <div style="font-size:11px; color:rgba(255,255,255,0.4);">${items.length} ${items.length === 1 ? 'item' : 'items'}</div>
          </div>
        </div>
        <button id="trash-empty" ${items.length === 0 ? 'disabled' : ''} style="
          padding:7px 14px; border-radius:7px; border:1px solid rgba(255,59,48,0.4);
          background:${items.length === 0 ? 'rgba(255,255,255,0.03)' : 'transparent'};
          color:${items.length === 0 ? 'rgba(255,255,255,0.3)' : '#ff6b6b'};
          font-size:12px; font-family:var(--font); cursor:${items.length === 0 ? 'not-allowed' : 'pointer'};
        ">Empty Trash</button>
      </div>

      <div id="trash-list" style="flex:1; overflow-y:auto; padding:8px;">
        ${items.length === 0 ? `
          <div style="display:flex; align-items:center; justify-content:center; height:100%; color:rgba(255,255,255,0.35); font-size:13px; flex-direction:column; gap:8px;">
            <div style="font-size:64px;">\uD83D\uDDD1\uFE0F</div>
            <div>Trash is empty</div>
          </div>
        ` : items.map(item => {
          const info = meta[item.path] || {};
          const name = item.path.split('/').pop().replace(/^\d+-/, '');
          const original = info.original || 'Unknown';
          const deleted = info.deleted ? timeAgo(info.deleted) : '';
          return `
            <div class="trash-item" data-path="${item.path}" style="
              display:flex; align-items:center; gap:12px; padding:10px 14px;
              border-radius:8px; margin-bottom:2px; transition:background 0.1s;
            ">
              <div style="font-size:22px;">${item.type === 'folder' ? '\uD83D\uDCC1' : '\uD83D\uDCC4'}</div>
              <div style="flex:1; min-width:0;">
                <div style="font-size:12px; font-weight:500; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${escapeHtml(name)}</div>
                <div style="font-size:10px; color:rgba(255,255,255,0.4);">From ${escapeHtml(original)} \u00B7 ${deleted}</div>
              </div>
              <button class="trash-restore" title="Restore" style="background:rgba(255,255,255,0.08); border:none; color:white; padding:5px 10px; border-radius:5px; font-size:11px; cursor:pointer; font-family:var(--font);">\u21A9 Restore</button>
              <button class="trash-delete" title="Delete forever" style="background:rgba(255,59,48,0.15); border:none; color:#ff6b6b; padding:5px 10px; border-radius:5px; font-size:11px; cursor:pointer; font-family:var(--font);">\u00D7 Delete</button>
            </div>
          `;
        }).join('')}
      </div>
    </div>
  `;

  // Hover effects
  container.querySelectorAll('.trash-item').forEach(el => {
    el.addEventListener('mouseenter', () => el.style.background = 'rgba(255,255,255,0.05)');
    el.addEventListener('mouseleave', () => el.style.background = 'transparent');
  });

  // Restore button
  container.querySelectorAll('.trash-restore').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const trashPath = btn.closest('.trash-item').dataset.path;
      const info = meta[trashPath];
      if (!info?.original) return;
      await fileSystem.rename(trashPath, info.original);
      delete meta[trashPath];
      saveMeta(meta);
      sounds.success();
      notifications.show({ title: 'Restored', body: info.original, icon: '\u21A9', duration: 2000 });
      render(container);
    });
  });

  // Delete forever button
  container.querySelectorAll('.trash-delete').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      if (!confirm('Delete this item permanently? This cannot be undone.')) return;
      const trashPath = btn.closest('.trash-item').dataset.path;
      await fileSystem.delete(trashPath);
      const m = getMeta();
      delete m[trashPath];
      saveMeta(m);
      sounds.click();
      render(container);
    });
  });

  // Empty Trash
  const emptyBtn = container.querySelector('#trash-empty');
  if (emptyBtn && !emptyBtn.disabled) {
    emptyBtn.addEventListener('click', async () => {
      if (!confirm(`Permanently delete all ${items.length} items? This cannot be undone.`)) return;
      for (const item of items) await fileSystem.delete(item.path);
      localStorage.removeItem(TRASH_META_KEY);
      sounds.success();
      notifications.show({ title: 'Trash emptied', body: `Deleted ${items.length} items`, icon: '\uD83D\uDDD1\uFE0F' });
      render(container);
    });
  }
}

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));
}

function timeAgo(ts) {
  const diff = Date.now() - ts;
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}
