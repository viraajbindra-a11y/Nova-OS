// NOVA OS — Draw App (Canvas Painting)

import { processManager } from '../kernel/process-manager.js';

export function registerDraw() {
  processManager.register('draw', {
    name: 'Draw',
    icon: '\uD83C\uDFA8',
    iconClass: 'dock-icon-draw',
    singleInstance: false,
    width: 700,
    height: 520,
    launch: (contentEl, instanceId) => {
      initDraw(contentEl, instanceId);
    }
  });
}

function initDraw(container, instanceId) {
  const canvasWidth = 600;
  const canvasHeight = 400;
  let currentTool = 'brush';
  let currentColor = '#ffffff';
  let brushSize = 4;
  let isDrawing = false;
  let lastX = 0;
  let lastY = 0;
  let undoStack = [];
  let redoStack = [];

  const colors = [
    '#ffffff', '#000000', '#ff3b30', '#ff9500', '#ffcc00',
    '#34c759', '#007aff', '#5856d6', '#af52de', '#ff2d55',
    '#8e8e93', '#48484a',
  ];

  container.innerHTML = `
    <div class="draw-app">
      <div class="draw-toolbar">
        <button class="draw-tool-btn active" data-tool="brush" title="Brush">\u270F\uFE0F Brush</button>
        <button class="draw-tool-btn" data-tool="eraser" title="Eraser">\uD83E\uDDF9 Eraser</button>
        <button class="draw-tool-btn" data-tool="line" title="Line">\u2571 Line</button>
        <button class="draw-tool-btn" data-tool="rect" title="Rectangle">\u25A1 Rect</button>
        <button class="draw-tool-btn" data-tool="circle" title="Circle">\u25CB Circle</button>
        <button class="draw-tool-btn" data-tool="fill" title="Fill">\uD83E\uDEE3 Fill</button>
        <div class="draw-separator"></div>
        <div class="draw-color-picker">
          ${colors.map(c => `<div class="draw-color-swatch${c === currentColor ? ' active' : ''}" data-color="${c}" style="background:${c}"></div>`).join('')}
        </div>
        <div class="draw-separator"></div>
        <span class="draw-size-label">${brushSize}px</span>
        <input type="range" class="draw-size-slider" min="1" max="32" value="${brushSize}">
        <div class="draw-separator"></div>
        <button class="draw-tool-btn" data-action="undo" title="Undo">\u21A9 Undo</button>
        <button class="draw-tool-btn" data-action="redo" title="Redo">\u21AA Redo</button>
        <button class="draw-tool-btn" data-action="clear" title="Clear">\uD83D\uDDD1 Clear</button>
      </div>
      <div class="draw-canvas-wrap">
        <canvas class="draw-canvas" id="draw-canvas-${instanceId}" width="${canvasWidth}" height="${canvasHeight}"></canvas>
      </div>
      <div class="draw-statusbar">
        <span id="draw-pos-${instanceId}">0, 0</span>
        <span>${canvasWidth} x ${canvasHeight}</span>
      </div>
    </div>
  `;

  const canvas = container.querySelector(`#draw-canvas-${instanceId}`);
  const ctx = canvas.getContext('2d');
  const posEl = container.querySelector(`#draw-pos-${instanceId}`);
  const sizeSlider = container.querySelector('.draw-size-slider');
  const sizeLabel = container.querySelector('.draw-size-label');

  // White background
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);
  saveState();

  // Tool selection
  container.querySelector('.draw-toolbar').addEventListener('click', (e) => {
    const btn = e.target.closest('.draw-tool-btn');
    if (!btn) return;

    const tool = btn.dataset.tool;
    const action = btn.dataset.action;

    if (tool) {
      currentTool = tool;
      container.querySelectorAll('[data-tool]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      canvas.style.cursor = tool === 'fill' ? 'cell' : 'crosshair';
    }

    if (action === 'undo') undo();
    if (action === 'redo') redo();
    if (action === 'clear') {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvasWidth, canvasHeight);
      saveState();
    }
  });

  // Color selection
  container.querySelectorAll('.draw-color-swatch').forEach(swatch => {
    swatch.addEventListener('click', () => {
      currentColor = swatch.dataset.color;
      container.querySelectorAll('.draw-color-swatch').forEach(s => s.classList.remove('active'));
      swatch.classList.add('active');
    });
  });

  // Size slider
  sizeSlider.addEventListener('input', () => {
    brushSize = parseInt(sizeSlider.value);
    sizeLabel.textContent = brushSize + 'px';
  });

  // Drawing
  let shapeStart = null;
  let tempImageData = null;

  canvas.addEventListener('pointerdown', (e) => {
    isDrawing = true;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvasWidth / rect.width;
    const scaleY = canvasHeight / rect.height;
    lastX = (e.clientX - rect.left) * scaleX;
    lastY = (e.clientY - rect.top) * scaleY;

    if (currentTool === 'fill') {
      floodFill(Math.round(lastX), Math.round(lastY), currentColor);
      saveState();
      isDrawing = false;
      return;
    }

    if (['line', 'rect', 'circle'].includes(currentTool)) {
      shapeStart = { x: lastX, y: lastY };
      tempImageData = ctx.getImageData(0, 0, canvasWidth, canvasHeight);
    }

    canvas.setPointerCapture(e.pointerId);
  });

  canvas.addEventListener('pointermove', (e) => {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvasWidth / rect.width;
    const scaleY = canvasHeight / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    posEl.textContent = `${Math.round(x)}, ${Math.round(y)}`;

    if (!isDrawing) return;

    if (currentTool === 'brush' || currentTool === 'eraser') {
      ctx.beginPath();
      ctx.moveTo(lastX, lastY);
      ctx.lineTo(x, y);
      ctx.strokeStyle = currentTool === 'eraser' ? '#ffffff' : currentColor;
      ctx.lineWidth = brushSize;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.stroke();
      lastX = x;
      lastY = y;
    } else if (shapeStart && tempImageData) {
      ctx.putImageData(tempImageData, 0, 0);
      ctx.beginPath();
      ctx.strokeStyle = currentColor;
      ctx.lineWidth = brushSize;
      ctx.lineCap = 'round';

      if (currentTool === 'line') {
        ctx.moveTo(shapeStart.x, shapeStart.y);
        ctx.lineTo(x, y);
        ctx.stroke();
      } else if (currentTool === 'rect') {
        ctx.strokeRect(shapeStart.x, shapeStart.y, x - shapeStart.x, y - shapeStart.y);
      } else if (currentTool === 'circle') {
        const rx = Math.abs(x - shapeStart.x) / 2;
        const ry = Math.abs(y - shapeStart.y) / 2;
        const cx = shapeStart.x + (x - shapeStart.x) / 2;
        const cy = shapeStart.y + (y - shapeStart.y) / 2;
        ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
        ctx.stroke();
      }
    }
  });

  canvas.addEventListener('pointerup', () => {
    if (isDrawing) {
      saveState();
    }
    isDrawing = false;
    shapeStart = null;
    tempImageData = null;
  });

  function saveState() {
    undoStack.push(ctx.getImageData(0, 0, canvasWidth, canvasHeight));
    if (undoStack.length > 30) undoStack.shift();
    redoStack = [];
  }

  function undo() {
    if (undoStack.length <= 1) return;
    redoStack.push(undoStack.pop());
    ctx.putImageData(undoStack[undoStack.length - 1], 0, 0);
  }

  function redo() {
    if (redoStack.length === 0) return;
    const state = redoStack.pop();
    undoStack.push(state);
    ctx.putImageData(state, 0, 0);
  }

  function floodFill(startX, startY, fillColor) {
    const imageData = ctx.getImageData(0, 0, canvasWidth, canvasHeight);
    const data = imageData.data;
    const targetColor = getPixel(data, startX, startY);
    const fill = hexToRgb(fillColor);
    if (targetColor[0] === fill[0] && targetColor[1] === fill[1] && targetColor[2] === fill[2]) return;

    const stack = [[startX, startY]];
    const visited = new Set();

    while (stack.length > 0) {
      const [x, y] = stack.pop();
      if (x < 0 || x >= canvasWidth || y < 0 || y >= canvasHeight) continue;
      const key = y * canvasWidth + x;
      if (visited.has(key)) continue;

      const current = getPixel(data, x, y);
      if (Math.abs(current[0] - targetColor[0]) > 30 ||
          Math.abs(current[1] - targetColor[1]) > 30 ||
          Math.abs(current[2] - targetColor[2]) > 30) continue;

      visited.add(key);
      setPixel(data, x, y, fill);
      stack.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
    }

    ctx.putImageData(imageData, 0, 0);
  }

  function getPixel(data, x, y) {
    const i = (y * canvasWidth + x) * 4;
    return [data[i], data[i + 1], data[i + 2]];
  }

  function setPixel(data, x, y, color) {
    const i = (y * canvasWidth + x) * 4;
    data[i] = color[0];
    data[i + 1] = color[1];
    data[i + 2] = color[2];
    data[i + 3] = 255;
  }

  function hexToRgb(hex) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return [r, g, b];
  }
}
