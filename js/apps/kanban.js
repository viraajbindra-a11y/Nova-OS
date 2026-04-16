// Astrion OS — Kanban Board
// Drag-and-drop project management with columns and cards.

import { processManager } from '../kernel/process-manager.js';

const BOARDS_KEY = 'nova-kanban-boards';

export function registerKanban() {
  processManager.register('kanban', {
    name: 'Kanban',
    icon: '\uD83D\uDCCB',
    singleInstance: true,
    width: 900,
    height: 560,
    launch: (contentEl) => initKanban(contentEl),
  });
}

function getBoard() {
  try {
    return JSON.parse(localStorage.getItem(BOARDS_KEY)) || {
      columns: [
        { id: 'todo', title: 'To Do', cards: [{ id: 'c1', text: 'Welcome to Kanban!', color: '#007aff' }] },
        { id: 'progress', title: 'In Progress', cards: [] },
        { id: 'done', title: 'Done', cards: [] },
      ]
    };
  } catch {
    return { columns: [
      { id: 'todo', title: 'To Do', cards: [] },
      { id: 'progress', title: 'In Progress', cards: [] },
      { id: 'done', title: 'Done', cards: [] },
    ]};
  }
}

function saveBoard(board) {
  localStorage.setItem(BOARDS_KEY, JSON.stringify(board));
}

function initKanban(container) {
  let board = getBoard();
  let dragCard = null;
  let dragFromCol = null;

  function render() {
    container.innerHTML = `
      <div style="display:flex; flex-direction:column; height:100%; font-family:var(--font); color:white; background:#1a1a22;">
        <div style="padding:10px 16px; border-bottom:1px solid rgba(255,255,255,0.06); display:flex; justify-content:space-between; align-items:center;">
          <div style="font-size:14px; font-weight:600;">Kanban Board</div>
          <button id="kb-add-col" style="padding:6px 12px; border-radius:6px; border:none; background:rgba(255,255,255,0.08); color:white; font-size:11px; cursor:pointer; font-family:var(--font);">+ Column</button>
        </div>
        <div style="flex:1; display:flex; gap:12px; padding:12px; overflow-x:auto;">
          ${board.columns.map((col, ci) => `
            <div class="kb-col" data-col="${ci}" style="
              min-width:260px; width:260px; background:rgba(255,255,255,0.03);
              border-radius:10px; display:flex; flex-direction:column; flex-shrink:0;
            ">
              <div style="padding:10px 12px; font-size:13px; font-weight:600; display:flex; justify-content:space-between; align-items:center;">
                <span>${esc(col.title)} (${col.cards.length})</span>
                <button class="kb-add-card" data-col="${ci}" style="background:none; border:none; color:var(--accent); font-size:16px; cursor:pointer;">+</button>
              </div>
              <div class="kb-cards" data-col="${ci}" style="flex:1; padding:0 8px 8px; overflow-y:auto; min-height:60px;">
                ${col.cards.map((card, cdi) => `
                  <div class="kb-card" draggable="true" data-col="${ci}" data-card="${cdi}" style="
                    padding:10px 12px; margin-bottom:6px; border-radius:8px;
                    background:rgba(255,255,255,0.06); cursor:grab;
                    border-left:3px solid ${card.color || '#007aff'};
                    font-size:12px; line-height:1.5;
                  ">
                    <div style="display:flex; justify-content:space-between;">
                      <span>${esc(card.text)}</span>
                      <button class="kb-del-card" data-col="${ci}" data-card="${cdi}" style="background:none; border:none; color:rgba(255,255,255,0.3); cursor:pointer; font-size:12px; padding:0 2px;">\u00D7</button>
                    </div>
                  </div>
                `).join('')}
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;

    // Add column
    container.querySelector('#kb-add-col').addEventListener('click', async () => {
      const { showPrompt } = await import('../lib/dialog.js');
      const title = await showPrompt('Column name:', 'New Column');
      if (!title) return;
      board.columns.push({ id: 'col-' + Date.now(), title, cards: [] });
      saveBoard(board);
      render();
    });

    // Add card
    container.querySelectorAll('.kb-add-card').forEach(btn => {
      btn.addEventListener('click', async () => {
        const { showPrompt } = await import('../lib/dialog.js');
        const text = await showPrompt('Card text:', '');
        if (!text) return;
        const colors = ['#007aff', '#ff9500', '#34c759', '#ff3b30', '#5856d6', '#ff2d55'];
        const ci = parseInt(btn.dataset.col);
        board.columns[ci].cards.push({
          id: 'card-' + Date.now(),
          text,
          color: colors[board.columns[ci].cards.length % colors.length],
        });
        saveBoard(board);
        render();
      });
    });

    // Delete card
    container.querySelectorAll('.kb-del-card').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const ci = parseInt(btn.dataset.col);
        const cdi = parseInt(btn.dataset.card);
        board.columns[ci].cards.splice(cdi, 1);
        saveBoard(board);
        render();
      });
    });

    // Drag and drop
    container.querySelectorAll('.kb-card').forEach(card => {
      card.addEventListener('dragstart', (e) => {
        dragCard = parseInt(card.dataset.card);
        dragFromCol = parseInt(card.dataset.col);
        card.style.opacity = '0.4';
      });
      card.addEventListener('dragend', () => { card.style.opacity = '1'; });
    });

    container.querySelectorAll('.kb-cards').forEach(zone => {
      zone.addEventListener('dragover', (e) => { e.preventDefault(); zone.style.background = 'rgba(0,122,255,0.1)'; });
      zone.addEventListener('dragleave', () => { zone.style.background = ''; });
      zone.addEventListener('drop', (e) => {
        e.preventDefault();
        zone.style.background = '';
        const toCol = parseInt(zone.dataset.col);
        if (dragCard !== null && dragFromCol !== null) {
          const card = board.columns[dragFromCol].cards.splice(dragCard, 1)[0];
          board.columns[toCol].cards.push(card);
          saveBoard(board);
          render();
        }
        dragCard = null;
        dragFromCol = null;
      });
    });
  }

  render();
}

function esc(s) {
  return String(s || '').replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
}
