// Astrion OS — Focus Trap Utility (Polish Sprint Day 8)
//
// Traps Tab / Shift+Tab within a root element so keyboard users can't
// accidentally tab out of a modal dialog. Also handles Escape via an
// optional onEscape callback.
//
// Usage:
//   import { trapFocus } from '../shell/focus-trap.js';
//   const release = trapFocus(myDialogEl, { onEscape: () => closeDialog() });
//   // ...later, when the dialog closes:
//   release();

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
  '[contenteditable="true"]',
].join(',');

function getFocusable(root) {
  if (!root) return [];
  return Array.from(root.querySelectorAll(FOCUSABLE_SELECTOR))
    .filter(el => !el.disabled && el.offsetParent !== null);
}

/**
 * Install a focus trap on `root`. Returns a `release()` function that
 * removes the trap and restores focus to the element that had it
 * before the trap was installed.
 *
 * Options:
 *   onEscape   — called when the Escape key is pressed (common "close"
 *                pattern). If not provided, Escape falls through.
 *   initialFocus — element (or CSS selector) to focus immediately.
 *                  Defaults to the first focusable descendant.
 *   returnFocus — element to focus when the trap is released.
 *                 Defaults to whatever had focus before install.
 */
export function trapFocus(root, options = {}) {
  if (!root || !(root instanceof HTMLElement)) {
    return () => {};
  }
  const previousActive = options.returnFocus || document.activeElement;
  const onEscape = typeof options.onEscape === 'function' ? options.onEscape : null;

  // Move focus into the trap
  const initial = typeof options.initialFocus === 'string'
    ? root.querySelector(options.initialFocus)
    : options.initialFocus;
  const focusable = getFocusable(root);
  const target = initial || focusable[0] || root;
  if (target && typeof target.focus === 'function') {
    // Let the browser paint the dialog before focusing so scrollIntoView works
    requestAnimationFrame(() => target.focus({ preventScroll: false }));
  }

  function handler(e) {
    if (e.key === 'Tab') {
      const nodes = getFocusable(root);
      if (nodes.length === 0) {
        e.preventDefault();
        return;
      }
      const first = nodes[0];
      const last = nodes[nodes.length - 1];
      const active = document.activeElement;
      // Shift+Tab on first → wrap to last
      if (e.shiftKey && active === first) {
        e.preventDefault();
        last.focus();
      }
      // Tab on last → wrap to first
      else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
      // Active focus not inside the trap at all → yank it back to first
      else if (!root.contains(active)) {
        e.preventDefault();
        first.focus();
      }
    } else if (e.key === 'Escape' && onEscape) {
      e.preventDefault();
      e.stopPropagation();
      onEscape();
    }
  }

  // Capture = true so we handle Tab before any child handler can cancel it
  document.addEventListener('keydown', handler, true);

  return function release() {
    document.removeEventListener('keydown', handler, true);
    // Restore focus if the element still exists and is focusable
    if (previousActive && previousActive.isConnected && typeof previousActive.focus === 'function') {
      try { previousActive.focus({ preventScroll: true }); } catch (_) {}
    }
  };
}
