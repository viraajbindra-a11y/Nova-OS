// Astrion OS — Unit Converter

import { processManager } from '../kernel/process-manager.js';

export function registerUnitConverter() {
  processManager.register('unit-converter', {
    name: 'Converter',
    icon: '\uD83D\uDD04',
    singleInstance: true,
    width: 420,
    height: 480,
    launch: (contentEl) => initConverter(contentEl),
  });
}

function initConverter(container) {
  const CATEGORIES = {
    Length: { units: ['m','km','mi','ft','in','cm','mm','yd'], base: 'm',
      factors: { m:1, km:1000, mi:1609.344, ft:0.3048, in:0.0254, cm:0.01, mm:0.001, yd:0.9144 }},
    Weight: { units: ['kg','g','lb','oz','mg','ton'], base: 'kg',
      factors: { kg:1, g:0.001, lb:0.453592, oz:0.0283495, mg:0.000001, ton:1000 }},
    Temperature: { units: ['°C','°F','K'], base: '°C', custom: true },
    Volume: { units: ['L','mL','gal','qt','cup','fl oz'], base: 'L',
      factors: { L:1, mL:0.001, gal:3.78541, qt:0.946353, cup:0.236588, 'fl oz':0.0295735 }},
    Speed: { units: ['m/s','km/h','mph','knots'], base: 'm/s',
      factors: { 'm/s':1, 'km/h':0.277778, mph:0.44704, knots:0.514444 }},
    Data: { units: ['B','KB','MB','GB','TB'], base: 'B',
      factors: { B:1, KB:1024, MB:1048576, GB:1073741824, TB:1099511627776 }},
  };

  let category = 'Length';
  let fromUnit = 'm', toUnit = 'km';

  function convert(value, from, to, cat) {
    if (cat === 'Temperature') {
      let celsius;
      if (from === '°C') celsius = value;
      else if (from === '°F') celsius = (value - 32) * 5/9;
      else celsius = value - 273.15;
      if (to === '°C') return celsius;
      if (to === '°F') return celsius * 9/5 + 32;
      return celsius + 273.15;
    }
    const f = CATEGORIES[cat].factors;
    return (value * f[from]) / f[to];
  }

  function render() {
    const cat = CATEGORIES[category];
    container.innerHTML = `
      <div style="display:flex; flex-direction:column; height:100%; font-family:var(--font); color:white; background:#1a1a22; padding:20px; gap:16px;">
        <div style="font-size:16px; font-weight:600; text-align:center;">Unit Converter</div>
        <div style="display:flex; flex-wrap:wrap; gap:6px; justify-content:center;">
          ${Object.keys(CATEGORIES).map(c => `
            <button class="uc-cat" data-cat="${c}" style="padding:6px 14px;border-radius:16px;border:none;
              background:${c===category?'var(--accent)':'rgba(255,255,255,0.06)'};
              color:white;font-size:11px;cursor:pointer;font-family:var(--font);">${c}</button>
          `).join('')}
        </div>
        <div style="background:rgba(255,255,255,0.03);border-radius:12px;padding:16px;">
          <input type="number" id="uc-input" value="1" style="width:100%;padding:12px;border-radius:8px;border:1px solid rgba(255,255,255,0.1);background:rgba(255,255,255,0.05);color:white;font-size:24px;font-family:var(--font);outline:none;text-align:center;box-sizing:border-box;">
          <select id="uc-from" style="width:100%;margin-top:8px;padding:8px;border-radius:8px;border:1px solid rgba(255,255,255,0.1);background:#2a2a3a;color:white;font-family:var(--font);">
            ${cat.units.map(u => `<option ${u===fromUnit?'selected':''}>${u}</option>`).join('')}
          </select>
        </div>
        <div style="text-align:center;font-size:20px;color:rgba(255,255,255,0.3);">\u2193</div>
        <div style="background:rgba(255,255,255,0.03);border-radius:12px;padding:16px;">
          <div id="uc-result" style="font-size:28px;font-weight:300;text-align:center;padding:12px;font-variant-numeric:tabular-nums;">0</div>
          <select id="uc-to" style="width:100%;margin-top:8px;padding:8px;border-radius:8px;border:1px solid rgba(255,255,255,0.1);background:#2a2a3a;color:white;font-family:var(--font);">
            ${cat.units.map(u => `<option ${u===toUnit?'selected':''}>${u}</option>`).join('')}
          </select>
        </div>
      </div>
    `;

    const input = container.querySelector('#uc-input');
    const result = container.querySelector('#uc-result');
    const fromSel = container.querySelector('#uc-from');
    const toSel = container.querySelector('#uc-to');

    function update() {
      const v = parseFloat(input.value) || 0;
      const r = convert(v, fromSel.value, toSel.value, category);
      result.textContent = Number.isInteger(r) ? r : r.toFixed(6).replace(/0+$/, '').replace(/\.$/, '');
    }

    input.addEventListener('input', update);
    fromSel.addEventListener('change', (e) => { fromUnit = e.target.value; update(); });
    toSel.addEventListener('change', (e) => { toUnit = e.target.value; update(); });

    container.querySelectorAll('.uc-cat').forEach(btn => {
      btn.addEventListener('click', () => {
        category = btn.dataset.cat;
        fromUnit = CATEGORIES[category].units[0];
        toUnit = CATEGORIES[category].units[1];
        render();
      });
    });

    update();
  }
  render();
}
