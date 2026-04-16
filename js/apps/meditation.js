// ASTRION OS — Meditation Timer
import { processManager } from '../kernel/process-manager.js';

export function registerMeditation() {
  processManager.register('meditation', {
    name: 'Meditation',
    icon: '🧘',
    singleInstance: true,
    width: 380,
    height: 480,
    launch: (el) => initMeditation(el)
  });
}

function initMeditation(container) {
  const PRESETS = [
    { name: 'Quick Calm', mins: 3, color: '#38bdf8', desc: 'A brief moment of peace' },
    { name: 'Morning Focus', mins: 5, color: '#818cf8', desc: 'Start your day centered' },
    { name: 'Deep Breath', mins: 10, color: '#a78bfa', desc: 'Full relaxation session' },
    { name: 'Zen Flow', mins: 15, color: '#c084fc', desc: 'Extended mindfulness' },
    { name: 'Custom', mins: 0, color: '#6366f1', desc: 'Set your own duration' },
  ];

  let state = 'choose'; // choose, breathing, meditating, done
  let duration = 0; // seconds
  let remaining = 0;
  let timer = null;
  let breathPhase = 'in'; // in, hold, out
  let breathTimer = null;
  let sessionsToday = 0;
  try { const d = JSON.parse(localStorage.getItem('nova-meditation')); if (d?.date === new Date().toDateString()) sessionsToday = d.count; } catch {}

  function saveSessions() {
    try { localStorage.setItem('nova-meditation', JSON.stringify({ date: new Date().toDateString(), count: sessionsToday })); } catch {}
  }

  function render() {
    const accent = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() || '#007aff';

    if (state === 'choose') {
      container.innerHTML = `
        <div style="display:flex;flex-direction:column;height:100%;background:linear-gradient(180deg,#0f0f23,#1a1a3e);color:white;font-family:var(--font,system-ui);padding:20px;">
          <div style="text-align:center;margin-bottom:4px;font-size:28px;">🧘</div>
          <div style="text-align:center;font-size:16px;font-weight:600;margin-bottom:4px;">Meditation</div>
          <div style="text-align:center;font-size:11px;color:rgba(255,255,255,0.4);margin-bottom:16px;">Sessions today: ${sessionsToday}</div>
          <div style="display:flex;flex-direction:column;gap:8px;flex:1;">
            ${PRESETS.map((p, i) => `
              <div class="med-preset" data-idx="${i}" style="
                display:flex;align-items:center;gap:12px;padding:14px 16px;border-radius:14px;
                background:rgba(255,255,255,0.04);cursor:pointer;transition:background 0.15s;
              ">
                <div style="width:36px;height:36px;border-radius:10px;background:${p.color}20;display:flex;align-items:center;justify-content:center;">
                  <div style="width:12px;height:12px;border-radius:50%;background:${p.color};"></div>
                </div>
                <div style="flex:1;">
                  <div style="font-weight:600;font-size:13px;">${p.name}</div>
                  <div style="font-size:11px;color:rgba(255,255,255,0.4);">${p.desc}</div>
                </div>
                <div style="font-size:12px;color:rgba(255,255,255,0.3);">${p.mins ? p.mins + ' min' : '⏱'}</div>
              </div>
            `).join('')}
          </div>
        </div>
      `;

      container.querySelectorAll('.med-preset').forEach(el => {
        el.addEventListener('mouseenter', () => el.style.background = 'rgba(255,255,255,0.08)');
        el.addEventListener('mouseleave', () => el.style.background = 'rgba(255,255,255,0.04)');
        el.addEventListener('click', () => {
          const idx = +el.dataset.idx;
          const preset = PRESETS[idx];
          if (preset.mins === 0) {
            // Inline input instead of prompt (blocked in WebKitGTK)
            const inp = document.createElement('div');
            inp.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.6);display:flex;align-items:center;justify-content:center;z-index:999;';
            inp.innerHTML = '<div style="background:#1e1e2e;padding:24px;border-radius:16px;text-align:center;"><div style="color:white;margin-bottom:12px;font-size:14px;">Enter minutes (1-60):</div><input type="number" value="7" min="1" max="60" style="width:80px;padding:8px;border-radius:8px;border:1px solid rgba(255,255,255,0.2);background:#2a2a3a;color:white;font-size:18px;text-align:center;outline:none;"><div style="display:flex;gap:8px;margin-top:12px;justify-content:center;"><button class="med-ok" style="padding:8px 20px;border-radius:8px;border:none;background:#6366f1;color:white;cursor:pointer;">Start</button><button class="med-cancel" style="padding:8px 20px;border-radius:8px;border:none;background:rgba(255,255,255,0.1);color:white;cursor:pointer;">Cancel</button></div></div>';
            container.appendChild(inp);
            inp.querySelector('input').focus();
            inp.querySelector('.med-ok').onclick = () => { duration = Math.max(1, Math.min(60, parseInt(inp.querySelector('input').value) || 5)) * 60; inp.remove(); remaining = duration; state = 'breathing'; startBreathing(); render(); };
            inp.querySelector('.med-cancel').onclick = () => inp.remove();
            inp.querySelector('input').onkeydown = (e) => { if (e.key === 'Enter') inp.querySelector('.med-ok').click(); };
            return;
          } else {
            duration = preset.mins * 60;
          }
          remaining = duration;
          state = 'breathing';
          startBreathing();
          render();
        });
      });
      return;
    }

    if (state === 'breathing') {
      const messages = { in: 'Breathe In...', hold: 'Hold...', out: 'Breathe Out...' };
      const scale = { in: 1.4, hold: 1.4, out: 1 };
      container.innerHTML = `
        <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;
          background:linear-gradient(180deg,#0f0f23,#1a1a3e);color:white;font-family:var(--font,system-ui);padding:20px;">
          <div style="font-size:14px;color:rgba(255,255,255,0.5);margin-bottom:30px;">Prepare yourself</div>
          <div style="width:120px;height:120px;border-radius:50%;background:radial-gradient(circle,rgba(99,102,241,0.3),transparent);
            display:flex;align-items:center;justify-content:center;transition:transform 4s ease-in-out;
            transform:scale(${scale[breathPhase]});">
            <div style="width:60px;height:60px;border-radius:50%;background:rgba(99,102,241,0.4);
              display:flex;align-items:center;justify-content:center;transition:transform 4s ease-in-out;
              transform:scale(${scale[breathPhase]});">
              <div style="width:20px;height:20px;border-radius:50%;background:#6366f1;"></div>
            </div>
          </div>
          <div style="font-size:18px;font-weight:500;margin-top:30px;">${messages[breathPhase]}</div>
          <div style="font-size:12px;color:rgba(255,255,255,0.3);margin-top:16px;">Starting meditation in a moment...</div>
        </div>
      `;
      return;
    }

    if (state === 'meditating') {
      const mins = Math.floor(remaining / 60);
      const secs = remaining % 60;
      const pct = 1 - (remaining / duration);
      container.innerHTML = `
        <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;
          background:linear-gradient(180deg,#0f0f23,#1a1a3e);color:white;font-family:var(--font,system-ui);padding:20px;">
          <div style="position:relative;width:180px;height:180px;margin-bottom:20px;">
            <svg viewBox="0 0 180 180" style="width:180px;height:180px;transform:rotate(-90deg);">
              <circle cx="90" cy="90" r="78" fill="none" stroke="rgba(255,255,255,0.05)" stroke-width="8"/>
              <circle cx="90" cy="90" r="78" fill="none" stroke="#6366f1" stroke-width="8"
                stroke-linecap="round" stroke-dasharray="${490}" stroke-dashoffset="${490 * (1 - pct)}" style="transition:stroke-dashoffset 1s linear;"/>
            </svg>
            <div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);text-align:center;">
              <div style="font-size:36px;font-weight:300;font-variant-numeric:tabular-nums;">${mins}:${secs.toString().padStart(2,'0')}</div>
            </div>
          </div>
          <div style="font-size:13px;color:rgba(255,255,255,0.4);">Stay present</div>
          <button class="med-stop" style="margin-top:30px;padding:10px 30px;border-radius:20px;border:1px solid rgba(255,255,255,0.1);
            background:none;color:rgba(255,255,255,0.5);font-size:12px;cursor:pointer;">End Early</button>
        </div>
      `;
      container.querySelector('.med-stop')?.addEventListener('click', () => finishSession());
      return;
    }

    if (state === 'done') {
      const totalMins = Math.round(duration / 60);
      container.innerHTML = `
        <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;
          background:linear-gradient(180deg,#0f0f23,#1a1a3e);color:white;font-family:var(--font,system-ui);padding:20px;gap:12px;">
          <div style="font-size:48px;">✨</div>
          <div style="font-size:20px;font-weight:600;">Session Complete</div>
          <div style="font-size:13px;color:rgba(255,255,255,0.5);">${totalMins} minute${totalMins > 1 ? 's' : ''} of mindfulness</div>
          <div style="font-size:12px;color:rgba(255,255,255,0.3);margin-top:8px;">Sessions today: ${sessionsToday}</div>
          <button class="med-again" style="margin-top:20px;padding:10px 30px;border-radius:20px;border:none;
            background:#6366f1;color:white;font-size:13px;font-weight:600;cursor:pointer;">Meditate Again</button>
        </div>
      `;
      container.querySelector('.med-again')?.addEventListener('click', () => { state = 'choose'; render(); });
    }
  }

  function startBreathing() {
    let cycles = 0;
    const phases = ['in', 'hold', 'out'];
    const durations = [4000, 2000, 4000]; // 4-2-4 breathing
    let phaseIdx = 0;

    function nextPhase() {
      breathPhase = phases[phaseIdx];
      render();
      breathTimer = setTimeout(() => {
        phaseIdx++;
        if (phaseIdx >= phases.length) { phaseIdx = 0; cycles++; }
        if (cycles >= 2) {
          clearTimeout(breathTimer);
          state = 'meditating';
          startTimer();
          render();
        } else {
          nextPhase();
        }
      }, durations[phaseIdx]);
    }
    nextPhase();
  }

  function startTimer() {
    timer = setInterval(() => {
      remaining--;
      if (remaining <= 0) { finishSession(); return; }
      render();
    }, 1000);
  }

  function finishSession() {
    clearInterval(timer);
    clearTimeout(breathTimer);
    timer = null;
    sessionsToday++;
    saveSessions();
    state = 'done';
    render();
  }

  render();

  // Cleanup
  const obs = new MutationObserver(() => {
    if (!container.isConnected) { clearInterval(timer); clearTimeout(breathTimer); obs.disconnect(); }
  });
  if (container.parentElement) obs.observe(container.parentElement, { childList: true, subtree: true });
}
