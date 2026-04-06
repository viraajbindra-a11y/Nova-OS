// NOVA OS — App Store

import { processManager } from '../kernel/process-manager.js';
import { appInstaller } from '../kernel/app-installer.js';

export function registerAppStore() {
  processManager.register('appstore', {
    name: 'App Store',
    icon: '\uD83D\uDECD\uFE0F',
    iconClass: 'dock-icon-appstore',
    singleInstance: true,
    width: 800,
    height: 560,
    launch: (contentEl) => {
      initAppStore(contentEl);
    }
  });
}

// Build store listing from real installable apps + demo apps
function buildStoreApps() {
  const registry = appInstaller.getRegistry();
  const realApps = Object.entries(registry).map(([id, app]) => ({
    id, name: app.name, icon: app.icon, category: app.category,
    dev: app.dev, rating: app.rating, color: app.color,
    desc: app.desc, installed: appInstaller.isInstalled(id), price: app.price || 'Free',
  }));
  return [...realApps, ...demoApps];
}

const demoApps = [
  {
    id: 'weather-widget', name: 'Weather Pro', icon: '\u26C5', category: 'Utilities',
    dev: 'CloudTech', rating: 4.8, color: 'linear-gradient(135deg, #1e88e5, #0d47a1)',
    desc: 'Beautiful weather forecasts with hourly and weekly views. AI-powered weather insights.',
    installed: false, price: 'Free'
  },
  {
    id: 'code-editor-pro', name: 'CodePad Pro', icon: '\uD83D\uDCBB', category: 'Developer Tools',
    dev: 'DevForge', rating: 4.9, color: 'linear-gradient(135deg, #7c4dff, #304ffe)',
    desc: 'Advanced code editor with syntax highlighting, git integration, and AI code completion.',
    installed: false, price: '$4.99'
  },
  {
    id: 'photo-editor', name: 'PixelStudio', icon: '\uD83D\uDDBC\uFE0F', category: 'Photography',
    dev: 'Creative Labs', rating: 4.7, color: 'linear-gradient(135deg, #ff6d00, #ff3d00)',
    desc: 'Professional photo editing with AI-powered filters, layers, and adjustment tools.',
    installed: false, price: '$2.99'
  },
  {
    id: 'task-manager', name: 'TaskFlow', icon: '\u2705', category: 'Productivity',
    dev: 'ProductiveApps', rating: 4.6, color: 'linear-gradient(135deg, #00c853, #1b5e20)',
    desc: 'Smart task management with AI prioritization and deadline tracking.',
    installed: false, price: 'Free'
  },
  {
    id: 'music-pro', name: 'BeatMaker', icon: '\uD83C\uDFB9', category: 'Music',
    dev: 'SoundForge', rating: 4.5, color: 'linear-gradient(135deg, #e91e63, #880e4f)',
    desc: 'Create music with virtual instruments, loops, and AI-assisted composition.',
    installed: false, price: '$6.99'
  },
  {
    id: 'chat-app', name: 'NovaChat', icon: '\uD83D\uDCAC', category: 'Social',
    dev: 'NOVA Team', rating: 4.8, color: 'linear-gradient(135deg, #00bcd4, #006064)',
    desc: 'End-to-end encrypted messaging with AI-powered smart replies.',
    installed: false, price: 'Free'
  },
  {
    id: 'vpn-app', name: 'ShieldVPN', icon: '\uD83D\uDD12', category: 'Security',
    dev: 'SecureTech', rating: 4.4, color: 'linear-gradient(135deg, #455a64, #263238)',
    desc: 'Protect your privacy with military-grade encryption and global servers.',
    installed: false, price: '$3.99/mo'
  },
  {
    id: 'fitness', name: 'FitTrack', icon: '\uD83C\uDFCB\uFE0F', category: 'Health & Fitness',
    dev: 'HealthApps', rating: 4.6, color: 'linear-gradient(135deg, #f44336, #b71c1c)',
    desc: 'Track workouts, calories, and progress with AI coaching.',
    installed: false, price: 'Free'
  },
  {
    id: 'translator', name: 'LinguaAI', icon: '\uD83C\uDF0D', category: 'Reference',
    dev: 'LangTech', rating: 4.9, color: 'linear-gradient(135deg, #3f51b5, #1a237e)',
    desc: 'Instant translation in 100+ languages powered by AI.',
    installed: false, price: 'Free'
  },
];

