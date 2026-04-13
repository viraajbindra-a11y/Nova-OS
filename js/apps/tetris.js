import { processManager } from '../kernel/process-manager.js';

export function registerTetris() {
  processManager.register('tetris', {
    name: 'Tetris', icon: '🧱', singleInstance: true, width: 380, height: 540,
    launch: (el) => {
      // ── Constants ──
      const COLS = 10, ROWS = 20, CELL = 24;
      const BOARD_W = COLS * CELL, BOARD_H = ROWS * CELL;
      const PREVIEW_CELLS = 4, PREVIEW_CELL = 16;
      const COLORS = {
        I: '#00f0f0', O: '#f0f000', T: '#a000f0',
        S: '#00f000', Z: '#f00000', J: '#0000f0', L: '#f0a000'
      };
      const SHAPES = {
        I: [[0,0],[1,0],[2,0],[3,0]],
        O: [[0,0],[1,0],[0,1],[1,1]],
        T: [[0,0],[1,0],[2,0],[1,1]],
        S: [[1,0],[2,0],[0,1],[1,1]],
        Z: [[0,0],[1,0],[1,1],[2,1]],
        J: [[0,0],[0,1],[1,1],[2,1]],
        L: [[2,0],[0,1],[1,1],[2,1]]
      };
      const PIECE_NAMES = Object.keys(SHAPES);
      const LINE_SCORES = [0, 100, 300, 500, 800];

      // ── State ──
      let board = Array.from({ length: ROWS }, () => Array(COLS).fill(null));
      let current, currentType, currentX, currentY;
      let nextType = null;
      let score = 0, lines = 0, level = 1;
      let dropInterval = 800, timer = null;
      let gameOver = false, paused = false;

      // ── DOM ──
      el.style.cssText = 'display:flex;flex-direction:column;align-items:center;background:#111;height:100%;padding:8px;box-sizing:border-box;outline:none;';
      el.tabIndex = 0;

      const hud = document.createElement('div');
      hud.style.cssText = 'display:flex;justify-content:space-between;width:' + (BOARD_W + 100) + 'px;color:#ccc;font:bold 13px/1 monospace;margin-bottom:6px;';
      const scoreEl = document.createElement('span');
      const levelEl = document.createElement('span');
      const linesEl = document.createElement('span');
      hud.append(scoreEl, levelEl, linesEl);
      el.appendChild(hud);

      const row = document.createElement('div');
      row.style.cssText = 'display:flex;gap:8px;';

      const canvas = document.createElement('canvas');
      canvas.width = BOARD_W; canvas.height = BOARD_H;
      canvas.style.cssText = 'border:1px solid #333;background:#111;';
      const ctx = canvas.getContext('2d');

      const sidebar = document.createElement('div');
      sidebar.style.cssText = 'display:flex;flex-direction:column;align-items:center;';
      const nextLabel = document.createElement('div');
      nextLabel.textContent = 'NEXT';
      nextLabel.style.cssText = 'color:#888;font:bold 11px monospace;margin-bottom:4px;';
      const previewCanvas = document.createElement('canvas');
      previewCanvas.width = PREVIEW_CELLS * PREVIEW_CELL;
      previewCanvas.height = PREVIEW_CELLS * PREVIEW_CELL;
      previewCanvas.style.cssText = 'border:1px solid #333;background:#1a1a1a;';
      const pctx = previewCanvas.getContext('2d');
      sidebar.append(nextLabel, previewCanvas);

      row.append(canvas, sidebar);
      el.appendChild(row);

      const msg = document.createElement('div');
      msg.style.cssText = 'color:#fff;font:bold 14px monospace;margin-top:8px;height:20px;';
      el.appendChild(msg);

      // ── Helpers ──
      function updateHud() {
        scoreEl.textContent = 'Score: ' + score;
        levelEl.textContent = 'Lv: ' + level;
        linesEl.textContent = 'Lines: ' + lines;
      }

      function randomType() {
        return PIECE_NAMES[Math.floor(Math.random() * PIECE_NAMES.length)];
      }

      function getShape(type) {
        return SHAPES[type].map(([x, y]) => [x, y]);
      }

      function rotate(shape) {
        const maxY = Math.max(...shape.map(([, y]) => y));
        return shape.map(([x, y]) => [maxY - y, x]);
      }

      function valid(shape, ox, oy) {
        return shape.every(([x, y]) => {
          const nx = ox + x, ny = oy + y;
          return nx >= 0 && nx < COLS && ny < ROWS && (ny < 0 || !board[ny][nx]);
        });
      }

      function lock() {
        current.forEach(([x, y]) => {
          const ny = currentY + y;
          if (ny >= 0 && ny < ROWS) board[ny][currentX + x] = currentType;
        });
        clearLines();
        spawn();
      }

      function clearLines() {
        let cleared = 0;
        for (let r = ROWS - 1; r >= 0; r--) {
          if (board[r].every(c => c !== null)) {
            board.splice(r, 1);
            board.unshift(Array(COLS).fill(null));
            cleared++;
            r++; // re-check same row index
          }
        }
        if (cleared) {
          score += LINE_SCORES[cleared] || cleared * 200;
          lines += cleared;
          const newLevel = Math.floor(lines / 10) + 1;
          if (newLevel !== level) {
            level = newLevel;
            dropInterval = Math.max(100, 800 - (level - 1) * 70);
            restartTimer();
          }
          updateHud();
        }
      }

      function spawn() {
        currentType = nextType || randomType();
        nextType = randomType();
        current = getShape(currentType);
        currentX = Math.floor((COLS - 4) / 2);
        currentY = -1;
        if (!valid(current, currentX, currentY)) {
          gameOver = true;
          clearInterval(timer); timer = null;
          msg.textContent = 'GAME OVER — Press R to restart';
        }
        drawPreview();
      }

      function restartTimer() {
        if (timer) clearInterval(timer);
        timer = setInterval(tick, dropInterval);
      }

      function tick() {
        if (gameOver || paused) return;
        if (valid(current, currentX, currentY + 1)) {
          currentY++;
        } else {
          lock();
        }
        draw();
      }

      // ── Drawing ──
      function draw() {
        ctx.fillStyle = '#111';
        ctx.fillRect(0, 0, BOARD_W, BOARD_H);

        // Grid lines
        ctx.strokeStyle = '#1a1a1a';
        ctx.lineWidth = 0.5;
        for (let c = 1; c < COLS; c++) {
          ctx.beginPath(); ctx.moveTo(c * CELL, 0); ctx.lineTo(c * CELL, BOARD_H); ctx.stroke();
        }
        for (let r = 1; r < ROWS; r++) {
          ctx.beginPath(); ctx.moveTo(0, r * CELL); ctx.lineTo(BOARD_W, r * CELL); ctx.stroke();
        }

        // Board
        for (let r = 0; r < ROWS; r++) {
          for (let c = 0; c < COLS; c++) {
            if (board[r][c]) {
              ctx.fillStyle = COLORS[board[r][c]];
              ctx.fillRect(c * CELL + 1, r * CELL + 1, CELL - 2, CELL - 2);
            }
          }
        }

        // Ghost piece
        if (!gameOver && current) {
          let ghostY = currentY;
          while (valid(current, currentX, ghostY + 1)) ghostY++;
          ctx.globalAlpha = 0.2;
          current.forEach(([x, y]) => {
            const dy = ghostY + y;
            if (dy >= 0) {
              ctx.fillStyle = COLORS[currentType];
              ctx.fillRect((currentX + x) * CELL + 1, dy * CELL + 1, CELL - 2, CELL - 2);
            }
          });
          ctx.globalAlpha = 1;
        }

        // Current piece
        if (!gameOver && current) {
          current.forEach(([x, y]) => {
            const dy = currentY + y;
            if (dy >= 0) {
              ctx.fillStyle = COLORS[currentType];
              ctx.fillRect((currentX + x) * CELL + 1, dy * CELL + 1, CELL - 2, CELL - 2);
            }
          });
        }
      }

      function drawPreview() {
        pctx.fillStyle = '#1a1a1a';
        pctx.fillRect(0, 0, previewCanvas.width, previewCanvas.height);
        if (!nextType) return;
        const shape = getShape(nextType);
        const minX = Math.min(...shape.map(([x]) => x));
        const maxX = Math.max(...shape.map(([x]) => x));
        const minY = Math.min(...shape.map(([, y]) => y));
        const maxY = Math.max(...shape.map(([, y]) => y));
        const pw = maxX - minX + 1, ph = maxY - minY + 1;
        const ox = Math.floor((PREVIEW_CELLS - pw) / 2) - minX;
        const oy = Math.floor((PREVIEW_CELLS - ph) / 2) - minY;
        shape.forEach(([x, y]) => {
          pctx.fillStyle = COLORS[nextType];
          pctx.fillRect((ox + x) * PREVIEW_CELL + 1, (oy + y) * PREVIEW_CELL + 1,
            PREVIEW_CELL - 2, PREVIEW_CELL - 2);
        });
      }

      // ── Input ──
      function onKey(e) {
        if (e.key === 'r' || e.key === 'R') { resetGame(); return; }
        if (gameOver || paused) return;
        switch (e.key) {
          case 'ArrowLeft':
            if (valid(current, currentX - 1, currentY)) currentX--;
            break;
          case 'ArrowRight':
            if (valid(current, currentX + 1, currentY)) currentX++;
            break;
          case 'ArrowDown':
            if (valid(current, currentX, currentY + 1)) { currentY++; score += 1; updateHud(); }
            break;
          case 'ArrowUp': {
            const rotated = rotate(current);
            if (valid(rotated, currentX, currentY)) current = rotated;
            else if (valid(rotated, currentX - 1, currentY)) { current = rotated; currentX--; }
            else if (valid(rotated, currentX + 1, currentY)) { current = rotated; currentX++; }
            else if (valid(rotated, currentX - 2, currentY)) { current = rotated; currentX -= 2; }
            else if (valid(rotated, currentX + 2, currentY)) { current = rotated; currentX += 2; }
            break;
          }
          case ' ':
            e.preventDefault();
            while (valid(current, currentX, currentY + 1)) { currentY++; score += 2; }
            lock();
            updateHud();
            break;
          default: return;
        }
        e.preventDefault();
        draw();
      }
      el.addEventListener('keydown', onKey);

      // ── Game lifecycle ──
      function resetGame() {
        board = Array.from({ length: ROWS }, () => Array(COLS).fill(null));
        score = 0; lines = 0; level = 1;
        dropInterval = 800; gameOver = false; paused = false;
        msg.textContent = '';
        nextType = null;
        updateHud();
        spawn();
        draw();
        restartTimer();
      }

      // ── Cleanup on window close ──
      const observer = new MutationObserver(() => {
        if (!el.isConnected) {
          observer.disconnect();
          if (timer) { clearInterval(timer); timer = null; }
          el.removeEventListener('keydown', onKey);
        }
      });
      observer.observe(el.parentNode || document.body, { childList: true, subtree: true });

      // ── Start ──
      updateHud();
      spawn();
      draw();
      restartTimer();
      el.focus();
    }
  });
}
