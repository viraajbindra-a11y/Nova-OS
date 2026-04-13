// Astrion OS — Neon Void
// Space shooter by Viraaj Bindra. Embedded from GitHub Pages.
import { processManager } from '../kernel/process-manager.js';

export function registerNeonVoid() {
  processManager.register('neon-void', {
    name: 'Neon Void', icon: '\u{1F680}', singleInstance: true, width: 900, height: 620,
    launch: (el) => {
      el.style.cssText = 'height:100%;overflow:hidden;background:#0a0a1a;';
      el.innerHTML = `
        <iframe src="https://viraajbindra-a11y.github.io/neon-void/"
          style="width:100%;height:100%;border:none;background:#0a0a1a;"
          allow="autoplay; fullscreen"
          sandbox="allow-scripts allow-same-origin allow-popups"
        ></iframe>
      `;
    },
  });
}
