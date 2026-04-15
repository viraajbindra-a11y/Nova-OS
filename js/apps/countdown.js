// ASTRION OS — Countdown
import { processManager } from '../kernel/process-manager.js';

export function registerCountdown() {
  processManager.register('countdown', {
    name: 'Countdown',
    icon: '⏳',
    singleInstance: true,
    width: 420,
    height: 480,
    launch: (el) => initCountdown(el)
  });
}

function initCountdown(container) {
  let events = [];
  try { events = JSON.parse(localStorage.getItem('nova-countdowns')) || []; } catch { events = []; }
  let adding = false;
  let nextId = Math.max(0, ...events.map(e => e.id), 0) + 1;
  let tickInterval = null;

  function save() { try { localStorage.setItem('nova-countdowns', JSON.stringify(events)); } catch {} }

  function getTimeLeft(dateStr) {
    const target = new Date(dateStr);
    const now = new Date();
    const diff = target - now;
    if (diff <= 0) return { days: 0, hours: 0, mins: 0, secs: 0, past: true };
    return {
      days: Math.floor(diff / 86400000),
      hours: Math.floor((diff % 86400000) / 3600000),
      mins: Math.floor((diff % 3600000) / 60000),
      secs: Math.floor((diff % 60000) / 1000),
      past: false,
    };
  }

  function render() {
    const accent = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() || '#007aff';

    if (adding) {
      container.innerHTML = `
        <div style="display:flex;flex-direction:column;height:100%;background:#1a1a2e;color:white;font-family:var(--font,system-ui);padding:20px;gap:12px;">
          <div style="display:flex;align-items:center;gap:8px;">
            <button class="cd-back" style="background:none;border:none;color:white;font-size:18px;cursor:pointer;">←</button>
            <span style="font-size:15px;font-weight:600;">New Countdown</span>
          </div>
          <input type="text" placeholder="Event name (e.g. Birthday)" id="cd-name" style="padding:10px 14px;border-radius:10px;border:1px solid rgba(255,255,255,0.1);background:rgba(255,255,255,0.05);color:white;font-size:14px;outline:none;">
          <input type="text" placeholder="Emoji (e.g. 🎂)" id="cd-emoji" style="width:80px;padding:10px;border-radius:10px;border:1px solid rgba(255,255,255,0.1);background:rgba(255,255,255,0.05);color:white;font-size:20px;text-align:center;outline:none;">
          <input type="date" id="cd-date" style="padding:10px 14px;border-radius:10px;border:1px solid rgba(255,255,255,0.1);background:rgba(255,255,255,0.05);color:white;font-size:14px;outline:none;color-scheme:dark;">
          <button id="cd-save" style="padding:12px;border-radius:12px;border:none;background:${accent};color:white;font-size:14px;font-weight:600;cursor:pointer;">Create Countdown</button>
        </div>
      `;
      container.querySelector('.cd-back').addEventListener('click', () => { adding = false; render(); });
      container.querySelector('#cd-save').addEventListener('click', () => {
        const name = container.querySelector('#cd-name').value.trim();
        const date = container.querySelector('#cd-date').value;
        if (!name || !date) return;
        events.push({ id: nextId++, name, emoji: container.querySelector('#cd-emoji').value.trim() || '📅', date });
        events.sort((a, b) => new Date(a.date) - new Date(b.date));
        save(); adding = false; render();
      });
      return;
    }

    container.innerHTML = `
      <div style="display:flex;flex-direction:column;height:100%;background:#1a1a2e;color:white;font-family:var(--font,system-ui);padding:16px;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
          <div style="font-size:16px;font-weight:600;">⏳ Countdowns</div>
          <button class="cd-add" style="padding:6px 14px;border-radius:8px;border:none;background:${accent};color:white;font-size:12px;cursor:pointer;">+ Add</button>
        </div>
        <div style="flex:1;overflow-y:auto;display:flex;flex-direction:column;gap:10px;">
          ${events.length === 0 ? '<div style="text-align:center;color:rgba(255,255,255,0.3);padding:40px;font-size:13px;">No countdowns yet. Add one!</div>' :
          events.map(e => {
            const t = getTimeLeft(e.date);
            return `
              <div style="padding:16px;border-radius:14px;background:rgba(255,255,255,0.04);position:relative;">
                <button class="cd-del" data-id="${e.id}" style="position:absolute;top:8px;right:10px;background:none;border:none;color:rgba(255,255,255,0.2);cursor:pointer;font-size:16px;">×</button>
                <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px;">
                  <span style="font-size:24px;">${e.emoji}</span>
                  <div>
                    <div style="font-weight:600;font-size:14px;">${e.name}</div>
                    <div style="font-size:11px;color:rgba(255,255,255,0.3);">${new Date(e.date).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</div>
                  </div>
                </div>
                ${t.past ? '<div style="font-size:13px;color:#fbbf24;font-weight:500;">🎉 Event has passed!</div>' : `
                  <div style="display:flex;gap:8px;justify-content:center;">
                    ${[['days',t.days],['hrs',t.hours],['min',t.mins],['sec',t.secs]].map(([label, val]) => `
                      <div style="text-align:center;min-width:50px;">
                        <div style="font-size:28px;font-weight:700;font-variant-numeric:tabular-nums;">${val}</div>
                        <div style="font-size:10px;color:rgba(255,255,255,0.4);text-transform:uppercase;">${label}</div>
                      </div>
                    `).join('<div style="font-size:24px;color:rgba(255,255,255,0.15);padding-top:4px;">:</div>')}
                  </div>
                `}
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;

    container.querySelector('.cd-add')?.addEventListener('click', () => { adding = true; render(); });
    container.querySelectorAll('.cd-del').forEach(el => el.addEventListener('click', () => {
      events = events.filter(e => e.id !== +el.dataset.id);
      save(); render();
    }));
  }

  render();
  tickInterval = setInterval(render, 1000);

  const obs = new MutationObserver(() => {
    if (!container.isConnected) { clearInterval(tickInterval); obs.disconnect(); }
  });
  if (container.parentElement) obs.observe(container.parentElement, { childList: true, subtree: true });
}
