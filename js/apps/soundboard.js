// ASTRION OS — Soundboard
import { processManager } from '../kernel/process-manager.js';

export function registerSoundboard() {
  processManager.register('soundboard', {
    name: 'Soundboard',
    icon: '🔊',
    singleInstance: true,
    width: 420,
    height: 400,
    launch: (el) => initSoundboard(el)
  });
}

function initSoundboard(container) {
  // Web Audio API synthesized sounds
  let audioCtx = null;

  function getCtx() {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    return audioCtx;
  }

  const SOUNDS = [
    { name: 'Ding', emoji: '🔔', fn: () => playTone(880, 0.3, 'sine') },
    { name: 'Buzz', emoji: '📳', fn: () => playTone(150, 0.4, 'sawtooth') },
    { name: 'Boop', emoji: '🫧', fn: () => { playTone(600, 0.1, 'sine'); setTimeout(() => playTone(400, 0.15, 'sine'), 100); } },
    { name: 'Laser', emoji: '⚡', fn: () => playSweep(1200, 200, 0.3) },
    { name: 'Pop', emoji: '💥', fn: () => playNoise(0.08) },
    { name: 'Coin', emoji: '🪙', fn: () => { playTone(988, 0.08, 'square'); setTimeout(() => playTone(1319, 0.15, 'square'), 80); } },
    { name: 'Horn', emoji: '📯', fn: () => playTone(220, 0.5, 'sawtooth') },
    { name: 'Chime', emoji: '🎐', fn: () => { [523,659,784].forEach((f,i) => setTimeout(() => playTone(f, 0.2, 'sine'), i*120)); } },
    { name: 'Error', emoji: '❌', fn: () => { playTone(200, 0.15, 'square'); setTimeout(() => playTone(150, 0.2, 'square'), 150); } },
    { name: 'Win', emoji: '🏆', fn: () => { [523,659,784,1047].forEach((f,i) => setTimeout(() => playTone(f, 0.15, 'sine'), i*100)); } },
    { name: 'Whoosh', emoji: '💨', fn: () => playSweep(200, 2000, 0.2) },
    { name: 'Click', emoji: '🖱️', fn: () => playTone(1000, 0.03, 'square') },
    { name: 'Alarm', emoji: '🚨', fn: () => { for(let i=0;i<4;i++) setTimeout(() => playTone(i%2?800:600, 0.12, 'square'), i*150); } },
    { name: 'UFO', emoji: '🛸', fn: () => playSweep(400, 800, 0.5, 'sine', true) },
    { name: 'Drum', emoji: '🥁', fn: () => { playNoise(0.05); playTone(100, 0.1, 'sine'); } },
    { name: 'Beep', emoji: '📟', fn: () => playTone(1000, 0.15, 'square') },
  ];

  function playTone(freq, dur, type) {
    const ctx = getCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
    osc.connect(gain).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + dur);
  }

  function playSweep(startFreq, endFreq, dur, type = 'sine', vibrato = false) {
    const ctx = getCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(startFreq, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(endFreq, ctx.currentTime + dur);
    if (vibrato) {
      const lfo = ctx.createOscillator();
      const lfoGain = ctx.createGain();
      lfo.frequency.value = 8;
      lfoGain.gain.value = 50;
      lfo.connect(lfoGain).connect(osc.frequency);
      lfo.start(); lfo.stop(ctx.currentTime + dur);
    }
    gain.gain.setValueAtTime(0.25, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
    osc.connect(gain).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + dur);
  }

  function playNoise(dur) {
    const ctx = getCtx();
    const bufferSize = ctx.sampleRate * dur;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
    const source = ctx.createBufferSource();
    const gain = ctx.createGain();
    source.buffer = buffer;
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
    source.connect(gain).connect(ctx.destination);
    source.start();
  }

  const accent = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() || '#007aff';
  container.innerHTML = `
    <div style="display:flex;flex-direction:column;height:100%;background:#1a1a2e;color:white;font-family:var(--font,system-ui);padding:16px;">
      <div style="text-align:center;font-size:14px;font-weight:600;margin-bottom:12px;">🔊 Soundboard</div>
      <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px;flex:1;align-content:start;">
        ${SOUNDS.map((s, i) => `
          <button class="sb-btn" data-idx="${i}" style="
            display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px;
            padding:12px 4px;border-radius:12px;border:none;cursor:pointer;
            background:rgba(255,255,255,0.04);color:white;transition:transform 0.1s, background 0.15s;
          ">
            <span style="font-size:24px;">${s.emoji}</span>
            <span style="font-size:10px;color:rgba(255,255,255,0.5);">${s.name}</span>
          </button>
        `).join('')}
      </div>
    </div>
  `;

  container.querySelectorAll('.sb-btn').forEach(el => {
    el.addEventListener('mouseenter', () => el.style.background = 'rgba(255,255,255,0.08)');
    el.addEventListener('mouseleave', () => { el.style.background = 'rgba(255,255,255,0.04)'; el.style.transform = 'scale(1)'; });
    el.addEventListener('mousedown', () => el.style.transform = 'scale(0.92)');
    el.addEventListener('mouseup', () => el.style.transform = 'scale(1)');
    el.addEventListener('click', () => {
      SOUNDS[+el.dataset.idx].fn();
    });
  });

  const obs = new MutationObserver(() => {
    if (!container.isConnected) { if (audioCtx) audioCtx.close(); obs.disconnect(); }
  });
  if (container.parentElement) obs.observe(container.parentElement, { childList: true, subtree: true });
}
