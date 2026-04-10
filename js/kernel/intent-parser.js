// Astrion OS — Intent Parser (stub for M1.P1)
//
// This is the seed of the Intent Kernel. It recognizes a tiny set of verbs
// (make / find / open) and converts natural-language queries into structured
// intent objects. It does NOT execute intents yet — real execution happens
// through capability providers in M1.P2+.
//
// For now, Search (spotlight.js) calls parseIntent() on every query and
// logs the result to the console. If parsing succeeds, the intent is also
// emitted on the event bus as `intent:parsed`, so other code can observe
// without coupling to the parser.
//
// Addresses audit hole #2 (small action space) by establishing the shape
// of a typed intent BEFORE we wire up real capabilities.
//
// Example:
//   parseIntent("make a note called shopping with items apples and bread")
//   → {
//       verb: "make",
//       target: "note",
//       args: { name: "shopping", items: ["apples", "bread"] },
//       confidence: 0.75,
//       raw: "make a note called shopping with items apples and bread"
//     }

export const VERBS = ['make', 'find', 'open'];

// Synonyms that collapse to the canonical verb
const VERB_SYNONYMS = {
  make: ['make', 'create', 'new', 'add'],
  find: ['find', 'search', 'show', 'list'],
  open: ['open', 'launch', 'start', 'run'],
};

// Known target types the parser recognizes. Expand cautiously.
// Anything not in this list fails to parse cleanly — that's intentional.
const TARGETS = [
  'note', 'notes',
  'file', 'files',
  'folder', 'folders',
  'todo', 'todos',
  'reminder', 'reminders',
  'app', 'apps',
  'terminal', 'browser', 'editor', 'calculator',
  'notes', 'finder', 'settings',
];

/**
 * Parse a natural-language query into a structured intent.
 * @param {string} query
 * @returns {Intent | null}
 */
export function parseIntent(query) {
  if (!query || typeof query !== 'string') return null;

  const raw = query.trim();
  if (!raw) return null;

  const words = raw.toLowerCase().split(/\s+/).filter(Boolean);
  if (words.length === 0) return null;

  // Find the verb (must be at position 0 or 1, allowing for "please" etc.)
  let verbIdx = -1;
  let canonicalVerb = null;
  for (let i = 0; i < Math.min(2, words.length); i++) {
    for (const [canonical, synonyms] of Object.entries(VERB_SYNONYMS)) {
      if (synonyms.includes(words[i])) {
        verbIdx = i;
        canonicalVerb = canonical;
        break;
      }
    }
    if (canonicalVerb) break;
  }

  if (!canonicalVerb) return null;

  // Find the target (first TARGETS match after the verb)
  let targetIdx = -1;
  let target = null;
  for (let i = verbIdx + 1; i < words.length; i++) {
    // Strip articles and determiners
    if (['a', 'an', 'the', 'my'].includes(words[i])) continue;
    if (TARGETS.includes(words[i])) {
      target = singular(words[i]);
      targetIdx = i;
      break;
    }
  }

  if (!target) return null;

  // Everything after the target is args (free-form for now; real schema lands in M1.P2)
  const argsPortion = words.slice(targetIdx + 1).join(' ');
  const args = extractArgs(canonicalVerb, target, argsPortion);

  // Confidence heuristic: verb + target + args all present = 0.85
  // Missing args = 0.7
  // Multi-word target = -0.1
  let confidence = 0.85;
  if (!argsPortion) confidence -= 0.15;

  return {
    verb: canonicalVerb,
    target,
    args,
    confidence,
    raw,
    parsedAt: Date.now(),
  };
}

function singular(word) {
  if (word.endsWith('s') && word.length > 1) return word.slice(0, -1);
  return word;
}

function extractArgs(verb, target, argsText) {
  if (!argsText) return {};

  // very lightweight extraction — full schema comes in M1.P2
  const args = { _rawArgs: argsText };

  // "called NAME" or "named NAME"
  const calledMatch = argsText.match(/(?:called|named)\s+(\w+)/i);
  if (calledMatch) args.name = calledMatch[1];

  // "with items X and Y and Z" or "with X, Y, Z"
  const itemsMatch = argsText.match(/with\s+(?:items\s+)?(.+)/i);
  if (itemsMatch) {
    const itemsText = itemsMatch[1];
    args.items = itemsText
      .split(/\s*,\s*|\s+and\s+/)
      .map(s => s.trim())
      .filter(Boolean);
  }

  // "about TOPIC" — search target
  const aboutMatch = argsText.match(/about\s+(.+)/i);
  if (aboutMatch) args.topic = aboutMatch[1].trim();

  return args;
}

/**
 * Format an intent as a human-readable summary for display in Search.
 * @param {Intent} intent
 * @returns {string}
 */
export function summarizeIntent(intent) {
  if (!intent) return '';
  const confPct = Math.round(intent.confidence * 100);
  const argsStr = Object.entries(intent.args)
    .filter(([k]) => !k.startsWith('_'))
    .map(([k, v]) => `${k}=${Array.isArray(v) ? `[${v.join(', ')}]` : v}`)
    .join(', ');
  return `${intent.verb} ${intent.target}${argsStr ? ' { ' + argsStr + ' }' : ''} (${confPct}%)`;
}

// Inline sanity checks — run once at import time in dev.
// These will catch obvious regressions during the M1 build-out.
if (typeof window !== 'undefined' && window.location?.hostname === 'localhost') {
  const tests = [
    { input: 'make a note called shopping', expect: { verb: 'make', target: 'note' } },
    { input: 'find notes about school', expect: { verb: 'find', target: 'note' } },
    { input: 'open terminal', expect: { verb: 'open', target: 'terminal' } },
    { input: 'create a new todo called homework', expect: { verb: 'make', target: 'todo' } },
    { input: 'random text that is not an intent', expect: null },
    { input: '', expect: null },
  ];

  for (const t of tests) {
    const result = parseIntent(t.input);
    if (t.expect === null && result !== null) {
      console.warn('[intent-parser] unexpected parse:', t.input, '→', result);
    } else if (t.expect !== null) {
      if (!result || result.verb !== t.expect.verb || result.target !== t.expect.target) {
        console.warn('[intent-parser] test failed:', t.input, '→', result);
      }
    }
  }
}

/**
 * @typedef {object} Intent
 * @property {'make' | 'find' | 'open'} verb
 * @property {string} target
 * @property {object} args
 * @property {number} confidence
 * @property {string} raw
 * @property {number} parsedAt
 */
