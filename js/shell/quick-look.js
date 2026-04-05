// NOVA OS — Quick Look
// Space bar in Finder shows a large preview of the selected file.
// Handles text, images, and generic files.

import { fileSystem } from '../kernel/file-system.js';

let overlay = null;
let currentPath = null;

export function initQuickLook() {
  // Listen for Space in Finder windows
  document.addEventListener('keydown', async (e) => {
    if (e.key !== ' ') return;

    // Only trigger if a finder list item is focused or hovered
    const active = document.activeElement;
    const finderItem = active?.closest('[data-file-path]') ||
                       document.querySelector('.finder-file.selected[data-file-path]');

    if (!finderItem) return;
    if (active?.tagName === 'INPUT' || active?.tagName === 'TEXTAREA') return;

    e.preventDefault();
    const path = finderItem.dataset.filePath;
    if (path) await showQuickLook(path);
  });
}

export async function showQuickLook(path) {
  close(); // close any existing
  currentPath = path;

  const node = await fileSystem.readFile(path).catch(() => null);
  if (!node) return;

  overlay = document.createElement('div');
  overlay.id = 'quick-look';
  overlay.style.cssText = `
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.55);
    backdrop-filter: blur(30px);
    -webkit-backdrop-filter: blur(30px);
    z-index: 98000;
    display: flex;
    align-items: center;
    justify-content: center;
    animation: qlFade 0.2s ease;
    font-family: var(--font);
  `;

  const panel = document.createElement('div');
  panel.style.cssText = `
    width: min(720px, 80vw);
    max-height: 80vh;
    background: rgba(30, 30, 36, 0.95);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 14px;
    padding: 0;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    box-shadow: 0 30px 90px rgba(0, 0, 0, 0.6);
    animation: qlScale 0.25s cubic-bezier(0.16, 1, 0.3, 1);
    color: white;
  `;

  // Header with filename + close
  const fileName = path.split('/').pop();
  const header = document.createElement('div');
  header.style.cssText = `
    padding: 12px 16px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.08);
    display: flex;
    align-items: center;
    justify-content: space-between;
    font-size: 13px;
    font-weight: 500;
  `;
  header.innerHTML = `
    <span>${fileName}</span>
    <button id="ql-close" style="background: rgba(255,255,255,0.08); border: none; color: white; width: 24px; height: 24px; border-radius: 12px; cursor: pointer; font-size: 14px;">\u00D7</button>
  `;

  // Body — type-specific rendering
  const body = document.createElement('div');
  body.style.cssText = 'flex: 1; overflow: auto; padding: 16px; display: flex; align-items: center; justify-content: center; min-height: 240px;';

  await renderPreview(body, path, node);

  panel.appendChild(header);
  panel.appendChild(body);
  overlay.appendChild(panel);
  document.body.appendChild(overlay);

  if (!document.getElementById('ql-styles')) {
    const s = document.createElement('style');
    s.id = 'ql-styles';
    s.textContent = `
      @keyframes qlFade { from { opacity: 0; } to { opacity: 1; } }
      @keyframes qlScale { from { opacity: 0; transform: scale(0.9); } to { opacity: 1; transform: scale(1); } }
    `;
    document.head.appendChild(s);
  }

  // Close handlers
  header.querySelector('#ql-close').addEventListener('click', close);
  overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });

  function escHandler(e) {
    if (e.key === 'Escape' || e.key === ' ') {
      e.preventDefault();
      close();
      document.removeEventListener('keydown', escHandler);
    }
  }
  document.addEventListener('keydown', escHandler);
}

async function renderPreview(container, path, node) {
  const ext = path.split('.').pop().toLowerCase();

  // Directory / folder
  if (node.type === 'folder' || node.type === 'directory') {
    const children = await fileSystem.readDir(path).catch(() => []);
    container.innerHTML = `
      <div style="text-align: center;">
        <div style="font-size: 80px;">\uD83D\uDCC1</div>
        <div style="margin-top: 12px; font-size: 14px;">Folder</div>
        <div style="margin-top: 4px; font-size: 12px; color: rgba(255,255,255,0.5);">${children.length} items</div>
      </div>
    `;
    return;
  }

  // Image
  if (['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp', 'bmp'].includes(ext)) {
    const content = node.content || '';
    const src = content.startsWith('data:') || content.startsWith('http') || content.startsWith('/')
      ? content
      : `data:image/${ext};base64,${content}`;
    container.innerHTML = `<img src="${src}" style="max-width: 100%; max-height: 60vh; border-radius: 8px;" onerror="this.replaceWith(Object.assign(document.createElement('div'),{textContent:'Image could not be loaded',style:'color:rgba(255,255,255,0.5)'}))">`;
    return;
  }

  // Text-like
  if (['txt', 'md', 'js', 'ts', 'json', 'html', 'css', 'py', 'sh', 'log', 'xml', 'yml', 'yaml', 'c', 'cpp', 'h'].includes(ext)) {
    const content = (node.content || '').slice(0, 5000);
    const pre = document.createElement('pre');
    pre.style.cssText = `
      width: 100%;
      max-height: 60vh;
      overflow: auto;
      background: rgba(0, 0, 0, 0.35);
      padding: 16px;
      border-radius: 8px;
      font-family: var(--mono, monospace);
      font-size: 12px;
      color: #c9d1d9;
      white-space: pre-wrap;
      word-break: break-word;
    `;
    pre.textContent = content || '(empty file)';
    container.appendChild(pre);
    return;
  }

  // Audio
  if (['mp3', 'wav', 'ogg', 'm4a', 'flac'].includes(ext)) {
    container.innerHTML = `
      <div style="text-align: center;">
        <div style="font-size: 64px;">\uD83C\uDFB5</div>
        <audio controls style="margin-top: 16px; width: 300px;">
          <source src="${node.content || ''}">
        </audio>
      </div>
    `;
    return;
  }

  // Video
  if (['mp4', 'webm', 'mov'].includes(ext)) {
    container.innerHTML = `
      <video controls style="max-width: 100%; max-height: 60vh; border-radius: 8px;">
        <source src="${node.content || ''}">
      </video>
    `;
    return;
  }

  // Generic
  const size = (node.content?.length || 0);
  container.innerHTML = `
    <div style="text-align: center;">
      <div style="font-size: 80px;">\uD83D\uDCC4</div>
      <div style="margin-top: 12px; font-size: 14px;">${ext.toUpperCase()} file</div>
      <div style="margin-top: 4px; font-size: 12px; color: rgba(255,255,255,0.5);">${formatBytes(size)}</div>
    </div>
  `;
}

function formatBytes(n) {
  if (n < 1024) return n + ' bytes';
  if (n < 1024 * 1024) return (n / 1024).toFixed(1) + ' KB';
  return (n / 1024 / 1024).toFixed(1) + ' MB';
}

function close() {
  if (overlay) {
    overlay.style.animation = 'qlFade 0.15s reverse forwards';
    setTimeout(() => { overlay?.remove(); overlay = null; }, 150);
  }
  currentPath = null;
}
