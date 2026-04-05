// NOVA OS — Volume / Brightness HUD
// Shows a large overlay when volume or brightness keys are pressed.

import { sounds } from '../kernel/sound.js';

let hud = null;
let hideTimer = null;
let currentVolume = 50;
let currentBrightness = 100;

export function initVolumeHud() {
  // Read initial volume/brightness from server
  fetch('/api/volume').then(r => r.json()).then(d => { currentVolume = d.level ?? 50; }).catch(() => {});
  fetch('/api/brightness').then(r => r.json()).then(d => { currentBrightness = d.level ?? 100; }).catch(() => {});

  // Hook hardware keys
  document.addEventListener('keydown', (e) => {
    // Volume keys (F10/F11/F12 or media keys)
    if (e.key === 'AudioVolumeDown' || (e.key === 'F10' && e.altKey === false)) {
      e.preventDefault();
      setVolume(Math.max(0, currentVolume - 5));
    }
    if (e.key === 'AudioVolumeUp' || (e.key === 'F12' && e.altKey === false)) {
      e.preventDefault();
      setVolume(Math.min(100, currentVolume + 5));
    }
    if (e.key === 'AudioVolumeMute' || e.key === 'F11') {
      e.preventDefault();
      muteToggle();
    }
    // Brightness keys (F1 / F2 on laptops)
    if (e.key === 'BrightnessDown' || (e.key === 'F1' && !e.metaKey && !e.ctrlKey && !e.altKey)) {
      e.preventDefault();
      setBrightness(Math.max(10, currentBrightness - 10));
    }
    if (e.key === 'BrightnessUp' || (e.key === 'F2' && !e.metaKey && !e.ctrlKey && !e.altKey)) {
      e.preventDefault();
      setBrightness(Math.min(100, currentBrightness + 10));
    }
  });
}

export async function setVolume(level) {
  currentVolume = level;
  showHud('volume', level);
  sounds.volume();
  try {
    await fetch('/api/volume', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ level }),
    });
  } catch {}
}

export async function muteToggle() {
  showHud('volume', 0, true);
  try { await fetch('/api/volume/mute', { method: 'POST' }); } catch {}
}

export async function setBrightness(level) {
  currentBrightness = level;
  showHud('brightness', level);
  try {
    await fetch('/api/brightness', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ level }),
    });
  } catch {}
}

function showHud(type, level, muted = false) {
  if (!hud) {
    hud = document.createElement('div');
    hud.id = 'volume-hud';
    hud.style.cssText = `
      position: fixed;
      bottom: 110px;
      left: 50%;
      transform: translateX(-50%);
      background: rgba(30, 30, 36, 0.85);
      backdrop-filter: blur(30px);
      -webkit-backdrop-filter: blur(30px);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 16px;
      padding: 20px 32px;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 12px;
      z-index: 99995;
      font-family: var(--font);
      color: white;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
      opacity: 0;
      transition: opacity 0.2s ease;
    `;
    document.body.appendChild(hud);
  }

  const icon = type === 'volume'
    ? (muted ? '\uD83D\uDD07' : level === 0 ? '\uD83D\uDD07' : level < 33 ? '\uD83D\uDD08' : level < 66 ? '\uD83D\uDD09' : '\uD83D\uDD0A')
    : '\u2600\uFE0F';

  hud.innerHTML = `
    <div style="font-size: 36px;">${icon}</div>
    <div style="display: flex; align-items: center; gap: 10px;">
      <div style="width: 180px; height: 6px; background: rgba(255,255,255,0.1); border-radius: 3px; overflow: hidden;">
        <div style="width: ${level}%; height: 100%; background: ${type === 'volume' ? '#ffffff' : '#ffcc00'}; border-radius: 3px; transition: width 0.15s ease;"></div>
      </div>
      <div style="font-size: 12px; color: rgba(255,255,255,0.6); font-variant-numeric: tabular-nums; min-width: 32px; text-align: right;">${Math.round(level)}%</div>
    </div>
  `;

  hud.style.opacity = '1';

  if (hideTimer) clearTimeout(hideTimer);
  hideTimer = setTimeout(() => {
    hud.style.opacity = '0';
  }, 1500);
}
