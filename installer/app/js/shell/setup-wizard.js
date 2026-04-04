// NOVA OS — Setup Wizard (First Run Experience)

import { eventBus } from '../kernel/event-bus.js';

const wallpapers = [
  { id: 'gradient-purple', colors: 'linear-gradient(135deg, #1a1a2e, #16213e, #0f3460, #533483)' },
  { id: 'gradient-blue', colors: 'linear-gradient(135deg, #0c1445, #1a237e, #283593, #1565c0)' },
  { id: 'gradient-dark', colors: 'linear-gradient(135deg, #0a0a0a, #1a1a1a, #2d2d2d, #1a1a1a)' },
  { id: 'gradient-sunset', colors: 'linear-gradient(135deg, #1a0a2e, #4a1942, #7b2d5f, #b0413e)' },
  { id: 'gradient-forest', colors: 'linear-gradient(135deg, #0a1a0a, #1b3a1b, #2d5a2d, #1a3a2a)' },
  { id: 'gradient-space', colors: 'radial-gradient(ellipse at 30% 50%, #1a0533 0%, #0a0a1a 50%, #000000 100%)' },
];

const accents = [
  { color: '#007aff', name: 'Blue' },
  { color: '#5856d6', name: 'Purple' },
  { color: '#ff2d55', name: 'Pink' },
  { color: '#ff9500', name: 'Orange' },
  { color: '#28c840', name: 'Green' },
  { color: '#00bcd4', name: 'Teal' },
];

