// NOVA OS — Menubar

import { eventBus } from '../kernel/event-bus.js';

export function initMenubar() {
  updateClock();
  setInterval(updateClock, 1000);

  // Update app name when window focuses
  eventBus.on('window:focused', ({ title, app }) => {
    const appNames = {
      finder: 'Finder',
      browser: 'Browser',
      notes: 'Notes',
      terminal: 'Terminal',
      calculator: 'Calculator',
      music: 'Music',
      calendar: 'Calendar',
      draw: 'Draw',
      appstore: 'App Store',
      settings: 'Settings',
      'text-editor': 'Text Editor',
    };
    document.getElementById('menubar-app-name').textContent = appNames[app] || title || 'Finder';
  });

  // Spotlight shortcut in menubar
  document.getElementById('menubar-spotlight').addEventListener('click', () => {
    eventBus.emit('spotlight:toggle');
  });

  // Apple menu
  document.getElementById('menubar-apple').addEventListener('click', () => {
    eventBus.emit('spotlight:toggle');
  });
}

function updateClock() {
  const now = new Date();
  const time = now.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });
  const day = now.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  document.getElementById('menubar-clock').textContent = `${day}  ${time}`;
}
