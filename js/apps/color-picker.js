// Astrion OS — Color Picker

import { processManager } from '../kernel/process-manager.js';

export function registerColorPicker() {
  processManager.register('color-picker', {
    name: 'Color Picker',
    icon: '\uD83C\uDFA8',
    singleInstance: true,
    width: 380,
    height: 460,
    launch: (contentEl) => initColorPicker(contentEl),
  });
}

function initColorPicker(container) {
  let h = 210, s = 80, l = 55;
  const SAVED_KEY = 'nova-saved-colors';

  function getSaved() { try { return JSON.parse(localStorage.getItem(SAVED_KEY)) || []; } catch { return []; } }
  function saveSaved(c) { localStorage.setItem(SAVED_KEY, JSON.stringify(c.slice(0, 20))); }

  function render() {
    const hex = hslToHex(h, s, l);
    const rgb = hslToRgb(h, s, l);
    const saved = getSaved();

    container.innerHTML = `
      <div style="display:flex; flex-direction:column; height:100%; font-family:var(--font); color:white; background:#1a1a22; padding:16px; gap:12px;">
        <div id="cp-preview" style="height:100px;border-radius:12px;background:${hex};transition:background 0.1s;"></div>

        <div style="display:flex; gap:8px; align-items:center;">
          <div style="flex:1;font-family:monospace;font-size:18px;font-weight:600;text-align:center;">${hex}</div>
          <button id="cp-copy" style="padding:6px 14px;border-radius:6px;border:none;background:var(--accent);color:white;font-size:11px;cursor:pointer;font-family:var(--font);">Copy</button>
          <button id="cp-save" style="padding:6px 14px;border-radius:6px;border:none;background:rgba(255,255,255,0.08);color:white;font-size:11px;cursor:pointer;font-family:var(--font);">Save</button>
        </div>

        <div style="font-size:11px;color:rgba(255,255,255,0.5);text-align:center;">
          RGB: ${rgb.r}, ${rgb.g}, ${rgb.b} \u00B7 HSL: ${h}, ${s}%, ${l}%
        </div>

        <div>
          <div style="font-size:10px;color:rgba(255,255,255,0.4);margin-bottom:4px;">Hue</div>
          <input type="range" id="cp-h" min="0" max="360" value="${h}" style="width:100%;accent-color:hsl(${h},100%,50%);">
        </div>
        <div>
          <div style="font-size:10px;color:rgba(255,255,255,0.4);margin-bottom:4px;">Saturation</div>
          <input type="range" id="cp-s" min="0" max="100" value="${s}" style="width:100%;accent-color:${hex};">
        </div>
        <div>
          <div style="font-size:10px;color:rgba(255,255,255,0.4);margin-bottom:4px;">Lightness</div>
          <input type="range" id="cp-l" min="0" max="100" value="${l}" style="width:100%;accent-color:${hex};">
        </div>

        ${saved.length > 0 ? `
          <div style="font-size:10px;color:rgba(255,255,255,0.4);margin-top:4px;">Saved Colors</div>
          <div style="display:flex;flex-wrap:wrap;gap:6px;">
            ${saved.map(c => `<div class="cp-saved" data-hex="${c}" style="width:28px;height:28px;border-radius:6px;background:${c};cursor:pointer;border:2px solid rgba(255,255,255,0.1);"></div>`).join('')}
          </div>
        ` : ''}
      </div>
    `;

    ['h','s','l'].forEach(key => {
      container.querySelector(`#cp-${key}`).addEventListener('input', (e) => {
        if (key === 'h') h = parseInt(e.target.value);
        if (key === 's') s = parseInt(e.target.value);
        if (key === 'l') l = parseInt(e.target.value);
        render();
      });
    });

    container.querySelector('#cp-copy').addEventListener('click', () => {
      navigator.clipboard.writeText(hex);
      container.querySelector('#cp-copy').textContent = 'Copied!';
      setTimeout(() => render(), 1000);
    });

    container.querySelector('#cp-save').addEventListener('click', () => {
      const s2 = getSaved();
      if (!s2.includes(hex)) { s2.unshift(hex); saveSaved(s2); render(); }
    });

    container.querySelectorAll('.cp-saved').forEach(el => {
      el.addEventListener('click', () => {
        const rgb2 = hexToHsl(el.dataset.hex);
        h = rgb2.h; s = rgb2.s; l = rgb2.l;
        render();
      });
    });
  }

  function hslToHex(h,s,l) {
    s/=100;l/=100;
    const a=s*Math.min(l,1-l);
    const f=n=>{const k=(n+h/30)%12;return Math.round(255*(l-a*Math.max(Math.min(k-3,9-k,1),-1)));};
    return `#${[f(0),f(8),f(4)].map(x=>x.toString(16).padStart(2,'0')).join('')}`;
  }

  function hslToRgb(h,s,l) {
    s/=100;l/=100;
    const a=s*Math.min(l,1-l);
    const f=n=>{const k=(n+h/30)%12;return Math.round(255*(l-a*Math.max(Math.min(k-3,9-k,1),-1)));};
    return {r:f(0),g:f(8),b:f(4)};
  }

  function hexToHsl(hex) {
    let r=parseInt(hex.slice(1,3),16)/255,g=parseInt(hex.slice(3,5),16)/255,b=parseInt(hex.slice(5,7),16)/255;
    const max=Math.max(r,g,b),min=Math.min(r,g,b),l2=(max+min)/2;
    let h2=0,s2=0;
    if(max!==min){const d=max-min;s2=l2>0.5?d/(2-max-min):d/(max+min);
    if(max===r)h2=((g-b)/d+(g<b?6:0))*60;else if(max===g)h2=((b-r)/d+2)*60;else h2=((r-g)/d+4)*60;}
    return {h:Math.round(h2),s:Math.round(s2*100),l:Math.round(l2*100)};
  }

  render();
}
