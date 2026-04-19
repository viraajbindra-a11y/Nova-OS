// Astrion OS — Spec Generator (M4.P1)
//
// First phase of Verifiable Code Generation: convert a user intent
// ("build me a habit tracker app") into a structured, plain-English
// spec that the USER approves BEFORE any code is written.
//
// Why this order matters: spec-first, then tests-from-spec, then
// code-to-pass-tests. Tests generated from code already-written are
// a lie — they just describe what the code does, not what it should
// do. See PLAN.md M4 inversion table for the full argument.
//
// Design:
//   - generateSpec(intent, opts) → { goal, acceptance_criteria[],
//     non_goals[], ux_notes, status: 'draft' }
//   - storeSpec(spec) writes a 'spec' graph node, returns id
//   - freezeSpec(id) marks a draft as approved (status='frozen'),
//     making it immutable. Code-gen MUST reference a frozen spec id.
//   - getSpec(id) reads back. getSpecByIntent(query) is a lookup
//     helper for "did I already approve a spec for this?"
//
// The generator calls aiService.askWithMeta so the brain tag flows
// through for calibration (lesson #100 / #106). JSON parsing is
// tolerant (markdown fences, leading prose) — reuses the same
// pattern as intent-planner.
//
// Non-goals for M4.P1:
//   - Socratic approval UI (Spotlight component comes in M4.P1.b)
//   - Diff-against-previous-spec edit flow (M4.P2+)
//   - Auto-test-generation from spec (M4.P2)

import { aiService } from './ai-service.js';
import { graphStore } from './graph-store.js';
import { query as graphQuery } from './graph-query.js';

const SPEC_TYPE = 'spec';

// ─── Prompt construction ───

function buildSpecPrompt(intent, context = {}) {
  const ctxLines = [];
  if (context.appName) ctxLines.push(`Target app name: ${context.appName}`);
  if (context.platform) ctxLines.push(`Platform: ${context.platform}`);
  if (context.inspiredBy) ctxLines.push(`Inspired by: ${context.inspiredBy}`);
  const ctxBlock = ctxLines.length ? `\nCONTEXT:\n${ctxLines.map(l => '  ' + l).join('\n')}` : '';

  return `You are the Astrion OS spec generator. Turn the user's
intent into a STRUCTURED SPEC — plain-English acceptance criteria that
a test generator can translate into tests, and that the user can
approve or reject BEFORE any code is written.

Respond with ONLY a JSON object, no markdown, no prose, no code fences.

USER INTENT: ${JSON.stringify(intent)}${ctxBlock}

SHAPE:
{
  "goal": "one sentence — what does the user want?",
  "acceptance_criteria": [
    "Given <context>, when <action>, then <observable outcome>.",
    "..."
  ],
  "non_goals": [
    "Explicit things this is NOT responsible for"
  ],
  "ux_notes": "short free-text hints for look/feel, layout, keyboard shortcuts",
  "open_questions": [
    "Any ambiguity the user needs to decide before implementation"
  ]
}

RULES:
1. 3–7 acceptance criteria. Each must be testable. If you cannot
   phrase one as "Given X, when Y, then observable Z", it does not
   belong in acceptance_criteria — put it in ux_notes.
2. non_goals exists to prevent scope creep. At least one, up to five.
3. Do not include implementation details (frameworks, file paths,
   libraries). This is a spec, not an architecture doc.
4. open_questions is for genuine ambiguity only. Leave empty [] if
   the intent is clear.
5. Respond with JSON only, nothing else.`;
}

// ─── JSON parse (same tolerance as intent-planner) ───

function tryParseJSON(raw) {
  if (!raw || typeof raw !== 'string') return null;
  let text = raw.trim();
  text = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '');
  try { return JSON.parse(text); } catch {}
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start === -1 || end === -1 || end <= start) return null;
  try { return JSON.parse(text.slice(start, end + 1)); } catch {}
  return null;
}

// ─── Schema validation ───

