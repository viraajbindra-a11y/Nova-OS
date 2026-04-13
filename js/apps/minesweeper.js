import { processManager } from '../kernel/process-manager.js';

export function registerMinesweeper() {
  processManager.register('minesweeper', {
    name: 'Minesweeper', icon: '💣', singleInstance: true, width: 420, height: 520,
    launch: (el) => {
      const ROWS = 9, COLS = 9, MINES = 10, CELL = 32;
      const NUM_COLORS = ['', '#4a7cf7', '#4caf50', '#f44336', '#1a237e', '#800000', '#008080', '#000', '#888'];

      let grid, revealed, flagged, mineCount, timer, seconds, gameOver, won, firstClick;

      const container = document.createElement('div');
      container.style.cssText = `
        display:flex;flex-direction:column;align-items:center;
        background:#1a1a22;width:100%;height:100%;font:var(--font);
        color:#e0e0e0;user-select:none;overflow:hidden;
      `;

      // Header
      const header = document.createElement('div');
      header.style.cssText = `
        display:flex;justify-content:space-between;align-items:center;
        width:${COLS * CELL}px;padding:8px 0;margin-top:8px;
      `;

      const counterEl = document.createElement('div');
      counterEl.style.cssText = `
        background:#0a0a0f;color:#f44;font-family:monospace;font-size:22px;
        padding:4px 8px;border:1px inset #333;min-width:48px;text-align:center;
        letter-spacing:2px;border-radius:3px;
      `;

      const faceBtn = document.createElement('button');
      faceBtn.style.cssText = `
        font-size:24px;background:#2a2a35;border:1px solid #444;
        border-radius:4px;cursor:pointer;padding:2px 8px;line-height:1.2;
      `;
      faceBtn.addEventListener('click', initGame);

      const timerEl = document.createElement('div');
      timerEl.style.cssText = counterEl.style.cssText;

      header.append(counterEl, faceBtn, timerEl);

      // Board
      const board = document.createElement('div');
      board.style.cssText = `
        display:grid;grid-template-columns:repeat(${COLS},${CELL}px);
        grid-template-rows:repeat(${ROWS},${CELL}px);
        border:2px solid #333;background:#1a1a22;margin-top:4px;
      `;

      // Prevent context menu on board
      board.addEventListener('contextmenu', e => e.preventDefault());

      container.append(header, board);
      el.appendChild(container);

      function initGame() {
        // Clear previous timer
        if (timer) clearInterval(timer);
        timer = null;
        seconds = 0;
        gameOver = false;
        won = false;
        firstClick = true;
        mineCount = MINES;

        grid = Array.from({ length: ROWS }, () => Array(COLS).fill(0));
        revealed = Array.from({ length: ROWS }, () => Array(COLS).fill(false));
        flagged = Array.from({ length: ROWS }, () => Array(COLS).fill(false));

        faceBtn.textContent = '\u{1F600}';
        counterEl.textContent = String(mineCount).padStart(3, '0');
        timerEl.textContent = '000';

        board.innerHTML = '';
        for (let r = 0; r < ROWS; r++) {
          for (let c = 0; c < COLS; c++) {
            const cell = document.createElement('div');
            cell.dataset.r = r;
            cell.dataset.c = c;
            cell.style.cssText = `
              width:${CELL}px;height:${CELL}px;
              background:#2a2a35;border:1px solid #3a3a48;
              display:flex;align-items:center;justify-content:center;
              font-size:16px;font-weight:bold;cursor:pointer;
              box-sizing:border-box;transition:background 0.1s;
            `;
            cell.addEventListener('mousedown', onCellClick);
            board.appendChild(cell);
          }
        }
      }

      function placeMines(safeR, safeC) {
        let placed = 0;
        while (placed < MINES) {
          const r = Math.floor(Math.random() * ROWS);
          const c = Math.floor(Math.random() * COLS);
          if (grid[r][c] === -1) continue;
          if (Math.abs(r - safeR) <= 1 && Math.abs(c - safeC) <= 1) continue;
          grid[r][c] = -1;
          placed++;
        }
        // Calculate numbers
        for (let r = 0; r < ROWS; r++) {
          for (let c = 0; c < COLS; c++) {
            if (grid[r][c] === -1) continue;
            let count = 0;
            for (let dr = -1; dr <= 1; dr++) {
              for (let dc = -1; dc <= 1; dc++) {
                const nr = r + dr, nc = c + dc;
                if (nr >= 0 && nr < ROWS && nc >= 0 && nc < COLS && grid[nr][nc] === -1) count++;
              }
            }
            grid[r][c] = count;
          }
        }
      }

      function startTimer() {
        if (timer) return;
        timer = setInterval(() => {
          seconds++;
          if (seconds > 999) seconds = 999;
          timerEl.textContent = String(seconds).padStart(3, '0');
        }, 1000);
      }

      function getCell(r, c) {
        return board.children[r * COLS + c];
      }

      function onCellClick(e) {
        if (gameOver || won) return;
        const r = +e.target.dataset.r, c = +e.target.dataset.c;
        if (isNaN(r) || isNaN(c)) return;

        if (e.button === 2) {
          // Right click — flag
          if (revealed[r][c]) return;
          flagged[r][c] = !flagged[r][c];
          const cell = getCell(r, c);
          cell.textContent = flagged[r][c] ? '\u{1F6A9}' : '';
          mineCount += flagged[r][c] ? -1 : 1;
          counterEl.textContent = String(Math.max(mineCount, 0)).padStart(3, '0');
          return;
        }

        if (e.button !== 0) return;
        if (flagged[r][c]) return;

        if (firstClick) {
          firstClick = false;
          placeMines(r, c);
          startTimer();
        }

        if (grid[r][c] === -1) {
          // Hit mine
          gameOver = true;
          clearInterval(timer);
          timer = null;
          faceBtn.textContent = '\u{1F635}';
          revealAll(r, c);
          return;
        }

        floodReveal(r, c);
        checkWin();
      }

      function floodReveal(r, c) {
        if (r < 0 || r >= ROWS || c < 0 || c >= COLS) return;
        if (revealed[r][c] || flagged[r][c]) return;
        revealed[r][c] = true;

        const cell = getCell(r, c);
        cell.style.background = '#1e1e28';
        cell.style.border = '1px solid #2a2a35';
        cell.style.cursor = 'default';

        const val = grid[r][c];
        if (val > 0) {
          cell.textContent = val;
          cell.style.color = NUM_COLORS[val];
          return;
        }

        // val === 0, flood fill neighbors
        for (let dr = -1; dr <= 1; dr++) {
          for (let dc = -1; dc <= 1; dc++) {
            if (dr === 0 && dc === 0) continue;
            floodReveal(r + dr, c + dc);
          }
        }
      }

      function revealAll(hitR, hitC) {
        for (let r = 0; r < ROWS; r++) {
          for (let c = 0; c < COLS; c++) {
            const cell = getCell(r, c);
            if (grid[r][c] === -1) {
              cell.textContent = '\u{1F4A3}';
              cell.style.cursor = 'default';
              if (r === hitR && c === hitC) {
                cell.style.background = '#6a1a1a';
              }
            } else if (flagged[r][c] && grid[r][c] !== -1) {
              // Wrong flag
              cell.textContent = '\u274C';
              cell.style.cursor = 'default';
            }
          }
        }
      }

      function checkWin() {
        let unrevealedSafe = 0;
        for (let r = 0; r < ROWS; r++) {
          for (let c = 0; c < COLS; c++) {
            if (grid[r][c] !== -1 && !revealed[r][c]) unrevealedSafe++;
          }
        }
        if (unrevealedSafe === 0) {
          won = true;
          gameOver = true;
          clearInterval(timer);
          timer = null;
          faceBtn.textContent = '\u{1F60E}';
          counterEl.textContent = '000';
          // Auto-flag remaining mines
          for (let r = 0; r < ROWS; r++) {
            for (let c = 0; c < COLS; c++) {
              if (grid[r][c] === -1 && !flagged[r][c]) {
                flagged[r][c] = true;
                getCell(r, c).textContent = '\u{1F6A9}';
              }
            }
          }
        }
      }

      initGame();

      // Cleanup on window close
      const obs = new MutationObserver(() => {
        if (!el.isConnected) {
          if (timer) clearInterval(timer);
          obs.disconnect();
        }
      });
      obs.observe(el.parentNode || document.body, { childList: true, subtree: true });
    }
  });
}
