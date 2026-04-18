// Astrion OS — App Promoter (M4.P4)
//
// Final phase of Verifiable Code Generation. Bundles a successful
// spec + suite + code triple into a single 'generated-app' graph
// node with full provenance, then gates the move from sandbox to
// dock behind explicit user approval.
//
// Lifecycle:
//   sandboxed → (user L2 unlock) → docked → (user remove)  → archived
//
// The 'generated-app' node carries:
//   - intent (raw text)
//   - specId, suiteId, codeId  (graph back-pointers)
//   - prompt history summary (from each phase's meta)
//   - model + brain per phase
//   - createdAt + sandboxedAt + dockedAt timestamps
//   - status: 'sandboxed' | 'docked' | 'archived'
//
// Why this matters: when M6 ships the red-team agent, app promotion
// will require its signoff. Until then, promotion is a manual L2
// unlock from the user — the app capability levels make that
// explicit so the safety story is consistent.
//
// Non-goals here:
//   - Actual dock placement / icon registration. The promoted app is
//     a graph node only; the dock UI plumbing reads it but rendering
//     a real launchable icon is a separate piece.
//   - Sandboxed app execution at runtime (the code is already
//     verified by M4.P3 + P3.b; running it standalone in an iframe
//     when the user clicks the icon is a different concern).

import { graphStore } from './graph-store.js';
import { query as graphQuery } from './graph-query.js';
import { getSpec } from './spec-generator.js';
import { getTestSuite } from './test-generator.js';
import { getGeneratedCode } from './code-generator.js';

const APP_TYPE = 'generated-app';

// ─── Public API ───

/**
 * Bundle a successful spec + suite + code into a single
 * 'generated-app' graph node. Refuses to bundle unless every
 * upstream piece checks out:
 *   - code.status === 'ok'
 *   - code.finalResults all pass
 *   - suite exists
 *   - spec exists and is frozen
 *
 * Status starts at 'sandboxed'. promoteApp() flips it to 'docked'
 * (the L2 user-approval gate).
 *
 * @param {string} codeId
 * @returns {Promise<{ok, appId?, error?}>}
 */
export async function bundleApp(codeId) {
  if (!codeId || typeof codeId !== 'string') {
    return { ok: false, error: 'codeId required' };
  }
  const code = await getGeneratedCode(codeId);
  if (!code) return { ok: false, error: 'code not found: ' + codeId };
  if (code.status !== 'ok') return { ok: false, error: 'code is not in ok status: ' + code.status };
  if (!code.finalResults || code.finalResults.passes !== code.finalResults.total) {
    return { ok: false, error: 'code does not pass all tests' };
  }
  const suite = await getTestSuite(code.suiteId);
  if (!suite) return { ok: false, error: 'suite not found: ' + code.suiteId };
  const spec = await getSpec(suite.specId);
  if (!spec) return { ok: false, error: 'spec not found: ' + suite.specId };
  if (spec.status !== 'frozen') return { ok: false, error: 'spec is not frozen' };

  // Provenance: gather brain/model per phase from the available
  // metadata. The code node already stores per-attempt history; we
  // surface a summary onto the app node so dashboards don't have to
  // chase pointers.
  const provenance = {
    intent: spec.raw_intent || '',
    specCreatedAt: spec.frozenAt || null,
    suiteGeneratedAt: suite.generatedAt || null,
    suiteModel: suite.model || 'unknown',
    codeAttempts: code.attempts || 1,
    codeModel: code.history?.[code.history.length - 1]?.model || 'unknown',
    codeBrain: code.history?.[code.history.length - 1]?.brain || 'unknown',
    testsTotal: code.finalResults.total,
    testsPassed: code.finalResults.passes,
  };

  const node = await graphStore.createNode(APP_TYPE, {
    intent: spec.raw_intent || '',
    goal: spec.goal,
    specId: spec.id,
    suiteId: suite.id,
    codeId,
    provenance,
    status: 'sandboxed',
    sandboxedAt: Date.now(),
    dockedAt: null,
    archivedAt: null,
  }, {
    createdBy: { kind: 'system', capabilityId: 'app.bundle' },
  });

  // Provenance edges so a future Spotlight query can ask
  // "what spec / suite / code does this app trace back to?"
  for (const [kind, target] of [
    ['derives_from', spec.id],
    ['passed_tests', suite.id],
    ['runs_code', codeId],
  ]) {
    try {
      await graphStore.addEdge(node.id, kind, target);
    } catch (err) {
      console.warn('[app-promoter] could not create ' + kind + ' edge:', err?.message);
    }
  }
  return { ok: true, appId: node.id };
}

/**
 * Promote a sandboxed app to docked status. This is the L2 gate —
 * the capability that wraps it requires user approval.
 */
export async function promoteApp(appId) {
  const node = await graphStore.getNode(appId);
  if (!node || node.type !== APP_TYPE) return { ok: false, error: 'app not found' };
  if (node.props.status === 'docked') return { ok: true, appId, status: 'docked', alreadyDocked: true };
  if (node.props.status !== 'sandboxed') {
    return { ok: false, error: 'app must be sandboxed to promote; current status: ' + node.props.status };
  }
  await graphStore.updateNode(appId, {
    ...node.props,
    status: 'docked',
    dockedAt: Date.now(),
  });
  return { ok: true, appId, status: 'docked' };
}

/**
 * Send a docked or sandboxed app to archived (soft-delete). User can
 * always re-promote later from the same graph node.
 */
export async function archiveApp(appId) {
  const node = await graphStore.getNode(appId);
  if (!node || node.type !== APP_TYPE) return { ok: false, error: 'app not found' };
  if (node.props.status === 'archived') return { ok: true, appId, status: 'archived', alreadyArchived: true };
  await graphStore.updateNode(appId, {
    ...node.props,
    status: 'archived',
    archivedAt: Date.now(),
  });
  return { ok: true, appId, status: 'archived' };
}

/** Read an app by id. */
export async function getApp(appId) {
  const node = await graphStore.getNode(appId);
  if (!node || node.type !== APP_TYPE) return null;
  return { id: node.id, ...node.props };
}

/**
 * List apps. Defaults to docked-only (what a dock would query).
 * Pass status='*' for the full lifecycle.
 */
export async function listGeneratedApps(status = 'docked', limit = 50) {
  const where = status === '*' ? {} : { 'props.status': status };
  const results = await graphQuery(graphStore, {
    type: 'select',
    from: APP_TYPE,
    where,
    orderBy: 'createdAt',
    orderDir: 'desc',
    limit,
  });
  return results.map(n => ({ id: n.id, ...n.props }));
}
