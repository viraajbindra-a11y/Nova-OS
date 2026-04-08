// Astrion OS — PDF Viewer
// Opens PDF files from the virtual file system using PDF.js or iframe.

import { processManager } from '../kernel/process-manager.js';

export function registerPdfViewer() {
  processManager.register('pdf-viewer', {
    name: 'PDF Viewer',
    icon: '\uD83D\uDCC4',
    singleInstance: false,
    width: 700,
    height: 560,
    launch: (contentEl, instanceId, options) => initPdfViewer(contentEl, options),
  });
}

function initPdfViewer(container, options = {}) {
  const filePath = options.filePath || null;

  container.innerHTML = `
    <div style="display:flex; flex-direction:column; height:100%; background:#2a2a34; font-family:var(--font); color:white;">
      <div style="padding:8px 12px; border-bottom:1px solid rgba(255,255,255,0.06); display:flex; gap:8px; align-items:center;">
        <button id="pdf-open" style="padding:6px 14px; border-radius:6px; border:none; background:var(--accent); color:white; font-size:11px; cursor:pointer; font-family:var(--font);">Open File</button>
        <input type="text" id="pdf-url" placeholder="Enter PDF URL..." style="flex:1; padding:6px 12px; border-radius:6px; border:1px solid rgba(255,255,255,0.08); background:rgba(255,255,255,0.05); color:white; font-size:12px; font-family:var(--font); outline:none;">
        <button id="pdf-load" style="padding:6px 14px; border-radius:6px; border:none; background:rgba(255,255,255,0.08); color:white; font-size:11px; cursor:pointer; font-family:var(--font);">Load</button>
      </div>
      <div id="pdf-content" style="flex:1; display:flex; align-items:center; justify-content:center; color:rgba(255,255,255,0.3); font-size:13px;">
        ${filePath ? 'Loading...' : 'Open a PDF file or enter a URL'}
      </div>
    </div>
  `;

  const content = container.querySelector('#pdf-content');
  const urlInput = container.querySelector('#pdf-url');

  container.querySelector('#pdf-load').addEventListener('click', () => {
    const url = urlInput.value.trim();
    if (url) loadPdf(url);
  });

  urlInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      const url = urlInput.value.trim();
      if (url) loadPdf(url);
    }
  });

  container.querySelector('#pdf-open').addEventListener('click', () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.pdf';
    input.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) {
        const url = URL.createObjectURL(file);
        loadPdf(url);
      }
    });
    input.click();
  });

  function loadPdf(url) {
    content.innerHTML = `
      <iframe src="${url}" style="width:100%; height:100%; border:none; background:white;"></iframe>
    `;
  }

  if (filePath) {
    // Try to load from virtual file system
    import('../kernel/file-system.js').then(({ fileSystem }) => {
      fileSystem.readFile(filePath).then(file => {
        if (file?.content) loadPdf(file.content);
        else content.textContent = 'File not found';
      });
    });
  }
}
