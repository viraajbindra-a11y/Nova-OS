// Astrion OS — Pixel Art

import { processManager } from '../kernel/process-manager.js';

export function registerPixelArt() {
  processManager.register('pixel-art', {
    name: 'Pixel Art',
    icon: '\uD83D\uDDBC\uFE0F',
    singleInstance: true,
    width: 580,
    height: 620,
    launch: (contentEl) => initPixelArt(contentEl),
  });
}

function initPixelArt(container) {
  const GRID = 16;
  const CELL = 24;
  const SIZE = GRID * CELL;

  const PALETTE = [
    '#000000', '#ffffff', '#ff0000', '#ff8800',
    '#ffff00', '#00cc00', '#00cccc', '#0000ff',
    '#8800ff', '#ff66cc', '#884400', '#888888',
    '#444444', '#88ff00', '#000066', '#ff00ff',
  ];

  let currentColor = PALETTE[0];
  let tool = 'pencil'; // pencil | eraser | fill
  let showGrid = true;
  let painting = false;

  // Grid data — null = transparent (bg color)
  const pixels = Array.from({ length: GRID }, () => Array(GRID).fill(null));

  // ── Build UI ──
  container.innerHTML = '';
  const wrap = document.createElement('div');
  wrap.style.cssText = 'display:flex;flex-direction:column;height:100%;font-family:var(--font);color:white;background:#1a1a22;padding:12px;gap:10px;user-select:none;';
  container.appendChild(wrap);

  // Toolbar
  const toolbar = document.createElement('div');
  toolbar.style.cssText = 'display:flex;align-items:center;gap:8px;flex-wrap:wrap;';
  wrap.appendChild(toolbar);

  function mkBtn(label, title, active) {
    const b = document.createElement('button');
    b.textContent = label;
    b.title = title;
    b.style.cssText = `padding:5px 10px;border-radius:6px;border:2px solid ${active ? 'var(--accent,#007aff)' : 'transparent'};background:rgba(255,255,255,0.08);color:white;font-size:13px;cursor:pointer;font-family:var(--font);`;
    return b;
  }

  const btnPencil = mkBtn('\u270F\uFE0F', 'Pencil', true);
  const btnEraser = mkBtn('\uD83E\uDDF9', 'Eraser', false);
  const btnFill   = mkBtn('\uD83E\uDEA3', 'Fill Bucket', false);
  const btnGrid   = mkBtn('\u2B1C', 'Toggle Grid', false);
  const btnClear  = mkBtn('\uD83D\uDDD1\uFE0F', 'Clear All', false);
  const btnExport = mkBtn('\uD83D\uDCBE', 'Export PNG', false);

  [btnPencil, btnEraser, btnFill, btnGrid, btnClear, btnExport].forEach(b => toolbar.appendChild(b));

  // Current color indicator
  const colorInd = document.createElement('div');
  colorInd.style.cssText = `width:24px;height:24px;border-radius:4px;border:2px solid rgba(255,255,255,0.4);margin-left:auto;background:${currentColor};`;
  toolbar.appendChild(colorInd);

  function updateToolBtns() {
    [btnPencil, btnEraser, btnFill].forEach(b => { b.style.borderColor = 'transparent'; });
    if (tool === 'pencil') btnPencil.style.borderColor = 'var(--accent,#007aff)';
    if (tool === 'eraser') btnEraser.style.borderColor = 'var(--accent,#007aff)';
    if (tool === 'fill')   btnFill.style.borderColor = 'var(--accent,#007aff)';
  }

  btnPencil.onclick = () => { tool = 'pencil'; updateToolBtns(); };
  btnEraser.onclick = () => { tool = 'eraser'; updateToolBtns(); };
  btnFill.onclick   = () => { tool = 'fill';   updateToolBtns(); };
  btnGrid.onclick   = () => { showGrid = !showGrid; draw(); };
  btnClear.onclick  = () => { for (let r = 0; r < GRID; r++) for (let c = 0; c < GRID; c++) pixels[r][c] = null; draw(); };
  btnExport.onclick = exportPNG;

  // Palette
  const palRow = document.createElement('div');
  palRow.style.cssText = 'display:flex;gap:4px;flex-wrap:wrap;';
  wrap.appendChild(palRow);

  PALETTE.forEach(col => {
    const sw = document.createElement('div');
    sw.style.cssText = `width:24px;height:24px;border-radius:4px;cursor:pointer;background:${col};border:2px solid ${col === currentColor ? 'white' : 'rgba(255,255,255,0.15)'};`;
    sw.onclick = () => {
      currentColor = col;
      colorInd.style.background = col;
      palRow.querySelectorAll('div').forEach(d => { d.style.borderColor = 'rgba(255,255,255,0.15)'; });
      sw.style.borderColor = 'white';
      if (tool === 'eraser') { tool = 'pencil'; updateToolBtns(); }
    };
    palRow.appendChild(sw);
  });

  // Canvas
  const canvasWrap = document.createElement('div');
  canvasWrap.style.cssText = 'flex:1;display:flex;align-items:center;justify-content:center;';
  wrap.appendChild(canvasWrap);

  const canvas = document.createElement('canvas');
  canvas.width = SIZE;
  canvas.height = SIZE;
  canvas.style.cssText = 'border-radius:4px;cursor:crosshair;image-rendering:pixelated;';
  canvasWrap.appendChild(canvas);
  const ctx = canvas.getContext('2d');

  // ── Drawing ──
  function draw() {
    ctx.clearRect(0, 0, SIZE, SIZE);
    // Background (checkerboard for transparency)
    for (let r = 0; r < GRID; r++) {
      for (let c = 0; c < GRID; c++) {
        const x = c * CELL, y = r * CELL;
        // checkerboard bg
        ctx.fillStyle = (r + c) % 2 === 0 ? '#2a2a34' : '#222230';
        ctx.fillRect(x, y, CELL, CELL);
        // pixel color
        if (pixels[r][c]) {
          ctx.fillStyle = pixels[r][c];
          ctx.fillRect(x, y, CELL, CELL);
        }
      }
    }
    // Grid lines
    if (showGrid) {
      ctx.strokeStyle = 'rgba(255,255,255,0.08)';
      ctx.lineWidth = 1;
      for (let i = 0; i <= GRID; i++) {
        ctx.beginPath(); ctx.moveTo(i * CELL, 0); ctx.lineTo(i * CELL, SIZE); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(0, i * CELL); ctx.lineTo(SIZE, i * CELL); ctx.stroke();
      }
    }
  }

  function cellAt(e) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = SIZE / rect.width;
    const scaleY = SIZE / rect.height;
    const c = Math.floor((e.clientX - rect.left) * scaleX / CELL);
    const r = Math.floor((e.clientY - rect.top) * scaleY / CELL);
    if (r < 0 || r >= GRID || c < 0 || c >= GRID) return null;
    return { r, c };
  }

  function paint(e) {
    const cell = cellAt(e);
    if (!cell) return;
    if (tool === 'pencil') {
      pixels[cell.r][cell.c] = currentColor;
    } else if (tool === 'eraser') {
      pixels[cell.r][cell.c] = null;
    } else if (tool === 'fill') {
      floodFill(cell.r, cell.c, currentColor);
    }
    draw();
  }

  canvas.addEventListener('mousedown', (e) => {
    e.preventDefault();
    if (e.button === 2) {
      // right click = erase
      const cell = cellAt(e);
      if (cell) { pixels[cell.r][cell.c] = null; draw(); }
      return;
    }
    painting = true;
    paint(e);
  });

  canvas.addEventListener('mousemove', (e) => {
    if (!painting) return;
    if (tool === 'fill') return; // don't flood fill on drag
    paint(e);
  });

  canvas.addEventListener('mouseup', () => { painting = false; });
  canvas.addEventListener('mouseleave', () => { painting = false; });
  canvas.addEventListener('contextmenu', (e) => e.preventDefault());

  // ── Flood Fill ──
  function floodFill(startR, startC, fillColor) {
    const target = pixels[startR][startC];
    if (target === fillColor) return;
    const stack = [[startR, startC]];
    const visited = new Set();
    while (stack.length) {
      const [r, c] = stack.pop();
      const key = r * GRID + c;
      if (visited.has(key)) continue;
      if (r < 0 || r >= GRID || c < 0 || c >= GRID) continue;
      if (pixels[r][c] !== target) continue;
      visited.add(key);
      pixels[r][c] = fillColor;
      stack.push([r - 1, c], [r + 1, c], [r, c - 1], [r, c + 1]);
    }
  }

  // ── Export PNG ──
  function exportPNG() {
    const exp = document.createElement('canvas');
    exp.width = GRID;
    exp.height = GRID;
    const ectx = exp.getContext('2d');
    for (let r = 0; r < GRID; r++) {
      for (let c = 0; c < GRID; c++) {
        if (pixels[r][c]) {
          ectx.fillStyle = pixels[r][c];
          ectx.fillRect(c, r, 1, 1);
        }
        // transparent pixels stay transparent (canvas default)
      }
    }
    const link = document.createElement('a');
    link.download = 'pixel-art.png';
    link.href = exp.toDataURL('image/png');
    link.click();
  }

  // Initial draw
  draw();
}
