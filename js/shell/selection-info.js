// Astrion OS — Selection Info Tooltip
// When you select text anywhere, a small tooltip shows word/char count.
// Appears after 300ms of stable selection, disappears when selection clears.

let tooltip = null;
let hideTimer = null;
let showTimer = null;

export function initSelectionInfo() {
  document.addEventListener('mouseup', onSelectionChange);
  document.addEventListener('keyup', (e) => {
    if (e.shiftKey) onSelectionChange();
  });

  // Hide on any click that isn't on the tooltip
  document.addEventListener('mousedown', (e) => {
    if (tooltip && !tooltip.contains(e.target)) hide();
  });
}

function onSelectionChange() {
  clearTimeout(showTimer);
  const sel = window.getSelection();
  const text = sel?.toString();

  if (!text || text.trim().length < 2) {
    hide();
    return;
  }

  // Delay to avoid flickering during drag-select
  showTimer = setTimeout(() => {
    const current = window.getSelection()?.toString();
    if (!current || current.trim().length < 2) { hide(); return; }
    show(current);
  }, 300);
}

function show(text) {
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  const chars = text.length;
  const lines = text.split('\n').length;

  // Position near the selection
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) return;
  const range = sel.getRangeAt(0);
  const rect = range.getBoundingClientRect();
  if (!rect || (rect.width === 0 && rect.height === 0)) return;

  if (!tooltip) {
    tooltip = document.createElement('div');
    tooltip.id = 'selection-info-tooltip';
    tooltip.style.cssText = `
      position: fixed; z-index: 98000; pointer-events: none;
      padding: 4px 10px; border-radius: 8px;
      background: rgba(30, 30, 36, 0.92); backdrop-filter: blur(20px);
      -webkit-backdrop-filter: blur(20px);
      border: 1px solid rgba(255,255,255,0.1);
      font-family: var(--font); font-size: 10px; color: rgba(255,255,255,0.7);
      box-shadow: 0 4px 16px rgba(0,0,0,0.3);
      white-space: nowrap;
      animation: selInfoFade 0.12s ease;
    `;
    if (!document.getElementById('sel-info-css')) {
      const s = document.createElement('style');
      s.id = 'sel-info-css';
      s.textContent = '@keyframes selInfoFade { from { opacity:0; transform:translateY(4px); } to { opacity:1; transform:translateY(0); } }';
      document.head.appendChild(s);
    }
    document.body.appendChild(tooltip);
  }

  let info = `${words} word${words !== 1 ? 's' : ''} · ${chars} char${chars !== 1 ? 's' : ''}`;
  if (lines > 1) info += ` · ${lines} lines`;
  tooltip.textContent = info;

  // Position above the selection, centered
  const x = Math.max(8, Math.min(window.innerWidth - 200, rect.left + rect.width / 2 - 60));
  const y = Math.max(8, rect.top - 30);
  tooltip.style.left = x + 'px';
  tooltip.style.top = y + 'px';
  tooltip.style.display = 'block';

  // Auto-hide after 5 seconds
  clearTimeout(hideTimer);
  hideTimer = setTimeout(hide, 5000);
}

function hide() {
  clearTimeout(hideTimer);
  if (tooltip) {
    tooltip.style.display = 'none';
  }
}