function initAppStore(container) {
  let activeTab = 'discover';
  let detailApp = null;
  const storeApps = buildStoreApps();

  container.innerHTML = `
    <div class="appstore-app">
      <div class="appstore-header">
        <div class="appstore-tabs" id="store-tabs">
          <button class="appstore-tab active" data-tab="discover">Discover</button>
          <button class="appstore-tab" data-tab="top">Top Charts</button>
          <button class="appstore-tab" data-tab="categories">Categories</button>
          <button class="appstore-tab" data-tab="linux">Linux Apps</button>
          <button class="appstore-tab" data-tab="skills">AI Skills</button>
        </div>
        <input type="text" class="appstore-search" placeholder="Search apps...">
      </div>
      <div class="appstore-content" id="store-content"></div>
    </div>
  `;

  const content = container.querySelector('#store-content');
  const tabs = container.querySelector('#store-tabs');
  const searchInput = container.querySelector('.appstore-search');

  tabs.addEventListener('click', (e) => {
    const tab = e.target.closest('.appstore-tab');
    if (!tab) return;
    activeTab = tab.dataset.tab;
    tabs.querySelectorAll('.appstore-tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    detailApp = null;
    renderContent();
  });

  searchInput.addEventListener('input', () => {
    const q = searchInput.value.toLowerCase();
    if (!q) { renderContent(); return; }
    const filtered = storeApps.filter(a => a.name.toLowerCase().includes(q) || a.category.toLowerCase().includes(q));
    renderGrid(filtered, 'Search Results');
  });

  function renderContent() {
    if (detailApp) { renderDetail(detailApp); return; }
    switch (activeTab) {
      case 'discover': renderDiscover(); break;
      case 'top': renderTopCharts(); break;
      case 'categories': renderCategories(); break;
      case 'linux': renderLinuxApps(); break;
      case 'skills': renderSkills(); break;
    }
  }

  function renderDiscover() {
    content.innerHTML = `
      <div class="appstore-featured">
        <div class="appstore-featured-card" style="background:linear-gradient(135deg, #1a237e, #4a148c)">
          <div class="appstore-featured-label">Featured</div>
          <div class="appstore-featured-title">AI Skills Marketplace</div>
          <div class="appstore-featured-desc">Discover AI-powered skills that supercharge your NOVA OS experience</div>
        </div>
        <div class="appstore-featured-card" style="background:linear-gradient(135deg, #004d40, #00695c)">
          <div class="appstore-featured-label">New & Notable</div>
          <div class="appstore-featured-title">Developer Tools</div>
          <div class="appstore-featured-desc">Code faster with AI-assisted development tools</div>
        </div>
      </div>
      <div class="appstore-section" id="store-essential"></div>
      <div class="appstore-section" id="store-new"></div>
    `;

    renderGridInto('#store-essential', storeApps.slice(0, 4), 'Essential Apps');
    renderGridInto('#store-new', storeApps.slice(4), 'New & Updated');
  }

  function renderTopCharts() {
    const sorted = [...storeApps].sort((a, b) => b.rating - a.rating);
    content.innerHTML = '<div class="appstore-section"><div class="appstore-section-header"><div class="appstore-section-title">Top Charts</div></div><div class="appstore-list" id="store-list"></div></div>';
    const list = content.querySelector('#store-list');
    sorted.forEach((app, i) => {
      const el = document.createElement('div');
      el.className = 'appstore-list-item';
      el.innerHTML = `
        <div class="appstore-list-num">${i + 1}</div>
        <div class="appstore-list-icon" style="background:${app.color}">${app.icon}</div>
        <div class="appstore-list-info">
          <div class="appstore-list-name">${app.name}</div>
          <div class="appstore-list-category">${app.category}</div>
        </div>
        <div style="font-size:12px;color:var(--text-tertiary)">\u2B50 ${app.rating}</div>
        <button class="appstore-get-btn${app.installed ? ' installed' : ''}">${app.installed ? 'Installed' : app.price === 'Free' ? 'GET' : app.price}</button>
      `;
      el.querySelector('.appstore-get-btn').addEventListener('click', (e) => {
        e.stopPropagation();
        installApp(app, e.target);
      });
      el.addEventListener('click', () => { detailApp = app; renderContent(); });
      list.appendChild(el);
    });
  }

  function renderCategories() {
    const cats = [...new Set(storeApps.map(a => a.category))];
    const catIcons = { 'Utilities': '\uD83D\uDD27', 'Developer Tools': '\uD83D\uDCBB', 'Photography': '\uD83D\uDCF7', 'Productivity': '\uD83D\uDCCA', 'Music': '\uD83C\uDFB5', 'Social': '\uD83D\uDCAC', 'Security': '\uD83D\uDD12', 'Health & Fitness': '\uD83C\uDFCB\uFE0F', 'Reference': '\uD83D\uDCDA' };
    content.innerHTML = `<div class="appstore-section"><div class="appstore-section-title">Categories</div><div class="appstore-grid">${cats.map(cat => `
      <div class="appstore-card" data-cat="${cat}">
        <div class="appstore-card-icon" style="background:rgba(255,255,255,0.06)">${catIcons[cat] || '\uD83D\uDCC1'}</div>
        <div class="appstore-card-name">${cat}</div>
        <div class="appstore-card-category">${storeApps.filter(a => a.category === cat).length} apps</div>
      </div>
    `).join('')}</div></div>`;
  }

  function renderSkills() {
    content.innerHTML = `
      <div class="appstore-section">
        <div class="appstore-featured" style="grid-template-columns:1fr">
          <div class="appstore-featured-card" style="background:linear-gradient(135deg, #4a148c, #7b1fa2, #ce93d8)">
            <div class="appstore-featured-label">\u2728 AI Skills</div>
            <div class="appstore-featured-title">Extend NOVA with AI Superpowers</div>
            <div class="appstore-featured-desc">Skills are AI capabilities that plug directly into NOVA OS. They can summarize documents, generate code, translate languages, and more — all from Spotlight or any app.</div>
          </div>
        </div>
        <div class="appstore-section-title" style="margin-top:20px">Available Skills</div>
        <div class="appstore-grid">
          <div class="appstore-card">
            <div class="appstore-card-icon" style="background:linear-gradient(135deg,#ff6d00,#ff3d00)">\uD83D\uDCDD</div>
            <div class="appstore-card-name">Smart Summarizer</div>
            <div class="appstore-card-category">AI Skill \u2022 Free</div>
            <div class="appstore-card-footer"><span class="appstore-card-rating">\u2B50 4.9</span><button class="appstore-get-btn">GET</button></div>
          </div>
          <div class="appstore-card">
            <div class="appstore-card-icon" style="background:linear-gradient(135deg,#1e88e5,#0d47a1)">\uD83D\uDCBB</div>
            <div class="appstore-card-name">Code Generator</div>
            <div class="appstore-card-category">AI Skill \u2022 $1.99</div>
            <div class="appstore-card-footer"><span class="appstore-card-rating">\u2B50 4.8</span><button class="appstore-get-btn">$1.99</button></div>
          </div>
          <div class="appstore-card">
            <div class="appstore-card-icon" style="background:linear-gradient(135deg,#43a047,#1b5e20)">\uD83C\uDF0D</div>
            <div class="appstore-card-name">Auto Translator</div>
            <div class="appstore-card-category">AI Skill \u2022 Free</div>
            <div class="appstore-card-footer"><span class="appstore-card-rating">\u2B50 4.7</span><button class="appstore-get-btn">GET</button></div>
          </div>
          <div class="appstore-card">
            <div class="appstore-card-icon" style="background:linear-gradient(135deg,#ab47bc,#6a1b9a)">\uD83C\uDFA8</div>
            <div class="appstore-card-name">Image Describer</div>
            <div class="appstore-card-category">AI Skill \u2022 Free</div>
            <div class="appstore-card-footer"><span class="appstore-card-rating">\u2B50 4.6</span><button class="appstore-get-btn">GET</button></div>
          </div>
        </div>
      </div>
    `;
  }

  function renderDetail(app) {
    content.innerHTML = `
      <div class="appstore-detail">
        <div style="margin-bottom:16px"><span style="cursor:pointer;color:var(--accent)" id="store-back">\u25C0 Back</span></div>
        <div class="appstore-detail-header">
          <div class="appstore-detail-icon" style="background:${app.color}">${app.icon}</div>
          <div class="appstore-detail-info">
            <div class="appstore-detail-name">${app.name}</div>
            <div class="appstore-detail-dev">${app.dev}</div>
            <div style="display:flex;gap:12px;align-items:center">
              <button class="appstore-get-btn${app.installed ? ' installed' : ''}" id="store-detail-get" style="padding:6px 24px;font-size:14px">${app.installed ? 'Installed' : app.price === 'Free' ? 'GET' : app.price}</button>
              <span style="font-size:13px;color:var(--text-tertiary)">\u2B50 ${app.rating}</span>
            </div>
          </div>
        </div>
        <div class="appstore-detail-desc">${app.desc}</div>
        <div class="appstore-section-title" style="font-size:16px;margin-bottom:12px">Screenshots</div>
        <div class="appstore-detail-screenshots">
          <div class="appstore-detail-screenshot">Screenshot 1</div>
          <div class="appstore-detail-screenshot">Screenshot 2</div>
          <div class="appstore-detail-screenshot">Screenshot 3</div>
        </div>
      </div>
    `;

    content.querySelector('#store-back').addEventListener('click', () => {
      detailApp = null;
      renderContent();
    });

    content.querySelector('#store-detail-get').addEventListener('click', (e) => {
      installApp(app, e.target);
    });
  }

  function renderGrid(apps, title) {
    content.innerHTML = '';
    const section = document.createElement('div');
    section.className = 'appstore-section';
    section.innerHTML = `<div class="appstore-section-header"><div class="appstore-section-title">${title}</div></div>`;
    const grid = document.createElement('div');
    grid.className = 'appstore-grid';
    apps.forEach(app => {
      grid.appendChild(createCard(app));
    });
    section.appendChild(grid);
    content.appendChild(section);
  }

  function renderGridInto(selector, apps, title) {
    const section = content.querySelector(selector);
    section.innerHTML = `<div class="appstore-section-header"><div class="appstore-section-title">${title}</div><span class="appstore-see-all">See All</span></div>`;
    const grid = document.createElement('div');
    grid.className = 'appstore-grid';
    apps.forEach(app => grid.appendChild(createCard(app)));
    section.appendChild(grid);
  }

  function createCard(app) {
    const card = document.createElement('div');
    card.className = 'appstore-card';
    card.innerHTML = `
      <div class="appstore-card-icon" style="background:${app.color}">${app.icon}</div>
      <div class="appstore-card-name">${app.name}</div>
      <div class="appstore-card-category">${app.category}</div>
      <div class="appstore-card-footer">
        <span class="appstore-card-rating">\u2B50 ${app.rating}</span>
        <button class="appstore-get-btn${app.installed ? ' installed' : ''}">${app.installed ? 'Installed' : app.price === 'Free' ? 'GET' : app.price}</button>
      </div>
    `;
    card.querySelector('.appstore-get-btn').addEventListener('click', (e) => {
      e.stopPropagation();
      installApp(app, e.target);
    });
    card.addEventListener('click', () => { detailApp = app; renderContent(); });
    return card;
  }

  async function installApp(app, btn) {
    if (app.installed) return;
    btn.textContent = 'Installing...';
    btn.style.pointerEvents = 'none';

    // Check if this is a real installable app from the registry
    const registry = appInstaller.getRegistry();
    const realApp = registry[app.id];

    await new Promise(r => setTimeout(r, 1200)); // install animation

    if (realApp) {
      await appInstaller.install(app.id);
    }

    app.installed = true;
    btn.textContent = 'OPEN';
    btn.classList.add('installed');
    btn.style.pointerEvents = '';

    // Click to open installed app
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (realApp) processManager.launch(app.id);
    });
  }

  // ─── Linux Apps tab (Flatpak integration) ───
  async function renderLinuxApps() {
    content.innerHTML = `
      <div style="padding:20px;">
        <div style="display:flex; gap:10px; margin-bottom:20px;">
          <input type="text" id="flatpak-search" placeholder="Search Linux apps (Firefox, GIMP, VS Code, Spotify, Discord, Steam...)"
            style="flex:1; padding:10px 14px; border-radius:10px; border:1px solid rgba(255,255,255,0.1);
                   background:rgba(255,255,255,0.05); color:white; font-size:13px; font-family:var(--font); outline:none;">
          <button id="flatpak-search-btn" style="padding:10px 20px; border-radius:10px; border:none; background:var(--accent); color:white; font-size:13px; font-family:var(--font); cursor:pointer; font-weight:500;">Search</button>
        </div>

        <div style="font-size:12px; font-weight:600; color:rgba(255,255,255,0.6); text-transform:uppercase; letter-spacing:0.5px; margin-bottom:12px;">Popular Apps</div>
        <div id="flatpak-popular" style="display:grid; grid-template-columns:repeat(auto-fill, minmax(280px, 1fr)); gap:12px; margin-bottom:24px;">
          ${popularLinuxApps.map(a => flatpakCard(a)).join('')}
        </div>

        <div id="flatpak-results"></div>

        <div style="font-size:12px; font-weight:600; color:rgba(255,255,255,0.6); text-transform:uppercase; letter-spacing:0.5px; margin:20px 0 12px;">Installed Linux Apps</div>
        <div id="flatpak-installed" style="display:flex; flex-direction:column; gap:6px;">
          <div style="color:rgba(255,255,255,0.3); font-size:12px;">Loading...</div>
        </div>
      </div>
    `;

    const searchInput = content.querySelector('#flatpak-search');
    const searchBtn = content.querySelector('#flatpak-search-btn');

    const doSearch = async () => {
      const q = searchInput.value.trim();
      if (!q) return;
      const resultsEl = content.querySelector('#flatpak-results');
      resultsEl.innerHTML = '<div style="color:rgba(255,255,255,0.4); font-size:12px; padding:10px;">Searching Flathub...</div>';
      try {
        const res = await fetch(`/api/apps/search?q=${encodeURIComponent(q)}`);
        const { results } = await res.json();
        if (results.length === 0) {
          resultsEl.innerHTML = '<div style="color:rgba(255,255,255,0.4); font-size:12px; padding:10px;">No results found</div>';
          return;
        }
        resultsEl.innerHTML = `
          <div style="font-size:12px; font-weight:600; color:rgba(255,255,255,0.6); text-transform:uppercase; letter-spacing:0.5px; margin-bottom:12px;">Search Results</div>
          <div style="display:grid; grid-template-columns:repeat(auto-fill, minmax(280px, 1fr)); gap:12px;">
            ${results.map(r => flatpakCard({ id: r.id, name: r.name, desc: r.description || '', icon: '\uD83D\uDCE6' })).join('')}
          </div>
        `;
        bindFlatpakButtons(resultsEl);
      } catch (err) {
        resultsEl.innerHTML = `<div style="color:#ff6b6b; font-size:12px; padding:10px;">Search failed: ${err.message}. Flatpak may not be available.</div>`;
      }
    };

    searchBtn.addEventListener('click', doSearch);
    searchInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') doSearch(); });

    bindFlatpakButtons(content.querySelector('#flatpak-popular'));
    loadInstalledFlatpaks();
  }

  async function loadInstalledFlatpaks() {
    const el = content.querySelector('#flatpak-installed');
    if (!el) return;
    try {
      const res = await fetch('/api/apps/installed');
      const { apps } = await res.json();
      if (apps.length === 0) {
        el.innerHTML = '<div style="color:rgba(255,255,255,0.3); font-size:12px;">No Linux apps installed yet</div>';
        return;
      }
      el.innerHTML = apps.map(a => `
        <div style="display:flex; align-items:center; gap:12px; padding:10px 12px; border-radius:10px; background:rgba(255,255,255,0.03);">
          <div style="font-size:18px;">\uD83D\uDCE6</div>
          <div style="flex:1; min-width:0;">
            <div style="font-size:12px; font-weight:500;">${escHtml(a.name)}</div>
            <div style="font-size:10px; color:rgba(255,255,255,0.4);">${escHtml(a.id)} \u00B7 ${a.version || ''}</div>
          </div>
          <button class="flatpak-launch" data-id="${escHtml(a.id)}" style="padding:5px 12px; border-radius:6px; border:none; background:var(--accent); color:white; font-size:11px; cursor:pointer; font-family:var(--font);">Open</button>
          <button class="flatpak-remove" data-id="${escHtml(a.id)}" style="padding:5px 12px; border-radius:6px; border:1px solid rgba(255,59,48,0.3); background:transparent; color:#ff6b6b; font-size:11px; cursor:pointer; font-family:var(--font);">Remove</button>
        </div>
      `).join('');

      el.querySelectorAll('.flatpak-launch').forEach(btn => {
        btn.addEventListener('click', () => {
          fetch('/api/apps/launch', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ appId: btn.dataset.id }) });
        });
      });
      el.querySelectorAll('.flatpak-remove').forEach(btn => {
        btn.addEventListener('click', async () => {
          if (!confirm(`Remove ${btn.dataset.id}?`)) return;
          btn.textContent = 'Removing...';
          await fetch('/api/apps/uninstall', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ appId: btn.dataset.id }) });
          loadInstalledFlatpaks();
        });
      });
    } catch {
      el.innerHTML = '<div style="color:rgba(255,255,255,0.3); font-size:12px;">Could not load installed apps</div>';
    }
  }

  function bindFlatpakButtons(container) {
    if (!container) return;
    container.querySelectorAll('.flatpak-install-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const appId = btn.dataset.id;
        btn.textContent = 'Installing...';
        btn.disabled = true;
        btn.style.opacity = '0.6';
        try {
          await fetch('/api/apps/install', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ appId }),
          });
          btn.textContent = 'Installing (background)...';
          setTimeout(() => { btn.textContent = 'Installed'; }, 3000);
        } catch {
          btn.textContent = 'Failed';
          btn.disabled = false;
        }
      });
    });
  }

  renderContent();
}