export function showSetupWizard() {
  return new Promise((resolve) => {
    // Skip if already completed setup
    if (localStorage.getItem('nova-setup-done')) {
      resolve();
      return;
    }

    let step = 0;
    const totalSteps = 4;
    let userName = 'User';
    let selectedWallpaper = 'gradient-purple';
    let selectedAccent = '#007aff';

    const wizard = document.createElement('div');
    wizard.id = 'setup-wizard';
    wizard.innerHTML = `
      <div class="setup-panel">
        <div class="setup-header">
          <div class="setup-logo">
            <svg width="60" height="60" viewBox="0 0 80 80" fill="none">
              <circle cx="40" cy="40" r="36" stroke="var(--accent)" stroke-width="2"/>
              <path d="M28 40 L40 28 L52 40 L40 52 Z" fill="var(--accent)"/>
              <circle cx="40" cy="40" r="6" fill="var(--accent)"/>
            </svg>
          </div>
          <div class="setup-title" id="setup-title">Welcome to NOVA OS</div>
          <div class="setup-subtitle" id="setup-subtitle">Let's set up your new AI-native operating system</div>
        </div>
        <div class="setup-body" id="setup-body"></div>
        <div class="setup-footer">
          <div class="setup-dots" id="setup-dots"></div>
          <div style="display:flex;gap:8px;">
            <button class="setup-btn setup-btn-secondary" id="setup-skip">Skip</button>
            <button class="setup-btn setup-btn-primary" id="setup-next">Continue</button>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(wizard);

    const body = wizard.querySelector('#setup-body');
    const title = wizard.querySelector('#setup-title');
    const subtitle = wizard.querySelector('#setup-subtitle');
    const nextBtn = wizard.querySelector('#setup-next');
    const skipBtn = wizard.querySelector('#setup-skip');
    const dots = wizard.querySelector('#setup-dots');

    function renderStep() {
      // Update dots
      dots.innerHTML = Array.from({ length: totalSteps }, (_, i) =>
        `<div class="setup-dot${i === step ? ' active' : ''}"></div>`
      ).join('');

      nextBtn.textContent = step === totalSteps - 1 ? 'Get Started' : 'Continue';

      switch (step) {
        case 0: // Welcome + name
          title.textContent = 'Welcome to NOVA OS';
          subtitle.textContent = "Let's personalize your experience";
          body.innerHTML = `
            <div class="setup-field">
              <label class="setup-label">What should we call you?</label>
              <input type="text" class="setup-input" id="setup-name" placeholder="Enter your name" value="${userName}" autofocus>
            </div>
            <div class="setup-features">
              <div class="setup-feature">
                <div class="setup-feature-icon">\u2728</div>
                <div class="setup-feature-text">
                  <div class="setup-feature-title">AI Built-In</div>
                  <div class="setup-feature-desc">Press Cmd+Space to ask NOVA anything</div>
                </div>
              </div>
              <div class="setup-feature">
                <div class="setup-feature-icon">\uD83D\uDCBB</div>
                <div class="setup-feature-text">
                  <div class="setup-feature-title">Real Apps</div>
                  <div class="setup-feature-desc">Browser, Notes, Terminal, Music, Calendar & more</div>
                </div>
              </div>
              <div class="setup-feature">
                <div class="setup-feature-icon">\uD83D\uDECD\uFE0F</div>
                <div class="setup-feature-text">
                  <div class="setup-feature-title">App Store</div>
                  <div class="setup-feature-desc">Discover apps and AI skills</div>
                </div>
              </div>
            </div>
          `;
          break;

        case 1: // Wallpaper
          title.textContent = 'Choose Your Wallpaper';
          subtitle.textContent = 'Pick a desktop background';
          body.innerHTML = `
            <div class="setup-theme-grid">
              ${wallpapers.map(w => `
                <div class="setup-theme-option${w.id === selectedWallpaper ? ' selected' : ''}" data-wp="${w.id}" style="background:${w.colors}"></div>
              `).join('')}
            </div>
          `;
          body.querySelectorAll('.setup-theme-option').forEach(el => {
            el.addEventListener('click', () => {
              selectedWallpaper = el.dataset.wp;
              body.querySelectorAll('.setup-theme-option').forEach(e => e.classList.remove('selected'));
              el.classList.add('selected');
            });
          });
          break;

        case 2: // Accent color
          title.textContent = 'Pick an Accent Color';
          subtitle.textContent = 'Used for buttons, links, and highlights';
          body.innerHTML = `
            <div class="setup-accent-grid">
              ${accents.map(a => `
                <div class="setup-accent-option${a.color === selectedAccent ? ' selected' : ''}" data-color="${a.color}" style="background:${a.color}" title="${a.name}"></div>
              `).join('')}
            </div>
            <div style="margin-top:24px;padding:20px;background:rgba(255,255,255,0.04);border-radius:10px;text-align:center;">
              <div style="font-size:14px;margin-bottom:8px;">Preview</div>
              <button class="setup-btn setup-btn-primary" style="pointer-events:none;" id="setup-preview-btn">This is your accent color</button>
            </div>
          `;
          body.querySelectorAll('.setup-accent-option').forEach(el => {
            el.addEventListener('click', () => {
              selectedAccent = el.dataset.color;
              body.querySelectorAll('.setup-accent-option').forEach(e => e.classList.remove('selected'));
              el.classList.add('selected');
              document.documentElement.style.setProperty('--accent', selectedAccent);
            });
          });
          break;

        case 3: // Ready
          title.textContent = `You're All Set, ${userName}!`;
          subtitle.textContent = 'NOVA OS is ready to go';
          body.innerHTML = `
            <div style="text-align:center;padding:16px 0;">
              <div style="font-size:48px;margin-bottom:16px;">\uD83D\uDE80</div>
              <div style="font-size:15px;color:var(--text-secondary);line-height:1.7;">
                Your desktop is customized and ready.<br>
                Press <strong>Cmd+Space</strong> anytime to ask NOVA AI for help.<br><br>
                <span style="font-size:12px;color:var(--text-tertiary);">Tip: Right-click the desktop for more options</span>
              </div>
            </div>
          `;
          nextBtn.textContent = 'Get Started';
          break;
      }
    }

    nextBtn.addEventListener('click', () => {
      if (step === 0) {
        const nameInput = body.querySelector('#setup-name');
        if (nameInput) userName = nameInput.value.trim() || 'User';
      }
      if (step >= totalSteps - 1) {
        finish();
      } else {
        step++;
        renderStep();
      }
    });

    skipBtn.addEventListener('click', finish);

    function finish() {
      // Save preferences
      localStorage.setItem('nova-setup-done', 'true');
      localStorage.setItem('nova-username', userName);
      localStorage.setItem('nova-wallpaper', selectedWallpaper);
      localStorage.setItem('nova-accent', selectedAccent);

      // Apply
      const wp = wallpapers.find(w => w.id === selectedWallpaper);
      if (wp) {
        document.getElementById('desktop').style.backgroundImage = wp.colors;
      }
      document.documentElement.style.setProperty('--accent', selectedAccent);

      // Animate out
      wizard.style.transition = 'opacity 0.4s';
      wizard.style.opacity = '0';
      setTimeout(() => {
        wizard.remove();
        resolve();
      }, 400);
    }

    renderStep();
  });
}