function validateSpec(spec) {
  if (!spec || typeof spec !== 'object') return { ok: false, error: 'spec not an object' };
  if (typeof spec.goal !== 'string' || !spec.goal.trim()) {
    return { ok: false, error: 'goal must be a non-empty string' };
  }
  if (!Array.isArray(spec.acceptance_criteria) || spec.acceptance_criteria.length === 0) {
    return { ok: false, error: 'acceptance_criteria must be a non-empty array' };
  }
  if (spec.acceptance_criteria.length > 12) {
    return { ok: false, error: `too many acceptance criteria: ${spec.acceptance_criteria.length} (max 12)` };
  }
  for (let i = 0; i < spec.acceptance_criteria.length; i++) {
    if (typeof spec.acceptance_criteria[i] !== 'string' || !spec.acceptance_criteria[i].trim()) {
      return { ok: false, error: `acceptance_criteria[${i}] must be a non-empty string` };
    }
  }
  if (!Array.isArray(spec.non_goals)) return { ok: false, error: 'non_goals must be an array' };
  if (typeof spec.ux_notes !== 'string') return { ok: false, error: 'ux_notes must be a string' };
  if (spec.open_questions && !Array.isArray(spec.open_questions)) {
    return { ok: false, error: 'open_questions must be an array if present' };
  }
  return { ok: true };
}

// ─── Public API ───

/**
 * Generate a structured spec from a natural-language intent.
 * Returns { status: 'draft' | 'failed', spec?, error?, meta? } — never throws.
 *
 * @param {string} intent — e.g. "build me a habit tracker app"
 * @param {object} [options]
 * @param {object} [options.context] — { appName, platform, inspiredBy }
 * @returns {Promise<{status, spec?, error?, meta?, raw?}>}
 */
export async function generateSpec(intent, options = {}) {
  if (!intent || typeof intent !== 'string') {
    return { status: 'failed', error: 'empty intent' };
  }
  const prompt = buildSpecPrompt(intent, options.context);

  let raw, meta;
  try {
    const r = await aiService.askWithMeta(prompt, {
      maxTokens: 700, skipHistory: true, capCategory: 'spec', format: 'json',
    });
    raw = r.reply;
    meta = r.meta;
  } catch (err) {
    return { status: 'failed', error: `spec ai call threw: ${err?.message || err}` };
  }

  let spec = tryParseJSON(raw);
  let validation = spec ? validateSpec(spec) : { ok: false, error: 'could not parse JSON' };

  if (!validation.ok) {
    const retryPrompt = `${prompt}

YOUR PREVIOUS RESPONSE WAS REJECTED:
\`\`\`
${(raw || '').slice(0, 400)}
\`\`\`
REJECTION REASON: ${validation.error}

Try again. Respond with JSON only.`;
    let retryRaw;
    try {
      const r = await aiService.askWithMeta(retryPrompt, {
        maxTokens: 700, skipHistory: true, capCategory: 'spec', format: 'json',
      });
      retryRaw = r.reply;
      meta = r.meta;
    } catch (err) {
      return { status: 'failed', error: `spec retry threw: ${err?.message || err}`, raw, meta };
    }
    const retrySpec = tryParseJSON(retryRaw);
    const retryValidation = retrySpec ? validateSpec(retrySpec) : { ok: false, error: 'retry also un-parseable' };
    if (!retryValidation.ok) {
      const kind = retrySpec ? 'invalid' : 'unparseable';
      return {
        status: 'failed',
        error: `spec output ${kind} twice: ${retryValidation.error}`,
        raw: retryRaw || raw, meta,
      };
    }
    spec = retrySpec;
  }

  return {
    status: 'draft',
    spec: {
      goal: spec.goal.trim(),
      acceptance_criteria: spec.acceptance_criteria.map(s => s.trim()),
      non_goals: (spec.non_goals || []).map(s => String(s).trim()).filter(Boolean),
      ux_notes: (spec.ux_notes || '').trim(),
      open_questions: Array.isArray(spec.open_questions) ? spec.open_questions.map(s => String(s).trim()).filter(Boolean) : [],
      raw_intent: intent,
      status: 'draft',
    },
    meta, raw,
  };
}

/**
 * Store a spec in the graph. Writes a 'spec' node with the spec fields
 * as props plus a createdAt timestamp. Returns the node id.
 */
export async function storeSpec(spec) {
  if (!spec || typeof spec !== 'object') throw new Error('storeSpec: spec required');
  const node = await graphStore.createNode(SPEC_TYPE, {
    goal: spec.goal || '',
    acceptance_criteria: spec.acceptance_criteria || [],
    non_goals: spec.non_goals || [],
    ux_notes: spec.ux_notes || '',
    open_questions: spec.open_questions || [],
    raw_intent: spec.raw_intent || '',
    status: spec.status || 'draft',
    frozenAt: null,
  }, {
    createdBy: { kind: 'system', capabilityId: 'spec.generate' },
  });
  return node.id;
}

