// NOVA OS — Notes App

import { processManager } from '../kernel/process-manager.js';
import { aiService } from '../kernel/ai-service.js';

export function registerNotes() {
  processManager.register('notes', {
    name: 'Notes',
    icon: '\uD83D\uDCDD',
    iconClass: 'dock-icon-notes',
    singleInstance: true,
    width: 750,
    height: 500,
    launch: (contentEl, instanceId) => {
      initNotes(contentEl, instanceId);
    }
  });
}

function initNotes(container, instanceId) {
  // Simple local storage for notes
  const STORAGE_KEY = 'nova-notes';
  let notes = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  let activeNoteId = null;

  if (notes.length === 0) {
    notes = [
      { id: Date.now(), title: 'Welcome to Notes', content: 'Welcome to NOVA Notes!\n\nThis is your personal note-taking app with AI superpowers.\n\nClick the AI button in the toolbar to enhance your writing.', date: new Date().toISOString() },
      { id: Date.now() + 1, title: 'Shopping List', content: 'Groceries:\n- Milk\n- Eggs\n- Bread\n- Coffee\n- Apples', date: new Date().toISOString() },
    ];
    save();
  }

  container.innerHTML = `
    <div class="notes-app">
      <div class="notes-sidebar">
        <div class="notes-sidebar-header">
          <span class="notes-sidebar-title">Notes</span>
          <button class="notes-new-btn" title="New Note">+</button>
        </div>
        <input type="text" class="notes-search" placeholder="Search notes...">
        <div class="notes-list" id="notes-list-${instanceId}"></div>
      </div>
      <div class="notes-editor" id="notes-editor-${instanceId}">
        <div class="notes-empty">Select a note or create a new one</div>
      </div>
    </div>
  `;

  const listEl = container.querySelector(`#notes-list-${instanceId}`);
  const editorEl = container.querySelector(`#notes-editor-${instanceId}`);
  const searchInput = container.querySelector('.notes-search');
  const newBtn = container.querySelector('.notes-new-btn');

  // New note
  newBtn.addEventListener('click', () => {
    const note = {
      id: Date.now(),
      title: 'New Note',
      content: '',
      date: new Date().toISOString()
    };
    notes.unshift(note);
    save();
    selectNote(note.id);
    renderList();
  });

  // Search
  searchInput.addEventListener('input', () => {
    renderList(searchInput.value.trim().toLowerCase());
  });

  function renderList(filter = '') {
    const filtered = filter
      ? notes.filter(n => n.title.toLowerCase().includes(filter) || n.content.toLowerCase().includes(filter))
      : notes;

    listEl.innerHTML = '';
    filtered.forEach(note => {
      const el = document.createElement('div');
      el.className = `notes-list-item${note.id === activeNoteId ? ' active' : ''}`;
      const preview = note.content.split('\n')[0].substring(0, 60) || 'Empty note';
      const date = new Date(note.date).toLocaleDateString();
      el.innerHTML = `
        <div class="notes-list-item-title">${escapeHtml(note.title)}</div>
        <div class="notes-list-item-preview">${escapeHtml(preview)}</div>
        <div class="notes-list-item-date">${date}</div>
      `;
      el.addEventListener('click', () => {
        selectNote(note.id);
        renderList(filter);
      });
      listEl.appendChild(el);
    });
  }

  function selectNote(id) {
    activeNoteId = id;
    const note = notes.find(n => n.id === id);
    if (!note) return;

    editorEl.innerHTML = `
      <div class="notes-editor-toolbar">
        <button class="notes-toolbar-btn" data-action="bold" title="Bold"><b>B</b></button>
        <button class="notes-toolbar-btn" data-action="italic" title="Italic"><i>I</i></button>
        <button class="notes-toolbar-btn" data-action="list" title="List">\u2022</button>
        <div class="notes-toolbar-separator"></div>
        <button class="notes-toolbar-btn" data-action="delete" title="Delete Note">\uD83D\uDDD1</button>
        <button class="notes-toolbar-btn notes-toolbar-ai" data-action="ai" title="AI Assist">\u2728 AI</button>
      </div>
      <textarea class="notes-textarea" placeholder="Start writing...">${note.content}</textarea>
      <div class="notes-statusbar">
        <span>${note.content.length} characters</span>
        <span>Last edited: ${new Date(note.date).toLocaleString()}</span>
      </div>
    `;

    const textarea = editorEl.querySelector('.notes-textarea');

    // Auto-save on typing
    let saveTimer;
    textarea.addEventListener('input', () => {
      note.content = textarea.value;
      note.title = textarea.value.split('\n')[0].substring(0, 50) || 'Untitled';
      note.date = new Date().toISOString();
      clearTimeout(saveTimer);
      saveTimer = setTimeout(() => {
        save();
        renderList();
      }, 500);
    });

    textarea.focus();

    // Toolbar buttons
    editorEl.querySelector('.notes-editor-toolbar').addEventListener('click', async (e) => {
      const action = e.target.closest('.notes-toolbar-btn')?.dataset.action;
      if (!action) return;

      if (action === 'bold') {
        wrapSelection(textarea, '**', '**');
      } else if (action === 'italic') {
        wrapSelection(textarea, '_', '_');
      } else if (action === 'list') {
        insertAtCursor(textarea, '\n- ');
      } else if (action === 'delete') {
        if (confirm('Delete this note?')) {
          notes = notes.filter(n => n.id !== id);
          save();
          activeNoteId = null;
          editorEl.innerHTML = '<div class="notes-empty">Select a note or create a new one</div>';
          renderList();
        }
      } else if (action === 'ai') {
        const selected = textarea.value.substring(textarea.selectionStart, textarea.selectionEnd);
        const text = selected || textarea.value;
        if (!text.trim()) return;

        const aiBtn = editorEl.querySelector('[data-action="ai"]');
        aiBtn.textContent = '\u23F3 Thinking...';
        aiBtn.style.pointerEvents = 'none';

        const prompt = selected
          ? `Improve this text, make it clearer and more polished. Return only the improved text:\n\n${text}`
          : `Summarize and improve this note. Return a cleaner version:\n\n${text}`;

        const result = await aiService.ask(prompt);

        if (selected) {
          textarea.setRangeText(result, textarea.selectionStart, textarea.selectionEnd, 'end');
        } else {
          textarea.value = result;
        }
        note.content = textarea.value;
        note.title = textarea.value.split('\n')[0].substring(0, 50) || 'Untitled';
        note.date = new Date().toISOString();
        save();
        renderList();

        aiBtn.textContent = '\u2728 AI';
        aiBtn.style.pointerEvents = '';
      }
    });
  }

  function save() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
  }

  function wrapSelection(textarea, before, after) {
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;
    textarea.value = text.substring(0, start) + before + text.substring(start, end) + after + text.substring(end);
    textarea.selectionStart = start + before.length;
    textarea.selectionEnd = end + before.length;
    textarea.focus();
    textarea.dispatchEvent(new Event('input'));
  }

  function insertAtCursor(textarea, text) {
    const pos = textarea.selectionStart;
    textarea.value = textarea.value.substring(0, pos) + text + textarea.value.substring(pos);
    textarea.selectionStart = textarea.selectionEnd = pos + text.length;
    textarea.focus();
    textarea.dispatchEvent(new Event('input'));
  }

  // Init
  renderList();
  if (notes.length > 0) selectNote(notes[0].id);
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
