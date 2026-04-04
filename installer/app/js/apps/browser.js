// NOVA OS — Web Browser App

import { processManager } from '../kernel/process-manager.js';
import { windowManager } from '../kernel/window-manager.js';

export function registerBrowser() {
  processManager.register('browser', {
    name: 'Browser',
    icon: '\uD83C\uDF10',
    iconClass: 'dock-icon-browser',
    singleInstance: false,
    width: 900,
    height: 600,
    launch: (contentEl, instanceId, options) => {
      initBrowser(contentEl, instanceId, options);
    }
  });
}

function initBrowser(container, instanceId, options = {}) {
  let currentUrl = options.url || '';
  let history = [];
  let historyIndex = -1;

  const bookmarks = [
    { name: 'Wikipedia', url: 'https://en.wikipedia.org', icon: '\uD83D\uDCDA' },
    { name: 'GitHub', url: 'https://github.com', icon: '\uD83D\uDC31' },
    { name: 'MDN Docs', url: 'https://developer.mozilla.org', icon: '\uD83D\uDCD6' },
    { name: 'YouTube', url: 'https://youtube.com', icon: '\u25B6\uFE0F' },
  ];

  container.innerHTML = `
    <div class="browser-app">
      <div class="browser-toolbar">
        <button class="browser-nav-btn" id="brw-back-${instanceId}" disabled title="Back">\u25C0</button>
        <button class="browser-nav-btn" id="brw-fwd-${instanceId}" disabled title="Forward">\u25B6</button>
        <button class="browser-nav-btn" id="brw-reload-${instanceId}" title="Reload">\u21BB</button>
        <div class="browser-url-bar">
          <span class="browser-url-lock">\uD83D\uDD12</span>
          <input type="text" class="browser-url-input" id="brw-url-${instanceId}" placeholder="Search or enter URL..." value="${currentUrl}" spellcheck="false">
        </div>
        <button class="browser-nav-btn" id="brw-home-${instanceId}" title="Home">\uD83C\uDFE0</button>
      </div>
      <div class="browser-viewport" id="brw-viewport-${instanceId}">
        <div class="browser-loading" id="brw-loading-${instanceId}">
          <div class="browser-loading-bar" id="brw-loading-bar-${instanceId}"></div>
        </div>
      </div>
    </div>
  `;

  const urlInput = container.querySelector(`#brw-url-${instanceId}`);
  const viewport = container.querySelector(`#brw-viewport-${instanceId}`);
  const backBtn = container.querySelector(`#brw-back-${instanceId}`);
  const fwdBtn = container.querySelector(`#brw-fwd-${instanceId}`);
  const reloadBtn = container.querySelector(`#brw-reload-${instanceId}`);
  const homeBtn = container.querySelector(`#brw-home-${instanceId}`);
  const loadingBar = container.querySelector(`#brw-loading-bar-${instanceId}`);

  // URL input
  urlInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      let url = urlInput.value.trim();
      if (!url) return;
      if (!url.match(/^https?:\/\//) && !url.includes('.')) {
        url = `https://www.google.com/search?igu=1&q=${encodeURIComponent(url)}`;
      } else if (!url.match(/^https?:\/\//)) {
        url = 'https://' + url;
      }
      navigate(url);
    }
  });

  urlInput.addEventListener('focus', () => urlInput.select());

  // Nav buttons
  backBtn.addEventListener('click', () => {
    if (historyIndex > 0) {
      historyIndex--;
      loadUrl(history[historyIndex], false);
    }
  });

  fwdBtn.addEventListener('click', () => {
    if (historyIndex < history.length - 1) {
      historyIndex++;
      loadUrl(history[historyIndex], false);
    }
  });

  reloadBtn.addEventListener('click', () => {
    if (currentUrl) {
      const iframe = viewport.querySelector('iframe');
      if (iframe) iframe.src = iframe.src;
    }
  });

  homeBtn.addEventListener('click', () => showHome());

  function navigate(url) {
    history = history.slice(0, historyIndex + 1);
    history.push(url);
    historyIndex = history.length - 1;
    loadUrl(url, true);
  }

  function loadUrl(url, updateHistory) {
    currentUrl = url;
    urlInput.value = url;

    // Show loading
    loadingBar.style.width = '30%';
    setTimeout(() => { loadingBar.style.width = '70%'; }, 200);

    // Remove old content
    const old = viewport.querySelector('.browser-home, .browser-error, iframe');
    if (old) old.remove();

    const iframe = document.createElement('iframe');
    iframe.className = 'browser-iframe';
    iframe.setAttribute('sandbox', 'allow-same-origin allow-scripts allow-forms allow-popups');
    iframe.src = url;

    iframe.onload = () => {
      loadingBar.style.width = '100%';
      setTimeout(() => { loadingBar.style.width = '0%'; }, 300);
      try {
        const title = iframe.contentDocument?.title;
        if (title) windowManager.setTitle(instanceId, title);
      } catch (e) {
        // Cross-origin, can't access title
        windowManager.setTitle(instanceId, url.replace(/^https?:\/\//, '').split('/')[0]);
      }
    };

    iframe.onerror = () => {
      loadingBar.style.width = '0%';
      showError(url);
    };

    viewport.appendChild(iframe);
    updateNavButtons();
  }

  function showHome() {
    currentUrl = '';
    urlInput.value = '';
    const old = viewport.querySelector('.browser-home, .browser-error, iframe');
    if (old) old.remove();

    const home = document.createElement('div');
    home.className = 'browser-home';
    home.innerHTML = `
      <div class="browser-home-logo">\uD83C\uDF10</div>
      <input type="text" class="browser-home-search" placeholder="Search the web..." autofocus>
      <div class="browser-home-shortcuts">
        ${bookmarks.map(b => `
          <div class="browser-home-shortcut" data-url="${b.url}">
            <div class="browser-home-shortcut-icon">${b.icon}</div>
            ${b.name}
          </div>
        `).join('')}
      </div>
    `;

    const searchInput = home.querySelector('.browser-home-search');
    searchInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        const q = searchInput.value.trim();
        if (q) navigate(`https://www.google.com/search?igu=1&q=${encodeURIComponent(q)}`);
      }
    });

    home.querySelectorAll('.browser-home-shortcut').forEach(el => {
      el.addEventListener('click', () => navigate(el.dataset.url));
    });

    viewport.appendChild(home);
    windowManager.setTitle(instanceId, 'Browser');
    updateNavButtons();
  }

  function showError(url) {
    const old = viewport.querySelector('.browser-home, .browser-error, iframe');
    if (old) old.remove();

    const err = document.createElement('div');
    err.className = 'browser-error';
    err.innerHTML = `
      <div class="browser-error-icon">\u26A0\uFE0F</div>
      <div style="font-size:16px;font-weight:600;">Can't reach this page</div>
      <div>${url}</div>
      <div style="font-size:12px;margin-top:8px;">The site may block being loaded in frames.<br>Try opening it directly in your real browser.</div>
    `;
    viewport.appendChild(err);
  }

  function updateNavButtons() {
    backBtn.disabled = historyIndex <= 0;
    fwdBtn.disabled = historyIndex >= history.length - 1;
  }

  // Show home page initially
  if (currentUrl) {
    navigate(currentUrl);
  } else {
    showHome();
  }
}
