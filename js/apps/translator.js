// Astrion OS — Translator
// Uses LibreTranslate API or AI for translation.

import { processManager } from '../kernel/process-manager.js';
import { aiService } from '../kernel/ai-service.js';

export function registerTranslator() {
  processManager.register('translator', {
    name: 'Translator',
    icon: '\uD83C\uDF10',
    singleInstance: true,
    width: 650,
    height: 460,
    launch: (contentEl) => initTranslator(contentEl),
  });
}

function initTranslator(container) {
  const LANGS = ['English','Spanish','French','German','Italian','Portuguese','Japanese','Chinese','Korean','Arabic','Hindi','Russian'];
  let fromLang = 'English', toLang = 'Spanish';

  function render() {
    container.innerHTML = `
      <div style="display:flex; flex-direction:column; height:100%; font-family:var(--font); color:white; background:#1a1a22; padding:16px; gap:12px;">
        <div style="display:flex; gap:8px; align-items:center;">
          <select id="tr-from" style="flex:1;padding:8px 12px;border-radius:8px;border:1px solid rgba(255,255,255,0.1);background:#2a2a3a;color:white;font-family:var(--font);font-size:13px;">
            ${LANGS.map(l => `<option ${l===fromLang?'selected':''}>${l}</option>`).join('')}
          </select>
          <button id="tr-swap" style="padding:8px 12px;border-radius:8px;border:none;background:rgba(255,255,255,0.08);color:white;cursor:pointer;font-size:16px;">\u21C4</button>
          <select id="tr-to" style="flex:1;padding:8px 12px;border-radius:8px;border:1px solid rgba(255,255,255,0.1);background:#2a2a3a;color:white;font-family:var(--font);font-size:13px;">
            ${LANGS.map(l => `<option ${l===toLang?'selected':''}>${l}</option>`).join('')}
          </select>
        </div>
        <div style="display:flex; gap:12px; flex:1;">
          <textarea id="tr-input" placeholder="Type text to translate..." style="flex:1;padding:12px;border-radius:10px;border:1px solid rgba(255,255,255,0.08);background:rgba(255,255,255,0.04);color:white;font-size:14px;font-family:var(--font);outline:none;resize:none;line-height:1.6;"></textarea>
          <div id="tr-output" style="flex:1;padding:12px;border-radius:10px;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);font-size:14px;line-height:1.6;color:rgba(255,255,255,0.8);overflow-y:auto;">Translation appears here</div>
        </div>
        <button id="tr-go" style="padding:12px;border-radius:10px;border:none;background:var(--accent);color:white;font-size:14px;font-weight:600;cursor:pointer;font-family:var(--font);">Translate</button>
      </div>
    `;

    container.querySelector('#tr-swap').addEventListener('click', () => {
      [fromLang, toLang] = [toLang, fromLang];
      render();
    });
    container.querySelector('#tr-from').addEventListener('change', (e) => { fromLang = e.target.value; });
    container.querySelector('#tr-to').addEventListener('change', (e) => { toLang = e.target.value; });

    container.querySelector('#tr-go').addEventListener('click', async () => {
      const input = container.querySelector('#tr-input').value.trim();
      if (!input) return;
      const output = container.querySelector('#tr-output');
      const btn = container.querySelector('#tr-go');
      btn.textContent = 'Translating...';
      btn.disabled = true;
      try {
        const result = await aiService.ask(`Translate the following text from ${fromLang} to ${toLang}. Only output the translation, nothing else:\n\n${input}`);
        output.textContent = result;
      } catch {
        output.textContent = 'Translation failed. Check your AI connection in Settings.';
      }
      btn.textContent = 'Translate';
      btn.disabled = false;
    });
  }
  render();
}