/**
 * Freeze a draft spec — mark it as approved + immutable. Code-gen
 * steps must reference a frozen spec id. Returns the updated node,
 * or null if the spec doesn't exist / was already frozen.
 *
 * Note: Astrion's graph-store allows update, and #60 applies — the
 * version counter bumps but the spec's content fields are what matter
 * for code gen, not the version.
 */
export async function freezeSpec(id) {
  const node = await graphStore.getNode(id);
  if (!node || node.type !== SPEC_TYPE) return null;
  if (node.props.status === 'frozen') return node;
  return await graphStore.updateNode(id, {
    ...node.props,
    status: 'frozen',
    frozenAt: Date.now(),
  });
}

/**
 * Reject a draft spec — mark it as rejected so future lookups don't
 * re-surface it. Doesn't delete (we want the provenance).
 */
export async function rejectSpec(id, reason = '') {
  const node = await graphStore.getNode(id);
  if (!node || node.type !== SPEC_TYPE) return null;
  return await graphStore.updateNode(id, {
    ...node.props,
    status: 'rejected',
    rejectedAt: Date.now(),
    rejectionReason: reason,
  });
}

/**
 * Read a spec by id. Returns the node.props shape (not the raw node).
 */
export async function getSpec(id) {
  const node = await graphStore.getNode(id);
  if (!node || node.type !== SPEC_TYPE) return null;
  return { id: node.id, ...node.props };
}

/**
 * Find a frozen spec whose raw_intent matches the given text. Useful
 * for "did I already approve a spec for this?" lookups.
 */
export async function getFrozenSpecByIntent(intent) {
  if (!intent || typeof intent !== 'string') return null;
  const results = await graphQuery(graphStore, {
    type: 'select',
    from: SPEC_TYPE,
    where: {
      'props.raw_intent': intent.trim(),
      'props.status': 'frozen',
    },
    limit: 1,
  });
  return results?.[0] ? { id: results[0].id, ...results[0].props } : null;
}

/**
 * List recent specs for a dashboard. Ordered by createdAt desc.
 */
export async function listRecentSpecs(limit = 20) {
  const results = await graphQuery(graphStore, {
    type: 'select',
    from: SPEC_TYPE,
    orderBy: 'createdAt',
    orderDir: 'desc',
    limit,
  });
  return results.map(n => ({ id: n.id, ...n.props }));
}

// ─── Sanity tests (run on localhost only) ───

if (typeof window !== 'undefined' && window.location?.hostname === 'localhost') {
  const tests = [
    { spec: { goal: 'track habits', acceptance_criteria: ['Given X, when Y, then Z'], non_goals: [], ux_notes: '' }, expectOk: true },
    { spec: { goal: '', acceptance_criteria: ['x'], non_goals: [], ux_notes: '' }, expectOk: false }, // empty goal
    { spec: { goal: 'x', acceptance_criteria: [], non_goals: [], ux_notes: '' }, expectOk: false }, // empty criteria
    { spec: { goal: 'x', acceptance_criteria: ['y'], non_goals: 'not an array', ux_notes: '' }, expectOk: false }, // wrong non_goals type
    { spec: { goal: 'x', acceptance_criteria: Array(13).fill('y'), non_goals: [], ux_notes: '' }, expectOk: false }, // too many criteria
    { spec: null, expectOk: false },
  ];
  let fail = 0;
  for (const t of tests) {
    const v = validateSpec(t.spec);
    if (v.ok !== t.expectOk) {
      console.warn('[spec-generator] validate FAIL:', JSON.stringify(t.spec), '→', v);
      fail++;
    }
  }
  // JSON parse tolerance
  const jsonTests = [
    { in: '{"goal":"x"}', expectKey: 'goal' },
    { in: '```json\n{"goal":"x"}\n```', expectKey: 'goal' },
    { in: 'Prefix prose\n{"goal":"x"}\nSuffix', expectKey: 'goal' },
    { in: 'not json', expectKey: null },
  ];
  for (const t of jsonTests) {
    const parsed = tryParseJSON(t.in);
    const key = parsed && typeof parsed === 'object' ? Object.keys(parsed)[0] : null;
    if (key !== t.expectKey) {
      console.warn('[spec-generator] parse FAIL:', t.in, '→', parsed);
      fail++;
    }
  }
  if (fail === 0) console.log('[spec-generator] all 10 sanity tests pass');
  else console.warn('[spec-generator]', fail, 'sanity tests failed');
}
