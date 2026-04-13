// Astrion OS — Beat Studio (free music production)
// Drum machine + step sequencer using Web Audio API.

import { processManager } from '../kernel/process-manager.js';

export function registerBeatStudio() {
  processManager.register('beat-studio', {
    name: 'Beat Studio',
    icon: '\uD83C\uDFB9',
    singleInstance: true,
    width: 820,
    height: 520,
    launch: (contentEl) => initBeatStudio(contentEl),
  });
}

function initBeatStudio(container) {
  let ctx = null;
  let playing = false;
  let bpm = 120;
  let step = 0;
  let interval = null;
  const STEPS = 16;
  const TRACKS = [
    { name: 'Kick',    freq: 60,  type: 'kick',   color: '#ff3b30', pattern: Array(STEPS).fill(false) },
    { name: 'Snare',   freq: 200, type: 'snare',  color: '#ff9500', pattern: Array(STEPS).fill(false) },
    { name: 'Hi-Hat',  freq: 800, type: 'hihat',  color: '#ffd60a', pattern: Array(STEPS).fill(false) },
    { name: 'Clap',    freq: 300, type: 'clap',   color: '#34c759', pattern: Array(STEPS).fill(false) },
    { name: 'Tom',     freq: 120, type: 'tom',    color: '#007aff', pattern: Array(STEPS).fill(false) },
    { name: 'Rim',     freq: 500, type: 'rim',    color: '#5856d6', pattern: Array(STEPS).fill(false) },
    { name: 'Crash',   freq: 1200,type: 'crash',  color: '#ff2d55', pattern: Array(STEPS).fill(false) },
    { name: 'Perc',    freq: 400, type: 'perc',   color: '#af52de', pattern: Array(STEPS).fill(false) },
  ];

  // Default beat
  TRACKS[0].pattern = [true,false,false,false, true,false,false,false, true,false,false,false, true,false,false,false];
  TRACKS[1].pattern = [false,false,false,false, true,false,false,false, false,false,false,false, true,false,false,false];
  TRACKS[2].pattern = [true,false,true,false, true,false,true,false, true,false,true,false, true,false,true,false];

  function ensureAudio() {
    if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
    if (ctx.state === 'suspended') ctx.resume();
  }

  function playSound(track) {
    ensureAudio();
    const t = ctx.currentTime;

    if (track.type === 'kick') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(150, t);
      osc.frequency.exponentialRampToValueAtTime(30, t + 0.15);
      gain.gain.setValueAtTime(1, t);
      gain.gain.exponentialRampToValueAtTime(0.01, t + 0.3);
      osc.connect(gain); gain.connect(ctx.destination);
      osc.start(t); osc.stop(t + 0.3);
    } else if (track.type === 'snare') {
      const noise = ctx.createBufferSource();
      const buf = ctx.createBuffer(1, ctx.sampleRate * 0.15, ctx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
      noise.buffer = buf;
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.8, t);
      gain.gain.exponentialRampToValueAtTime(0.01, t + 0.15);
      noise.connect(gain); gain.connect(ctx.destination);
      noise.start(t);
    } else if (track.type === 'hihat') {
      const noise = ctx.createBufferSource();
      const buf = ctx.createBuffer(1, ctx.sampleRate * 0.05, ctx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
      noise.buffer = buf;
      const hp = ctx.createBiquadFilter();
      hp.type = 'highpass'; hp.frequency.value = 7000;
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.3, t);
      gain.gain.exponentialRampToValueAtTime(0.01, t + 0.05);
      noise.connect(hp); hp.connect(gain); gain.connect(ctx.destination);
      noise.start(t);
    } else {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = track.type === 'clap' ? 'triangle' : track.type === 'crash' ? 'sawtooth' : 'square';
      osc.frequency.setValueAtTime(track.freq, t);
      osc.frequency.exponentialRampToValueAtTime(track.freq * 0.5, t + 0.1);
      gain.gain.setValueAtTime(0.4, t);
      gain.gain.exponentialRampToValueAtTime(0.01, t + 0.12);
      osc.connect(gain); gain.connect(ctx.destination);
      osc.start(t); osc.stop(t + 0.15);
    }
  }

  function render() {
    container.innerHTML = `
      <div style="display:flex; flex-direction:column; height:100%; font-family:var(--font); color:white; background:#12121a;">
        <div style="padding:10px 16px; display:flex; align-items:center; gap:12px; border-bottom:1px solid rgba(255,255,255,0.06);">
          <button id="bs-play" style="width:36px;height:36px;border-radius:50%;border:none;background:${playing?'#ff3b30':'#34c759'};color:white;font-size:16px;cursor:pointer;">${playing ? '\u23F9' : '\u25B6'}</button>
          <div style="font-size:14px;font-weight:600;">Beat Studio</div>
          <div style="flex:1;"></div>
          <span style="font-size:11px;color:rgba(255,255,255,0.5);">BPM</span>
          <input type="range" id="bs-bpm" min="60" max="200" value="${bpm}" style="width:100px;">
          <span id="bs-bpm-val" style="font-size:13px;font-weight:600;min-width:30px;">${bpm}</span>
          <button id="bs-clear" style="padding:4px 12px;border-radius:6px;border:none;background:rgba(255,255,255,0.08);color:white;font-size:11px;cursor:pointer;font-family:var(--font);">Clear</button>
        </div>

        <div style="flex:1;overflow-y:auto;padding:8px;">
          ${TRACKS.map((tr, ti) => `
            <div style="display:flex;align-items:center;gap:4px;margin-bottom:2px;">
              <div style="width:60px;font-size:10px;font-weight:600;color:${tr.color};text-align:right;padding-right:8px;flex-shrink:0;">${tr.name}</div>
              ${tr.pattern.map((on, si) => `
                <div class="bs-pad" data-t="${ti}" data-s="${si}" style="
                  width:40px;height:32px;border-radius:4px;cursor:pointer;
                  background:${on ? tr.color : (si % 4 === 0 ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.03)')};
                  opacity:${on ? 1 : 0.6};
                  border:1px solid ${si === step && playing ? 'white' : 'transparent'};
                  transition: background 0.05s;
                "></div>
              `).join('')}
            </div>
          `).join('')}
        </div>

        <div style="padding:6px 16px;border-top:1px solid rgba(255,255,255,0.06);display:flex;gap:4px;">
          ${Array(STEPS).fill(0).map((_, i) => `
            <div style="flex:1;height:4px;border-radius:2px;background:${i === step && playing ? '#007aff' : 'rgba(255,255,255,0.06)'};"></div>
          `).join('')}
        </div>
      </div>
    `;

    // Pad clicks
    container.querySelectorAll('.bs-pad').forEach(pad => {
      pad.addEventListener('click', () => {
        const ti = parseInt(pad.dataset.t), si = parseInt(pad.dataset.s);
        TRACKS[ti].pattern[si] = !TRACKS[ti].pattern[si];
        if (TRACKS[ti].pattern[si]) playSound(TRACKS[ti]);
        render();
      });
    });

    // Play/stop
    container.querySelector('#bs-play').addEventListener('click', () => {
      if (playing) stop(); else play();
    });

    // BPM
    container.querySelector('#bs-bpm').addEventListener('input', (e) => {
      bpm = parseInt(e.target.value);
      container.querySelector('#bs-bpm-val').textContent = bpm;
      if (playing) { stop(); play(); }
    });

    // Clear
    container.querySelector('#bs-clear').addEventListener('click', () => {
      TRACKS.forEach(t => t.pattern.fill(false));
      render();
    });
  }

  function play() {
    ensureAudio();
    playing = true;
    step = 0;
    const stepTime = () => (60 / bpm / 4) * 1000;
    interval = setInterval(() => {
      TRACKS.forEach(tr => { if (tr.pattern[step]) playSound(tr); });
      step = (step + 1) % STEPS;
      render();
    }, stepTime());
    render();
  }

  function stop() {
    playing = false;
    if (interval) clearInterval(interval);
    interval = null;
    render();
  }

  render();

  // Cleanup on window close
  const _obs = new MutationObserver(() => {
    if (!container.isConnected) {
      stop();
      if (ctx) { ctx.close().catch(() => {}); ctx = null; }
      _obs.disconnect();
    }
  });
  if (container.parentElement) _obs.observe(container.parentElement, { childList: true, subtree: true });
}
