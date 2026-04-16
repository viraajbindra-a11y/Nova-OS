// Astrion OS — Habit Tracker
// Daily habit checkboxes with streak counting.

import { processManager } from '../kernel/process-manager.js';

const HABITS_KEY = 'nova-habits';

export function registerHabitTracker() {
  processManager.register('habit-tracker', {
    name: 'Habits',
    icon: '\u2705',
    singleInstance: true,
    width: 560,
    height: 480,
    launch: (contentEl) => initHabits(contentEl),
  });
}

function getData() {
  try { return JSON.parse(localStorage.getItem(HABITS_KEY)) || { habits: [], log: {} }; }
  catch { return { habits: [], log: {} }; }
}

function saveData(data) {
  localStorage.setItem(HABITS_KEY, JSON.stringify(data));
}

function todayKey() {
  return new Date().toISOString().split('T')[0];
}

function initHabits(container) {
  let data = getData();

  function render() {
    const today = todayKey();
    const todayLog = data.log[today] || {};

    container.innerHTML = `
      <div style="display:flex; flex-direction:column; height:100%; font-family:var(--font); color:white; background:#1a1a22; padding:20px;">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px;">
          <div>
            <div style="font-size:18px; font-weight:600;">Habits</div>
            <div style="font-size:12px; color:rgba(255,255,255,0.4);">${new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</div>
          </div>
          <button id="ht-add" style="padding:8px 16px; border-radius:8px; border:none; background:var(--accent); color:white; font-size:12px; cursor:pointer; font-family:var(--font);">+ Add Habit</button>
        </div>

        <div style="flex:1; overflow-y:auto;">
          ${data.habits.length === 0 ? '<div style="text-align:center; padding:40px; color:rgba(255,255,255,0.3); font-size:13px;">No habits yet. Add one to start tracking!</div>' :
            data.habits.map((h, i) => {
              const done = !!todayLog[h.id];
              const streak = getStreak(data, h.id);
              return `
                <div class="ht-habit" style="
                  display:flex; align-items:center; gap:14px; padding:14px 16px;
                  border-radius:10px; margin-bottom:6px;
                  background:${done ? 'rgba(52,199,89,0.1)' : 'rgba(255,255,255,0.03)'};
                  transition:background 0.15s;
                ">
                  <button class="ht-check" data-id="${h.id}" style="
                    width:28px; height:28px; border-radius:50%;
                    border:2px solid ${done ? '#34c759' : 'rgba(255,255,255,0.2)'};
                    background:${done ? '#34c759' : 'transparent'};
                    color:white; font-size:14px; cursor:pointer;
                    display:flex; align-items:center; justify-content:center;
                  ">${done ? '\u2713' : ''}</button>
                  <div style="flex:1;">
                    <div style="font-size:14px; font-weight:500; ${done ? 'text-decoration:line-through; opacity:0.6;' : ''}">${esc(h.name)}</div>
                  </div>
                  <div style="text-align:right;">
                    <div style="font-size:16px; font-weight:600; color:${streak > 0 ? '#ff9500' : 'rgba(255,255,255,0.2)'};">${streak}</div>
                    <div style="font-size:9px; color:rgba(255,255,255,0.4);">streak</div>
                  </div>
                  <button class="ht-del" data-idx="${i}" style="background:none; border:none; color:rgba(255,255,255,0.2); cursor:pointer; font-size:14px;">\u00D7</button>
                </div>
              `;
            }).join('')}
        </div>

        <div style="margin-top:12px; text-align:center; font-size:11px; color:rgba(255,255,255,0.3);">
          ${data.habits.length > 0 ? `${Object.keys(todayLog).length}/${data.habits.length} completed today` : ''}
        </div>
      </div>
    `;

    container.querySelector('#ht-add').addEventListener('click', async () => {
      const { showPrompt } = await import('../lib/dialog.js');
      const name = await showPrompt('Habit name:', '');
      if (!name) return;
      data.habits.push({ id: 'h-' + Date.now(), name });
      saveData(data);
      render();
    });

    container.querySelectorAll('.ht-check').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.id;
        if (!data.log[today]) data.log[today] = {};
        if (data.log[today][id]) delete data.log[today][id];
        else data.log[today][id] = true;
        saveData(data);
        render();
      });
    });

    container.querySelectorAll('.ht-del').forEach(btn => {
      btn.addEventListener('click', () => {
        data.habits.splice(parseInt(btn.dataset.idx), 1);
        saveData(data);
        render();
      });
    });
  }

  function getStreak(data, habitId) {
    let streak = 0;
    const d = new Date();
    for (let i = 0; i < 365; i++) {
      const key = d.toISOString().split('T')[0];
      if (data.log[key]?.[habitId]) streak++;
      else if (i > 0) break; // today can be incomplete
      d.setDate(d.getDate() - 1);
    }
    return streak;
  }

  render();
}

function esc(s) {
  return String(s || '').replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
}
