// Astrion OS — Intent Step Executor (M1.P3)
//
// Takes a parsed Intent, resolves it to a Capability, runs the capability
// through the runCapability wrapper, and emits events at each step so the
// Spotlight UI (M1.P4) can show live progress.
//
// Currently executes single-step intents (one capability per intent). Multi-
// step chains (e.g., "find notes about X and email them to Y") come in M1.P5+
// via an intent planner.
//
// Event flow:
//   intent:execute (from Spotlight) → executeIntent()
//     → intent:started                  { intent, cap }
//     → capability:start                (emitted by runCapability)
//     → capability:success OR error     (emitted by runCapability)
//     → intent:completed                { intent, result, success }
//   OR intent:rejected                  { intent, reason }

import { resolveCapability, getCapability } from './capability-api.js';
import { eventBus } from './event-bus.js';
import { intentToNaturalLanguage } from './intent-parser.js';

// ═══════════════════════════════════════════════════════════════
// BUDGET TRACKING
// ═══════════════════════════════════════════════════════════════

// Simple daily irreversibility-token budget. Persisted to localStorage.
// When exceeded, the executor asks the user via a Socratic prompt
// (real Socratic loop ships in M6 — for now we just warn).
const DAILY_BUDGET_KEY = 'astrion-budget-day';
const DAILY_TOKEN_LIMIT = 50;

function getTodayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

function getBudgetUsed() {
  const stored = JSON.parse(localStorage.getItem(DAILY_BUDGET_KEY) || '{}');
  const today = getTodayKey();
  if (stored.day !== today) return 0;
  return stored.used || 0;
}

function recordBudgetUsed(tokens) {
  const today = getTodayKey();
  const stored = { day: today, used: getBudgetUsed() + tokens };
  localStorage.setItem(DAILY_BUDGET_KEY, JSON.stringify(stored));
}

export function getRemainingBudget() {
  return Math.max(0, DAILY_TOKEN_LIMIT - getBudgetUsed());
}

// ═══════════════════════════════════════════════════════════════
// EXECUTOR
// ═══════════════════════════════════════════════════════════════

/**
 * Execute a parsed intent. Returns the capability result or a rejection.
 * @param {Intent} intent
 * @returns {Promise<{ok: boolean, result?: any, error?: string}>}
 */
export async function executeIntent(intent) {
  if (!intent) {
    return { ok: false, error: 'No intent to execute' };
  }

  // ─── 1. Resolve to a capability ───
  const cap = resolveCapability(intent);
  if (!cap) {
    const error = `No capability for ${intent.verb} ${intent.target || ''}`;
    eventBus.emit('intent:rejected', { intent, reason: error });
    console.warn('[intent-executor]', error);
    return { ok: false, error };
  }

  // ─── 2. Budget check ───
  const cost = cap.estimateCost(intent.args);
  const remaining = getRemainingBudget();
  if (cost.irreversibilityTokens > remaining) {
    const error = `Daily budget exceeded (${cost.irreversibilityTokens} > ${remaining} tokens remaining)`;
    eventBus.emit('intent:rejected', { intent, reason: error });
    return { ok: false, error };
  }

  // ─── 3. Announce execution ───
  eventBus.emit('intent:started', {
    intent,
    cap,
    naturalDescription: intentToNaturalLanguage(intent),
    costEstimate: cost,
  });

  console.log(
    `[intent-executor] ${cap.id} (${cost.timeMs}ms, ${cost.irreversibilityTokens} tokens)`,
    intent.args
  );

  // ─── 4. Build args (inject _intent for providers that need context) ───
  const args = { ...intent.args, _intent: intent };

  // ─── 5. Execute via the capability ───
  let result;
  try {
    result = await cap.execute(args);
  } catch (err) {
    const error = err?.message || String(err);
    eventBus.emit('intent:completed', { intent, success: false, error });
    return { ok: false, error };
  }

  // ─── 6. Record budget + emit completion ───
  if (result.ok) {
    recordBudgetUsed(cost.irreversibilityTokens);
  }

  eventBus.emit('intent:completed', {
    intent,
    success: result.ok,
    result,
    error: result.error,
  });

  return result.ok
    ? { ok: true, result: result.output, provenance: result.provenance }
    : { ok: false, error: result.error };
}

// ═══════════════════════════════════════════════════════════════
// AUTO-WIRE: listen for intent:execute events from Spotlight
// ═══════════════════════════════════════════════════════════════

/**
 * Hook the executor into the event bus so any code that emits
 * `intent:execute` automatically triggers this executor.
 */
export function initIntentExecutor() {
  eventBus.on('intent:execute', async (intent) => {
    const result = await executeIntent(intent);
    if (!result.ok) {
      console.warn('[intent-executor] failed:', result.error);
    }
  });
  console.log('[intent-executor] ready, daily budget: ' + getRemainingBudget() + ' tokens');
}
