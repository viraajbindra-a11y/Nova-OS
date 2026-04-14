// ASTRION OS — Speed Test
import { processManager } from '../kernel/process-manager.js';

export function registerSpeedTest() {
  processManager.register('speed-test', {
    name: 'Speed Test',
    icon: '⚡',
    singleInstance: true,
    width: 420,
    height: 500,
    launch: (el) => initSpeedTest(el)
  });
}

function initSpeedTest(container) {
  let phase = 'idle'; // idle, ping, download, upload, done
  let results = { ping: 0, download: 0, upload: 0, jitter: 0 };
  let animFrame = null;

  const accent = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() || '#007aff';

  function render() {
    container.innerHTML = `
      <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;
        background:linear-gradient(135deg,#0a0a1a,#1a1a3e);color:white;font-family:var(--font,system-ui);padding:20px;gap:20px;">
        <div style="font-size:13px;text-transform:uppercase;letter-spacing:2px;color:rgba(255,255,255,0.4);">
          ${phase === 'idle' ? 'Network Speed Test' : phase === 'done' ? 'Results' : `Testing ${phase}...`}
        </div>
        <div style="position:relative;width:200px;height:200px;">
          <svg viewBox="0 0 200 200" style="width:200px;height:200px;transform:rotate(-90deg);">
            <circle cx="100" cy="100" r="85" fill="none" stroke="rgba(255,255,255,0.06)" stroke-width="12"/>
            <circle id="speed-arc" cx="100" cy="100" r="85" fill="none" stroke="${accent}" stroke-width="12"
              stroke-linecap="round" stroke-dasharray="534" stroke-dashoffset="534" style="transition:stroke-dashoffset 0.3s;"/>
          </svg>
          <div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);text-align:center;">
            <div id="speed-value" style="font-size:48px;font-weight:700;line-height:1;">${phase === 'done' ? results.download.toFixed(1) : '0'}</div>
            <div style="font-size:12px;color:rgba(255,255,255,0.5);margin-top:4px;">${phase === 'ping' ? 'ms' : 'Mbps'}</div>
          </div>
        </div>
        ${phase === 'done' ? `
          <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:20px;width:100%;max-width:320px;text-align:center;">
            <div>
              <div style="font-size:11px;color:rgba(255,255,255,0.4);text-transform:uppercase;margin-bottom:4px;">Ping</div>
              <div style="font-size:22px;font-weight:600;">${results.ping}<span style="font-size:12px;color:rgba(255,255,255,0.4);"> ms</span></div>
            </div>
            <div>
              <div style="font-size:11px;color:rgba(255,255,255,0.4);text-transform:uppercase;margin-bottom:4px;">Download</div>
              <div style="font-size:22px;font-weight:600;">${results.download.toFixed(1)}<span style="font-size:12px;color:rgba(255,255,255,0.4);"> Mbps</span></div>
            </div>
            <div>
              <div style="font-size:11px;color:rgba(255,255,255,0.4);text-transform:uppercase;margin-bottom:4px;">Upload</div>
              <div style="font-size:22px;font-weight:600;">${results.upload.toFixed(1)}<span style="font-size:12px;color:rgba(255,255,255,0.4);"> Mbps</span></div>
            </div>
          </div>
          <div style="font-size:11px;color:rgba(255,255,255,0.3);">Jitter: ${results.jitter.toFixed(1)} ms · Simulated test</div>
        ` : ''}
        <button id="speed-btn" style="
          padding:12px 40px;border-radius:24px;border:none;font-size:14px;font-weight:600;cursor:pointer;
          background:${phase === 'idle' || phase === 'done' ? accent : 'rgba(255,255,255,0.08)'};
          color:white;transition:transform 0.15s;
        ">${phase === 'idle' ? 'Start Test' : phase === 'done' ? 'Test Again' : 'Testing...'}</button>
        <div style="font-size:10px;color:rgba(255,255,255,0.2);">Powered by Astrion</div>
      </div>
    `;

    const btn = container.querySelector('#speed-btn');
    if (phase === 'idle' || phase === 'done') {
      btn.addEventListener('click', startTest);
    }
  }

  function animateValue(target, duration, onTick, onDone) {
    const start = performance.now();
    const arc = container.querySelector('#speed-arc');
    const valueEl = container.querySelector('#speed-value');

    function tick(now) {
      const t = Math.min((now - start) / duration, 1);
      // Eased progress with some jitter for realism
      const eased = t < 0.5 ? 2*t*t : 1 - Math.pow(-2*t+2, 2)/2;
      const jitter = (Math.random() - 0.5) * target * 0.15 * (1 - t);
      const current = eased * target + jitter;
      const display = Math.max(0, current);

      if (valueEl) valueEl.textContent = display < 10 ? display.toFixed(1) : Math.round(display);
      if (arc) {
        const maxSpeed = 500;
        const pct = Math.min(display / maxSpeed, 1);
        arc.setAttribute('stroke-dashoffset', 534 - pct * 534);
      }

      if (onTick) onTick(display);
      if (t < 1) animFrame = requestAnimationFrame(tick);
      else { if (onDone) onDone(target); }
    }
    animFrame = requestAnimationFrame(tick);
  }

  function startTest() {
    // Generate realistic-ish fake results
    results = {
      ping: 8 + Math.random() * 35,
      download: 50 + Math.random() * 200,
      upload: 20 + Math.random() * 80,
      jitter: 1 + Math.random() * 8,
    };

    // Phase 1: Ping
    phase = 'ping';
    render();
    animateValue(results.ping, 1200, null, () => {
      // Phase 2: Download
      phase = 'download';
      const label = container.querySelector('div[style*="text-transform:uppercase"]');
      if (label) label.textContent = 'Testing download...';
      animateValue(results.download, 2500, null, () => {
        // Phase 3: Upload
        phase = 'upload';
        const label2 = container.querySelector('div[style*="text-transform:uppercase"]');
        if (label2) label2.textContent = 'Testing upload...';
        animateValue(results.upload, 2000, null, () => {
          phase = 'done';
          render();
        });
      });
    });
  }

  render();

  const obs = new MutationObserver(() => {
    if (!container.isConnected) { if (animFrame) cancelAnimationFrame(animFrame); obs.disconnect(); }
  });
  if (container.parentElement) obs.observe(container.parentElement, { childList: true, subtree: true });
}