const popularLinuxApps = [
  { id: 'org.mozilla.firefox', name: 'Firefox', desc: 'Fast, private web browser', icon: '\uD83E\uDD8A' },
  { id: 'com.google.Chrome', name: 'Google Chrome', desc: 'Web browser by Google', icon: '\uD83C\uDF10' },
  { id: 'com.visualstudio.code', name: 'VS Code', desc: 'Code editor by Microsoft', icon: '\uD83D\uDCDD' },
  { id: 'com.spotify.Client', name: 'Spotify', desc: 'Music streaming', icon: '\uD83C\uDFB5' },
  { id: 'com.discordapp.Discord', name: 'Discord', desc: 'Voice, video & text chat', icon: '\uD83D\uDCAC' },
  { id: 'com.valvesoftware.Steam', name: 'Steam', desc: 'PC gaming platform', icon: '\uD83C\uDFAE' },
  { id: 'org.gimp.GIMP', name: 'GIMP', desc: 'Image editor', icon: '\uD83D\uDDBC\uFE0F' },
  { id: 'org.blender.Blender', name: 'Blender', desc: '3D creation suite', icon: '\uD83C\uDFAC' },
  { id: 'org.videolan.VLC', name: 'VLC', desc: 'Media player', icon: '\u25B6\uFE0F' },
  { id: 'org.telegram.desktop', name: 'Telegram', desc: 'Messaging app', icon: '\u2708\uFE0F' },
  { id: 'com.obsproject.Studio', name: 'OBS Studio', desc: 'Streaming & recording', icon: '\uD83D\uDCF9' },
  { id: 'org.kde.kdenlive', name: 'Kdenlive', desc: 'Video editor', icon: '\uD83C\uDFAC' },
];

function flatpakCard(app) {
  return `
    <div style="display:flex; align-items:center; gap:12px; padding:12px 14px; border-radius:12px; background:rgba(255,255,255,0.04); transition:background 0.15s;"
      onmouseenter="this.style.background='rgba(255,255,255,0.08)'" onmouseleave="this.style.background='rgba(255,255,255,0.04)'">
      <div style="font-size:32px; width:42px; text-align:center;">${app.icon}</div>
      <div style="flex:1; min-width:0;">
        <div style="font-size:13px; font-weight:600;">${escHtml(app.name)}</div>
        <div style="font-size:11px; color:rgba(255,255,255,0.5); white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${escHtml(app.desc)}</div>
      </div>
      <button class="flatpak-install-btn" data-id="${escHtml(app.id)}" style="
        padding:6px 14px; border-radius:16px; border:none;
        background:var(--accent); color:white; font-size:11px;
        font-weight:600; cursor:pointer; font-family:var(--font);
        white-space:nowrap;
      ">GET</button>
    </div>
  `;
}

function escHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
}
