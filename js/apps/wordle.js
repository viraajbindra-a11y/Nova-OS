// ASTRION OS — Wordle
import { processManager } from '../kernel/process-manager.js';

export function registerWordle() {
  processManager.register('wordle', {
    name: 'Wordle',
    icon: '🟩',
    singleInstance: true,
    width: 380,
    height: 520,
    launch: (el) => initWordle(el)
  });
}

const WORDS = [
  'apple','brain','crane','delta','eagle','flame','grape','hover','ivory','joker',
  'knelt','lemon','mango','noble','ocean','piano','queen','river','stone','tiger',
  'ultra','vivid','wheat','xenon','yield','zonal','blank','charm','drift','epoch',
  'frost','glyph','haste','irony','jewel','kiosk','lunar','mercy','nexus','oxide',
  'prism','quest','reign','solar','truce','unity','voter','world','yacht','zebra',
  'abode','bliss','caulk','dough','ensue','fiord','grout','heist','inlet','jaunt',
  'kudos','llama','moose','nerdy','optic','plumb','quilt','roost','shrub','tapir',
  'usher','vigor','whelp','xerox','yeast','zippy','azure','boost','cliff','dwelt',
  'elbow','flint','gummy','hutch','icing','jumbo','knack','lodge','mount','nifty',
  'olive','perch','query','rumba','swirl','thyme','unfed','vowel','wreck','xeric',
];

function initWordle(container) {
  let target = WORDS[Math.floor(Math.random() * WORDS.length)].toUpperCase();
  let guesses = [];
  let currentGuess = '';
  let gameOver = false;
  let message = '';
  const MAX_GUESSES = 6;

  function getLetterState(guess, idx) {
    const letter = guess[idx];
    if (target[idx] === letter) return 'correct';
    if (target.includes(letter)) {
      // Check if this is a duplicate that's already matched elsewhere
      const targetCount = [...target].filter(c => c === letter).length;
      const correctCount = [...guess].filter((c, i) => c === letter && target[i] === letter).length;
      const priorPresent = [...guess].slice(0, idx).filter((c, i) => c === letter && target[i] !== letter).length;
      if (correctCount + priorPresent < targetCount) return 'present';
    }
    return 'absent';
  }

  function getKeyboardState() {
    const states = {};
    for (const guess of guesses) {
      for (let i = 0; i < 5; i++) {
        const letter = guess[i];
        const state = getLetterState(guess, i);
        if (state === 'correct') states[letter] = 'correct';
        else if (state === 'present' && states[letter] !== 'correct') states[letter] = 'present';
        else if (state === 'absent' && !states[letter]) states[letter] = 'absent';
      }
    }
    return states;
  }

  function render() {
    const accent = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() || '#007aff';
    const keyStates = getKeyboardState();
    const colors = { correct: '#538d4e', present: '#b59f3b', absent: '#3a3a3c' };

    container.innerHTML = `
      <div style="display:flex;flex-direction:column;height:100%;background:#121213;color:white;font-family:var(--font,system-ui);padding:12px;align-items:center;" tabindex="0">
        <div style="font-size:16px;font-weight:700;letter-spacing:2px;margin-bottom:4px;">WORDLE</div>
        ${message ? `<div style="font-size:12px;color:${gameOver && guesses[guesses.length-1] === target ? '#538d4e' : '#b59f3b'};margin-bottom:4px;">${message}</div>` : '<div style="height:18px;"></div>'}
        <div style="display:flex;flex-direction:column;gap:5px;margin-bottom:12px;">
          ${Array.from({length: MAX_GUESSES}, (_, row) => {
            const guess = guesses[row];
            const isCurrent = row === guesses.length && !gameOver;
            return `<div style="display:flex;gap:5px;">
              ${Array.from({length: 5}, (_, col) => {
                let letter = '', bg = 'rgba(255,255,255,0.08)', border = 'rgba(255,255,255,0.15)';
                if (guess) {
                  letter = guess[col];
                  const state = getLetterState(guess, col);
                  bg = colors[state]; border = bg;
                } else if (isCurrent && col < currentGuess.length) {
                  letter = currentGuess[col];
                  border = 'rgba(255,255,255,0.4)';
                }
                return `<div style="width:46px;height:46px;display:flex;align-items:center;justify-content:center;
                  font-size:22px;font-weight:700;border-radius:4px;background:${bg};border:2px solid ${border};
                  ${guess ? 'animation:wordle-flip 0.3s ease;' : ''}">${letter}</div>`;
              }).join('')}
            </div>`;
          }).join('')}
        </div>
        <div style="display:flex;flex-direction:column;gap:5px;align-items:center;">
          ${['QWERTYUIOP','ASDFGHJKL','⏎ZXCVBNM⌫'].map(row => `
            <div style="display:flex;gap:4px;">
              ${[...row].map(key => {
                const isSpecial = key === '⏎' || key === '⌫';
                const state = keyStates[key];
                const bg = state ? colors[state] : 'rgba(255,255,255,0.12)';
                return `<button class="wordle-key" data-key="${key}" style="
                  padding:0;width:${isSpecial ? '42px' : '28px'};height:36px;border-radius:4px;border:none;
                  background:${bg};color:white;font-size:${isSpecial ? '14px' : '12px'};font-weight:600;cursor:pointer;
                ">${key}</button>`;
              }).join('')}
            </div>
          `).join('')}
        </div>
        ${gameOver ? `<button class="wordle-new" style="margin-top:10px;padding:8px 20px;border-radius:8px;border:none;background:${accent};color:white;font-size:12px;cursor:pointer;">New Game</button>` : ''}
      </div>
      <style>@keyframes wordle-flip { 0% { transform:scaleY(0); } 100% { transform:scaleY(1); } }</style>
    `;

    const root = container.firstElementChild;
    root.focus();

    root.addEventListener('keydown', handleKey);
    container.querySelectorAll('.wordle-key').forEach(el => {
      el.addEventListener('click', () => pressKey(el.dataset.key));
    });
    if (gameOver) {
      container.querySelector('.wordle-new')?.addEventListener('click', () => {
        target = WORDS[Math.floor(Math.random() * WORDS.length)].toUpperCase();
        guesses = []; currentGuess = ''; gameOver = false; message = '';
        render();
      });
    }
  }

  function handleKey(e) {
    if (gameOver) return;
    if (e.key === 'Enter') pressKey('⏎');
    else if (e.key === 'Backspace') pressKey('⌫');
    else if (/^[a-zA-Z]$/.test(e.key)) pressKey(e.key.toUpperCase());
  }

  function pressKey(key) {
    if (gameOver) return;
    if (key === '⌫') {
      currentGuess = currentGuess.slice(0, -1);
    } else if (key === '⏎') {
      if (currentGuess.length !== 5) { message = 'Not enough letters'; render(); return; }
      guesses.push(currentGuess);
      if (currentGuess === target) {
        gameOver = true;
        message = ['Genius!','Magnificent!','Impressive!','Splendid!','Great!','Phew!'][guesses.length - 1];
      } else if (guesses.length >= MAX_GUESSES) {
        gameOver = true;
        message = `The word was ${target}`;
      }
      currentGuess = '';
    } else if (currentGuess.length < 5) {
      currentGuess += key;
      message = '';
    }
    render();
  }

  render();
}
