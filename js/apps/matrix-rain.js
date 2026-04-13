// Astrion OS — Matrix Rain
// Full-screen digital rain effect. Pure canvas animation.
import { processManager } from '../kernel/process-manager.js';

export function registerMatrixRain() {
  processManager.register('matrix-rain', {
    name: 'Matrix Rain', icon: '\u{1F49A}', singleInstance: true, width: 700, height: 500,
    launch: (el) => {
      const canvas = document.createElement('canvas');
      canvas.style.cssText = 'display:block;width:100%;height:100%;background:#000;';
      el.style.cssText = 'height:100%;overflow:hidden;background:#000;';
      el.appendChild(canvas);

      const ctx = canvas.getContext('2d');
      let raf = null;
      let columns = [];
      const FONT_SIZE = 14;
      const CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789@#$%^&*()_+-=[]{}|;:,.<>?/~`\u30A2\u30A4\u30A6\u30A8\u30AA\u30AB\u30AD\u30AF\u30B1\u30B3\u30B5\u30B7\u30B9\u30BB\u30BD\u30BF\u30C1\u30C4\u30C6\u30C8\u30CA\u30CB\u30CC\u30CD\u30CE\u30CF\u30D2\u30D5\u30D8\u30DB\u30DE\u30DF\u30E0\u30E1\u30E2\u30E4\u30E6\u30E8\u30E9\u30EA\u30EB\u30EC\u30ED\u30EF\u30F2\u30F3';

      function resize() {
        canvas.width = el.clientWidth;
        canvas.height = el.clientHeight;
        const colCount = Math.floor(canvas.width / FONT_SIZE);
        columns = [];
        for (let i = 0; i < colCount; i++) {
          columns.push({
            y: Math.random() * canvas.height,
            speed: 0.5 + Math.random() * 1.5,
            chars: [],
          });
        }
      }

      function draw() {
        // Fade effect
        ctx.fillStyle = 'rgba(0, 0, 0, 0.05)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.font = `${FONT_SIZE}px monospace`;

        for (let i = 0; i < columns.length; i++) {
          const col = columns[i];
          const x = i * FONT_SIZE;
          const char = CHARS[Math.floor(Math.random() * CHARS.length)];

          // Head character — bright white-green
          ctx.fillStyle = '#fff';
          ctx.fillText(char, x, col.y);

          // Trail — green with varying brightness
          ctx.fillStyle = `rgba(0, 255, 65, ${0.8 - Math.random() * 0.3})`;
          const prevChar = CHARS[Math.floor(Math.random() * CHARS.length)];
          ctx.fillText(prevChar, x, col.y - FONT_SIZE);

          ctx.fillStyle = `rgba(0, 255, 65, 0.4)`;
          ctx.fillText(CHARS[Math.floor(Math.random() * CHARS.length)], x, col.y - FONT_SIZE * 2);

          col.y += FONT_SIZE * col.speed;

          // Reset column when it goes off screen
          if (col.y > canvas.height + FONT_SIZE * 10) {
            col.y = -FONT_SIZE * (Math.random() * 20);
            col.speed = 0.5 + Math.random() * 1.5;
          }
        }

        raf = requestAnimationFrame(draw);
      }

      resize();
      draw();

      // Handle window resize
      const resizeObserver = new ResizeObserver(resize);
      resizeObserver.observe(el);

      // Cleanup
      const obs = new MutationObserver(() => {
        if (!el.isConnected) {
          if (raf) cancelAnimationFrame(raf);
          resizeObserver.disconnect();
          obs.disconnect();
        }
      });
      if (el.parentElement) obs.observe(el.parentElement, { childList: true, subtree: true });
    },
  });
}
