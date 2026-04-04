// NOVA OS — Calculator App

import { processManager } from '../kernel/process-manager.js';

export function registerCalculator() {
  processManager.register('calculator', {
    name: 'Calculator',
    icon: '\uD83D\uDDA9',
    iconClass: 'dock-icon-calculator',
    singleInstance: true,
    width: 280,
    height: 420,
    minWidth: 250,
    minHeight: 380,
    launch: (contentEl) => {
      initCalculator(contentEl);
    }
  });
}

function initCalculator(container) {
  let display = '0';
  let expression = '';
  let shouldReset = false;
  let lastOperator = null;
  let lastOperand = null;

  container.innerHTML = `
    <div class="calculator-app">
      <div class="calculator-display">
        <div class="calculator-expression" id="calc-expr"></div>
        <div class="calculator-result" id="calc-result">0</div>
      </div>
      <div class="calculator-buttons">
        <button class="calc-btn function" data-action="clear">AC</button>
        <button class="calc-btn function" data-action="negate">+/-</button>
        <button class="calc-btn function" data-action="percent">%</button>
        <button class="calc-btn operator" data-action="operator" data-op="/">\u00F7</button>
        <button class="calc-btn" data-action="number" data-num="7">7</button>
        <button class="calc-btn" data-action="number" data-num="8">8</button>
        <button class="calc-btn" data-action="number" data-num="9">9</button>
        <button class="calc-btn operator" data-action="operator" data-op="*">\u00D7</button>
        <button class="calc-btn" data-action="number" data-num="4">4</button>
        <button class="calc-btn" data-action="number" data-num="5">5</button>
        <button class="calc-btn" data-action="number" data-num="6">6</button>
        <button class="calc-btn operator" data-action="operator" data-op="-">\u2212</button>
        <button class="calc-btn" data-action="number" data-num="1">1</button>
        <button class="calc-btn" data-action="number" data-num="2">2</button>
        <button class="calc-btn" data-action="number" data-num="3">3</button>
        <button class="calc-btn operator" data-action="operator" data-op="+">+</button>
        <button class="calc-btn zero" data-action="number" data-num="0">0</button>
        <button class="calc-btn" data-action="decimal">.</button>
        <button class="calc-btn operator equals" data-action="equals">=</button>
      </div>
    </div>
  `;

  const resultEl = container.querySelector('#calc-result');
  const exprEl = container.querySelector('#calc-expr');

  container.querySelector('.calculator-buttons').addEventListener('click', (e) => {
    const btn = e.target.closest('.calc-btn');
    if (!btn) return;

    const action = btn.dataset.action;

    switch (action) {
      case 'number':
        if (shouldReset) {
          display = '';
          shouldReset = false;
        }
        if (display === '0' && btn.dataset.num !== '0') {
          display = btn.dataset.num;
        } else if (display !== '0' || btn.dataset.num !== '0') {
          display += btn.dataset.num;
        }
        if (display.length > 12) display = display.slice(0, 12);
        break;

      case 'decimal':
        if (shouldReset) {
          display = '0';
          shouldReset = false;
        }
        if (!display.includes('.')) {
          display += '.';
        }
        break;

      case 'operator': {
        const op = btn.dataset.op;
        if (lastOperator && !shouldReset) {
          const result = calculate(parseFloat(expression), lastOperator, parseFloat(display));
          display = formatNumber(result);
          expression = display;
        } else {
          expression = display;
        }
        lastOperator = op;
        shouldReset = true;

        // Highlight active operator
        container.querySelectorAll('.operator').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        const opSymbol = { '/': '\u00F7', '*': '\u00D7', '-': '\u2212', '+': '+' }[op];
        exprEl.textContent = `${expression} ${opSymbol}`;
        break;
      }

      case 'equals':
        if (lastOperator) {
          lastOperand = parseFloat(display);
          const result = calculate(parseFloat(expression), lastOperator, lastOperand);
          exprEl.textContent = `${expression} ${lastOperator} ${display} =`;
          display = formatNumber(result);
          lastOperator = null;
          expression = '';
          shouldReset = true;
        }
        container.querySelectorAll('.operator').forEach(b => b.classList.remove('active'));
        break;

      case 'clear':
        display = '0';
        expression = '';
        lastOperator = null;
        lastOperand = null;
        shouldReset = false;
        exprEl.textContent = '';
        container.querySelectorAll('.operator').forEach(b => b.classList.remove('active'));
        break;

      case 'negate':
        if (display !== '0') {
          display = display.startsWith('-') ? display.slice(1) : '-' + display;
        }
        break;

      case 'percent':
        display = formatNumber(parseFloat(display) / 100);
        break;
    }

    resultEl.textContent = display;

    // Shrink font for long numbers
    if (display.length > 8) {
      resultEl.style.fontSize = Math.max(24, 42 - (display.length - 8) * 3) + 'px';
    } else {
      resultEl.style.fontSize = '42px';
    }
  });

  // Keyboard support
  container.addEventListener('keydown', (e) => {
    const key = e.key;
    if (key >= '0' && key <= '9') {
      container.querySelector(`[data-num="${key}"]`)?.click();
    } else if (key === '.') {
      container.querySelector('[data-action="decimal"]')?.click();
    } else if (key === '+' || key === '-' || key === '*' || key === '/') {
      container.querySelector(`[data-op="${key}"]`)?.click();
    } else if (key === 'Enter' || key === '=') {
      container.querySelector('[data-action="equals"]')?.click();
    } else if (key === 'Escape' || key === 'c' || key === 'C') {
      container.querySelector('[data-action="clear"]')?.click();
    } else if (key === 'Backspace') {
      if (display.length > 1) {
        display = display.slice(0, -1);
      } else {
        display = '0';
      }
      resultEl.textContent = display;
    }
  });

  // Make focusable for keyboard input
  container.setAttribute('tabindex', '0');
  container.focus();
}

function calculate(a, op, b) {
  switch (op) {
    case '+': return a + b;
    case '-': return a - b;
    case '*': return a * b;
    case '/': return b !== 0 ? a / b : 0;
    default: return b;
  }
}

function formatNumber(num) {
  if (!isFinite(num)) return 'Error';
  const str = num.toPrecision(10);
  // Remove trailing zeros after decimal
  return parseFloat(str).toString();
}
