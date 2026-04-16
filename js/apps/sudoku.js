// ASTRION OS — Sudoku
import { processManager } from '../kernel/process-manager.js';

export function registerSudoku() {
  processManager.register('sudoku', {
    name: 'Sudoku',
    icon: '🔢',
    singleInstance: true,
    width: 440,
    height: 580,
    launch: (el) => initSudoku(el)
  });
}

function initSudoku(container) {
  let board = [], solution = [], selected = null, timer = 0, timerInterval = null, mistakes = 0;
  let difficulty = 'medium';
  const REMOVE_MAP = { easy: 30, medium: 42, hard: 54 };

  function generate() {
    solution = Array.from({ length: 9 }, () => Array(9).fill(0));
    fillBoard(solution);
    board = solution.map(r => [...r]);
    const remove = REMOVE_MAP[difficulty];
    let removed = 0;
    while (removed < remove) {
      const r = Math.floor(Math.random() * 9), c = Math.floor(Math.random() * 9);
      if (board[r][c] !== 0) { board[r][c] = 0; removed++; }
    }
    mistakes = 0; timer = 0; selected = null;
    if (timerInterval) clearInterval(timerInterval);
    timerInterval = setInterval(() => { timer++; renderTimer(); }, 1000);
    render();
  }

  function fillBoard(b) {
    const nums = [1,2,3,4,5,6,7,8,9];
    for (let i = 0; i < 9; i++) {
      for (let j = 0; j < 9; j++) {
        if (b[i][j] === 0) {
          const shuffled = [...nums].sort(() => Math.random() - 0.5);
          for (const n of shuffled) {
            if (isValid(b, i, j, n)) {
              b[i][j] = n;
              if (fillBoard(b)) return true;
              b[i][j] = 0;
            }
          }
          return false;
        }
      }
    }
    return true;
  }

  function isValid(b, r, c, n) {
    for (let i = 0; i < 9; i++) { if (b[r][i] === n || b[i][c] === n) return false; }
    const br = Math.floor(r/3)*3, bc = Math.floor(c/3)*3;
    for (let i = br; i < br+3; i++) for (let j = bc; j < bc+3; j++) if (b[i][j] === n) return false;
    return true;
  }

  function hasConflict(r, c) {
    const v = board[r][c];
    if (!v) return false;
    for (let i = 0; i < 9; i++) { if (i !== c && board[r][i] === v) return true; if (i !== r && board[i][c] === v) return true; }
    const br = Math.floor(r/3)*3, bc = Math.floor(c/3)*3;
    for (let i = br; i < br+3; i++) for (let j = bc; j < bc+3; j++) if (!(i===r && j===c) && board[i][j] === v) return true;
    return false;
  }

  function isComplete() {
    for (let i = 0; i < 9; i++) for (let j = 0; j < 9; j++) if (board[i][j] !== solution[i][j]) return false;
    return true;
  }

  function renderTimer() {
    const el = container.querySelector('.sudoku-timer');
    if (el) { const m = Math.floor(timer/60); const s = timer%60; el.textContent = `${m}:${s.toString().padStart(2,'0')}`; }
  }

  function render() {
    const accent = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() || '#007aff';
    container.innerHTML = `
      <div style="display:flex;flex-direction:column;height:100%;background:#1a1a2e;color:white;font-family:var(--font,system-ui);padding:12px;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
          <div style="display:flex;gap:6px;">
            ${['easy','medium','hard'].map(d => `<button class="sudoku-diff" data-d="${d}" style="
              padding:4px 10px;border-radius:8px;border:none;font-size:11px;cursor:pointer;
              background:${d===difficulty ? accent : 'rgba(255,255,255,0.08)'};color:white;
            ">${d[0].toUpperCase()+d.slice(1)}</button>`).join('')}
          </div>
          <div style="display:flex;gap:12px;align-items:center;font-size:13px;">
            <span>❌ ${mistakes}</span>
            <span class="sudoku-timer">0:00</span>
            <button class="sudoku-new" style="padding:4px 10px;border-radius:8px;border:none;background:${accent};color:white;font-size:11px;cursor:pointer;">New</button>
          </div>
        </div>
        <div class="sudoku-grid" style="display:grid;grid-template-columns:repeat(9,1fr);gap:1px;background:rgba(255,255,255,0.15);border-radius:8px;overflow:hidden;aspect-ratio:1;max-height:360px;">
          ${board.map((row, ri) => row.map((cell, ci) => {
            const isOrig = solution[ri][ci] === cell && cell !== 0 && board[ri][ci] !== 0;
            const isGiven = solution[ri][ci] !== 0 && cell === solution[ri][ci] && !wasEmpty(ri,ci);
            const isSel = selected && selected[0]===ri && selected[1]===ci;
            const conflict = cell !== 0 && hasConflict(ri, ci);
            const highlight = selected && cell !== 0 && board[selected[0]][selected[1]] === cell;
            const borderR = ci % 3 === 2 && ci < 8 ? 'border-right:2px solid rgba(255,255,255,0.3);' : '';
            const borderB = ri % 3 === 2 && ri < 8 ? 'border-bottom:2px solid rgba(255,255,255,0.3);' : '';
            return `<div class="sudoku-cell" data-r="${ri}" data-c="${ci}" style="
              display:flex;align-items:center;justify-content:center;
              aspect-ratio:1;font-size:18px;font-weight:${isGiven ? '700' : '400'};cursor:pointer;
              background:${isSel ? accent : conflict ? 'rgba(255,60,60,0.25)' : highlight ? 'rgba(255,255,255,0.08)' : 'rgba(26,26,46,1)'};
              color:${isGiven ? 'white' : conflict ? '#ff4444' : 'rgba(140,180,255,0.9)'};
              ${borderR}${borderB}
            ">${cell || ''}</div>`;
          }).join('')).join('')}
        </div>
        <div style="display:flex;justify-content:center;gap:6px;margin-top:12px;">
          ${[1,2,3,4,5,6,7,8,9].map(n => `<button class="sudoku-num" data-n="${n}" style="
            width:34px;height:34px;border-radius:8px;border:none;background:rgba(255,255,255,0.08);
            color:white;font-size:15px;cursor:pointer;transition:background 0.15s;
          ">${n}</button>`).join('')}
          <button class="sudoku-num" data-n="0" style="
            width:34px;height:34px;border-radius:8px;border:none;background:rgba(255,60,60,0.15);
            color:#ff6b6b;font-size:13px;cursor:pointer;
          ">⌫</button>
        </div>
      </div>
    `;

    renderTimer();

    // Track which cells were originally empty
    if (!container._emptyMap) {
      container._emptyMap = board.map(r => r.map(c => c === 0));
    }

    container.querySelectorAll('.sudoku-cell').forEach(el => {
      el.addEventListener('click', () => {
        const r = +el.dataset.r, c = +el.dataset.c;
        if (!container._emptyMap[r][c]) { selected = [r,c]; render(); return; }
        selected = [r, c]; render();
      });
    });

    container.querySelectorAll('.sudoku-num').forEach(el => {
      el.addEventListener('click', () => {
        if (!selected) return;
        const [r,c] = selected;
        if (!container._emptyMap[r][c]) return;
        const n = +el.dataset.n;
        board[r][c] = n;
        if (n !== 0 && n !== solution[r][c]) mistakes++;
        render();
        if (isComplete()) {
          clearInterval(timerInterval);
          // Show win message inline instead of alert (blocked in WebKitGTK)
          setTimeout(() => {
            const msg = document.createElement('div');
            msg.style.cssText = 'position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);background:#22c55e;color:white;padding:20px 32px;border-radius:16px;font-size:16px;font-weight:700;z-index:100;text-align:center;box-shadow:0 8px 30px rgba(0,0,0,0.4);';
            msg.textContent = `🎉 Solved in ${Math.floor(timer/60)}:${(timer%60).toString().padStart(2,'0')} with ${mistakes} mistakes!`;
            container.style.position = 'relative';
            container.appendChild(msg);
            setTimeout(() => msg.remove(), 3000);
          }, 100);
        }
      });
    });

    container.querySelectorAll('.sudoku-diff').forEach(el => {
      el.addEventListener('click', () => { difficulty = el.dataset.d; container._emptyMap = null; generate(); });
    });

    container.querySelector('.sudoku-new').addEventListener('click', () => { container._emptyMap = null; generate(); });
  }

  function wasEmpty(r, c) { return container._emptyMap ? container._emptyMap[r][c] : false; }

  generate();

  // Cleanup
  const obs = new MutationObserver(() => {
    if (!container.isConnected) { clearInterval(timerInterval); obs.disconnect(); }
  });
  if (container.parentElement) obs.observe(container.parentElement, { childList: true, subtree: true });
}
