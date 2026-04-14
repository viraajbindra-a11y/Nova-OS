// ASTRION OS — Emoji Kitchen
import { processManager } from '../kernel/process-manager.js';

export function registerEmojiKitchen() {
  processManager.register('emoji-kitchen', {
    name: 'Emoji Kitchen',
    icon: '🧪',
    singleInstance: true,
    width: 400,
    height: 520,
    launch: (el) => initEmojiKitchen(el)
  });
}

function initEmojiKitchen(container) {
  const EMOJIS = ['😀','😂','🥺','😎','🤔','😡','💀','👻','🤖','👽',
    '❤️','🔥','⭐','🌈','🎉','💎','🦄','🐱','🐶','🐸',
    '🌸','🌙','☀️','🌊','🍕','🍩','🎮','🎸','🚀','⚡',
    '🧠','👑','🦋','🌺','🍔','🎭','🏆','💫','🎯','🔮'];

  const MIX_RESULTS = {
    '😀+🔥': { result: '🥵', desc: 'Hot and happy — absolutely burning with joy!' },
    '😀+❤️': { result: '🥰', desc: 'Love makes everything better — pure happiness!' },
    '😂+💀': { result: '☠️', desc: 'Literally dead from laughing!' },
    '🐱+🐶': { result: '🐾', desc: 'Best friends forever — the ultimate pet combo!' },
    '🔥+🌊': { result: '💨', desc: 'Fire meets water — steam explosion!' },
    '⭐+🌙': { result: '✨', desc: 'Night sky magic — sparkling constellation!' },
    '🚀+🌙': { result: '🛸', desc: 'Rocket to the moon — space explorer!' },
    '🍕+🍩': { result: '🤤', desc: 'The ultimate cheat meal — carb heaven!' },
    '🧠+⚡': { result: '💡', desc: 'Brain + electricity = brilliant idea!' },
    '👑+💎': { result: '👸', desc: 'Crown jewels — royalty achieved!' },
    '🐸+☀️': { result: '🌻', desc: 'Happy frog in the sunshine — pure vibes!' },
    '🎮+🔥': { result: '🏆', desc: 'Gaming on fire — unstoppable gamer!' },
    '😡+🌊': { result: '😤', desc: 'Anger washed away... almost!' },
    '🤖+❤️': { result: '💝', desc: 'Even robots can love!' },
    '👻+🌙': { result: '🎃', desc: 'Spooky night — Halloween vibes!' },
    '🎸+⚡': { result: '🤘', desc: 'Electric guitar solo — rock and roll!' },
    '🌸+🌈': { result: '🏵️', desc: 'Rainbow flower — nature at its most magical!' },
    '🦄+🌈': { result: '🫧', desc: 'Unicorn rainbow — pure fantasy bubble!' },
    '💀+👑': { result: '💀', desc: 'King of the underworld — skull royalty!' },
    '🐱+👑': { result: '😺', desc: 'Your cat already thinks it\'s royalty!' },
  };

  let picked = [null, null];
  let result = null;

  function getMixKey(a, b) {
    return `${a}+${b}`;
  }

  function mix(a, b) {
    const key1 = getMixKey(a, b);
    const key2 = getMixKey(b, a);
    if (MIX_RESULTS[key1]) return MIX_RESULTS[key1];
    if (MIX_RESULTS[key2]) return MIX_RESULTS[key2];
    // Generate a fun random result
    const combos = [
      { result: '✨', desc: `${a} meets ${b} — sparks fly!` },
      { result: '💫', desc: `${a} and ${b} create cosmic energy!` },
      { result: '🌀', desc: `${a} swirls into ${b} — a vortex of vibes!` },
      { result: '🎪', desc: `${a} + ${b} = a whole circus!` },
      { result: '🫠', desc: `${a} melts into ${b} — what a combo!` },
      { result: '🤯', desc: `${a} combined with ${b} — mind blown!` },
      { result: '🪄', desc: `${a} and ${b} — pure magic!` },
      { result: '💥', desc: `${a} collides with ${b} — BOOM!` },
    ];
    // Deterministic pick based on the emoji pair
    const hash = (a.codePointAt(0) + b.codePointAt(0)) % combos.length;
    return combos[hash];
  }

  function render() {
    const accent = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() || '#007aff';
    container.innerHTML = `
      <div style="display:flex;flex-direction:column;height:100%;background:#1a1a2e;color:white;font-family:var(--font,system-ui);padding:16px;gap:12px;">
        <div style="text-align:center;font-size:14px;font-weight:600;">Emoji Kitchen 🧪</div>
        <div style="text-align:center;font-size:11px;color:rgba(255,255,255,0.4);">Pick two emojis to mix them!</div>

        <div style="display:flex;align-items:center;justify-content:center;gap:12px;padding:16px 0;">
          <div class="ek-slot" data-slot="0" style="
            width:64px;height:64px;border-radius:16px;background:rgba(255,255,255,0.06);
            display:flex;align-items:center;justify-content:center;font-size:36px;
            border:2px dashed ${picked[0] ? 'transparent' : 'rgba(255,255,255,0.15)'};cursor:pointer;
          ">${picked[0] || '?'}</div>
          <div style="font-size:24px;color:rgba(255,255,255,0.3);">+</div>
          <div class="ek-slot" data-slot="1" style="
            width:64px;height:64px;border-radius:16px;background:rgba(255,255,255,0.06);
            display:flex;align-items:center;justify-content:center;font-size:36px;
            border:2px dashed ${picked[1] ? 'transparent' : 'rgba(255,255,255,0.15)'};cursor:pointer;
          ">${picked[1] || '?'}</div>
          <div style="font-size:24px;color:rgba(255,255,255,0.3);">=</div>
          <div style="
            width:64px;height:64px;border-radius:16px;background:${result ? `rgba(255,255,255,0.08)` : 'rgba(255,255,255,0.03)'};
            display:flex;align-items:center;justify-content:center;font-size:36px;
            ${result ? 'animation:ek-pop 0.3s ease;' : ''}
          ">${result ? result.result : '?'}</div>
        </div>

        ${result ? `<div style="text-align:center;font-size:13px;color:rgba(255,255,255,0.7);padding:0 20px;line-height:1.5;">${result.desc}</div>` : ''}

        <div style="display:flex;gap:6px;justify-content:center;">
          <button class="ek-mix" style="padding:8px 24px;border-radius:10px;border:none;background:${accent};color:white;font-size:13px;font-weight:600;cursor:pointer;
            opacity:${picked[0] && picked[1] ? '1' : '0.4'};">Mix!</button>
          <button class="ek-clear" style="padding:8px 16px;border-radius:10px;border:none;background:rgba(255,255,255,0.06);color:white;font-size:13px;cursor:pointer;">Clear</button>
        </div>

        <div style="flex:1;overflow-y:auto;display:grid;grid-template-columns:repeat(8,1fr);gap:4px;align-content:start;padding-top:8px;">
          ${EMOJIS.map(e => `<div class="ek-emoji" data-emoji="${e}" style="
            display:flex;align-items:center;justify-content:center;font-size:22px;
            padding:6px;border-radius:8px;cursor:pointer;transition:background 0.15s, transform 0.1s;
          ">${e}</div>`).join('')}
        </div>
      </div>
      <style>
        @keyframes ek-pop { 0% { transform:scale(0.5); } 50% { transform:scale(1.2); } 100% { transform:scale(1); } }
        .ek-emoji:hover { background:rgba(255,255,255,0.08); transform:scale(1.15); }
        .ek-slot:hover { background:rgba(255,255,255,0.1) !important; }
      </style>
    `;

    // Pick emoji
    container.querySelectorAll('.ek-emoji').forEach(el => {
      el.addEventListener('click', () => {
        const emoji = el.dataset.emoji;
        if (!picked[0]) { picked[0] = emoji; }
        else if (!picked[1]) { picked[1] = emoji; }
        else { picked[0] = emoji; picked[1] = null; result = null; }
        render();
      });
    });

    // Click slots to clear them
    container.querySelectorAll('.ek-slot').forEach(el => {
      el.addEventListener('click', () => {
        const slot = +el.dataset.slot;
        picked[slot] = null;
        result = null;
        render();
      });
    });

    // Mix button
    container.querySelector('.ek-mix').addEventListener('click', () => {
      if (picked[0] && picked[1]) {
        result = mix(picked[0], picked[1]);
        render();
      }
    });

    // Clear
    container.querySelector('.ek-clear').addEventListener('click', () => {
      picked = [null, null];
      result = null;
      render();
    });
  }

  render();
}
