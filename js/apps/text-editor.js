// NOVA OS — Text Editor App

import { processManager } from '../kernel/process-manager.js';
import { fileSystem } from '../kernel/file-system.js';
import { windowManager } from '../kernel/window-manager.js';

export function registerTextEditor() {
  processManager.register('text-editor', {
    name: 'Text Editor',
    icon: '\uD83D\uDCBB',
    iconClass: 'dock-icon-texteditor',
    singleInstance: false,
    width: 650,
    height: 450,
    launch: (contentEl, instanceId, options) => {
      initTextEditor(contentEl, instanceId, options);
    }
  });
}

async function initTextEditor(container, instanceId, options = {}) {
  let filePath = options.filePath || null;
  let content = '';
  let modified = false;

  if (filePath) {
    const file = await fileSystem.readFile(filePath);
    if (file) content = file.content || '';
  }

  const fileName = filePath ? fileSystem.getFileName(filePath) : 'Untitled';

  container.innerHTML = `
    <div class="texteditor-app">
      <div class="texteditor-toolbar">
        <button class="texteditor-toolbar-btn" data-action="new" title="New File">New</button>
        <button class="texteditor-toolbar-btn" data-action="save" title="Save (Cmd+S)">Save</button>
        <button class="texteditor-toolbar-btn" data-action="save-as" title="Save As">Save As</button>
        <div class="texteditor-toolbar-separator"></div>
        <button class="texteditor-toolbar-btn" data-action="undo" title="Undo">Undo</button>
        <button class="texteditor-toolbar-btn" data-action="redo" title="Redo">Redo</button>
        <div class="texteditor-toolbar-separator"></div>
        <button class="texteditor-toolbar-btn" data-action="find" title="Find">Find</button>
        <span class="texteditor-filename" id="editor-filename-${instanceId}">${fileName}${modified ? ' \u2022' : ''}</span>
      </div>
      <div class="texteditor-body">
        <div class="texteditor-line-numbers" id="editor-lines-${instanceId}">
          <div class="texteditor-line-number">1</div>
        </div>
        <textarea class="texteditor-textarea" id="editor-textarea-${instanceId}" placeholder="Start typing..." spellcheck="false">${escapeHtml(content)}</textarea>
      </div>
      <div class="texteditor-statusbar">
        <div class="texteditor-statusbar-left">
          <span id="editor-cursor-${instanceId}">Ln 1, Col 1</span>
          <span id="editor-chars-${instanceId}">${content.length} chars</span>
        </div>
        <div class="texteditor-statusbar-right">
          <span>${getLanguage(fileName)}</span>
          <span>UTF-8</span>
        </div>
      </div>
    </div>
  `;

  const textarea = container.querySelector(`#editor-textarea-${instanceId}`);
  const lineNumbers = container.querySelector(`#editor-lines-${instanceId}`);
  const cursorInfo = container.querySelector(`#editor-cursor-${instanceId}`);
  const charCount = container.querySelector(`#editor-chars-${instanceId}`);
  const fileNameEl = container.querySelector(`#editor-filename-${instanceId}`);

  updateLineNumbers();

  // Text input
  textarea.addEventListener('input', () => {
    modified = true;
    fileNameEl.textContent = (filePath ? fileSystem.getFileName(filePath) : 'Untitled') + ' \u2022';
    updateLineNumbers();
    charCount.textContent = `${textarea.value.length} chars`;
  });

  // Cursor position
  textarea.addEventListener('click', updateCursor);
  textarea.addEventListener('keyup', updateCursor);

  // Scroll sync
  textarea.addEventListener('scroll', () => {
    lineNumbers.scrollTop = textarea.scrollTop;
  });

  // Tab key
  textarea.addEventListener('keydown', (e) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      const start = textarea.selectionStart;
      textarea.value = textarea.value.substring(0, start) + '    ' + textarea.value.substring(textarea.selectionEnd);
      textarea.selectionStart = textarea.selectionEnd = start + 4;
      textarea.dispatchEvent(new Event('input'));
    }

    // Cmd+S / Ctrl+S to save
    if ((e.metaKey || e.ctrlKey) && e.key === 's') {
      e.preventDefault();
      saveFile();
    }
  });

  // Toolbar
  container.querySelector('.texteditor-toolbar').addEventListener('click', (e) => {
    const action = e.target.closest('.texteditor-toolbar-btn')?.dataset.action;
    if (!action) return;

    switch (action) {
      case 'new':
        processManager.launch('text-editor', { title: 'Untitled' });
        break;
      case 'save':
        saveFile();
        break;
      case 'save-as':
        saveFileAs();
        break;
      case 'undo':
        document.execCommand('undo');
        break;
      case 'redo':
        document.execCommand('redo');
        break;
      case 'find':
        const query = prompt('Find:');
        if (query) {
          const idx = textarea.value.indexOf(query, textarea.selectionEnd);
          if (idx >= 0) {
            textarea.setSelectionRange(idx, idx + query.length);
            textarea.focus();
          }
        }
        break;
    }
  });

  function updateLineNumbers() {
    const lines = textarea.value.split('\n').length;
    lineNumbers.innerHTML = Array.from({ length: lines }, (_, i) =>
      `<div class="texteditor-line-number">${i + 1}</div>`
    ).join('');
  }

  function updateCursor() {
    const text = textarea.value.substring(0, textarea.selectionStart);
    const lines = text.split('\n');
    const line = lines.length;
    const col = lines[lines.length - 1].length + 1;
    cursorInfo.textContent = `Ln ${line}, Col ${col}`;
  }

  async function saveFile() {
    if (!filePath) {
      saveFileAs();
      return;
    }
    await fileSystem.writeFile(filePath, textarea.value);
    modified = false;
    fileNameEl.textContent = fileSystem.getFileName(filePath);
  }

  async function saveFileAs() {
    const name = prompt('Save as:', filePath ? fileSystem.getFileName(filePath) : 'untitled.txt');
    if (!name) return;
    const dir = filePath ? fileSystem.getParentPath(filePath) : '/Documents';
    filePath = `${dir}/${name}`;
    await fileSystem.writeFile(filePath, textarea.value);
    modified = false;
    fileNameEl.textContent = name;
    windowManager.setTitle(instanceId, name);
  }

  textarea.focus();
}

function getLanguage(filename) {
  const ext = filename.split('.').pop()?.toLowerCase();
  const langs = {
    js: 'JavaScript', ts: 'TypeScript', py: 'Python', html: 'HTML',
    css: 'CSS', json: 'JSON', md: 'Markdown', txt: 'Plain Text',
    swift: 'Swift', java: 'Java', c: 'C', cpp: 'C++', rs: 'Rust',
  };
  return langs[ext] || 'Plain Text';
}

function escapeHtml(text) {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
