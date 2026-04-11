// Astrion OS — Hypergraph Query Executor (M2.P2)
//
// Pure stateless executor that runs structured queries against a graphStore
// (any object with getNodesByType/getNode/getEdgesFrom/getEdgesTo).
//
// Two query shapes:
//   select   → returns Node[]
//   traverse → returns { nodes: Node[], edges: Edge[] }
//
// What this file IS (M2 Day 2):
//   - Filter operators: eq, ne, gt, gte, lt, lte, in, contains, exists
//   - Dotted field paths (top-level + props.* + createdBy.*)
//   - orderBy with stable sort, nulls-last, localeCompare for strings
//   - BFS traverse with direction out/in/both, kinds allowlist, depth
//   - Prototype-pollution defense (hasOwnProperty walker + forbidden segments)
//   - Typed errors (GraphQueryError + enumerated codes)
//
// What this file is NOT (later milestones):
//   - OR/AND combinators (M2.P3 or M3)
//   - Regex filters, $not, nested non-dotted matching (M3)
//   - Predicate pushdown into IDB index ranges (M3)
//   - Cursor-streaming select for >10k-node types (M3)
//   - AbortSignal / cancellation (M3 — callers de-dupe/debounce themselves)
//   - Live-query subscriptions (consumers subscribe to graph:* events and re-run)
//
// CALLER CONTRACT: query() is a snapshot. Concurrent mutations during a
// query may or may not be reflected in results. Stale queries are NOT
// auto-cancelled; callers are responsible for debouncing text-search and
// de-duping racing awaits.

// ---------- constants ----------

export const QUERY_OPERATORS = Object.freeze([
  'eq', 'ne', 'gt', 'gte', 'lt', 'lte', 'in', 'contains', 'exists',
]);
const OPERATOR_SET = new Set(QUERY_OPERATORS);

export const SELECT_OVERFETCH = 10000;
export const MAX_TRAVERSE_NODES = 10000;
export const MAX_TRAVERSE_EDGES = 20000;

const DEFAULT_TRAVERSE_DEPTH = 1;
const DEFAULT_TRAVERSE_DIRECTION = 'out';
const VALID_DIRECTIONS = new Set(['out', 'in', 'both']);
const VALID_QUERY_TYPES = new Set(['select', 'traverse']);

const FORBIDDEN_PATH_SEGMENTS = new Set(['__proto__', 'constructor', 'prototype']);

const REQUIRED_STORE_METHODS = ['getNodesByType', 'getNode', 'getEdgesFrom', 'getEdgesTo'];

// one-time warning guards (flip to true after first emit)
const WARNED = {
  overfetch: false,
  mixedTypeSort: false,
  allNullSort: false,
  traverseEdgeCap: false,
  traverseNodeCap: false,
};

// ---------- error type ----------

export const ERROR_CODES = Object.freeze({
  INVALID_QUERY: 'INVALID_QUERY',
  MISSING_FROM: 'MISSING_FROM',
  MISSING_START_NODE: 'MISSING_START_NODE',
  UNKNOWN_TYPE: 'UNKNOWN_TYPE',
  UNKNOWN_OPERATOR: 'UNKNOWN_OPERATOR',
  UNSAFE_FIELD_PATH: 'UNSAFE_FIELD_PATH',
  INVALID_DEPTH: 'INVALID_DEPTH',
  INVALID_DIRECTION: 'INVALID_DIRECTION',
  START_NODE_NOT_FOUND: 'START_NODE_NOT_FOUND',
  STORE_MISSING_METHOD: 'STORE_MISSING_METHOD',
});

export class GraphQueryError extends Error {
  constructor(code, message, detail) {
    super(message);
    this.name = 'GraphQueryError';
    this.code = code;
    if (detail !== undefined) this.detail = detail;
  }
}

function fail(code, message, detail) {
  throw new GraphQueryError(code, message, detail);
}

// ---------- primitive helpers ----------

function isNullish(v) {
  return v === null || v === undefined;
}

function isPlainObject(v) {
  if (v === null || typeof v !== 'object') return false;
  if (Array.isArray(v)) return false;
  const proto = Object.getPrototypeOf(v);
  return proto === Object.prototype || proto === null;
}

function assertStoreShape(store) {
  if (!store || typeof store !== 'object') {
    fail(
      ERROR_CODES.STORE_MISSING_METHOD,
      'graph-query: store must be an object with getNodesByType/getNode/getEdgesFrom/getEdgesTo',
    );
  }
  for (const m of REQUIRED_STORE_METHODS) {
    if (typeof store[m] !== 'function') {
      fail(
        ERROR_CODES.STORE_MISSING_METHOD,
        `graph-query: store is missing required method "${m}"`,
        { missing: m },
      );
    }
  }
}

// ---------- proto-safe field walker ----------

// getFieldValue(node, 'props.title') → walks { ...node }.props.title
// Returns undefined on any missing segment. Throws UNSAFE_FIELD_PATH on
// forbidden segments (__proto__, constructor, prototype).
function getFieldValue(node, path) {
  if (typeof path !== 'string' || !path) {
    fail(ERROR_CODES.UNSAFE_FIELD_PATH, `graph-query: field path must be a non-empty string (got ${path})`);
  }
  const segments = path.split('.');
  let cur = node;
  for (const seg of segments) {
    if (FORBIDDEN_PATH_SEGMENTS.has(seg)) {
      fail(
        ERROR_CODES.UNSAFE_FIELD_PATH,
        `graph-query: forbidden path segment "${seg}" in "${path}"`,
        { path, segment: seg },
      );
    }
    if (cur === null || cur === undefined || typeof cur !== 'object') return undefined;
    if (!Object.prototype.hasOwnProperty.call(cur, seg)) return undefined;
    cur = cur[seg];
  }
  return cur;
}

// ---------- filter matcher ----------

// isOperatorMap: true only when v is a plain object AND every own-key is in
// QUERY_OPERATORS. This is how shorthand ({done:true}) is distinguished from
// operator-map ({done:{eq:true}}). Crucially {props:{title:'x'}} is NOT an
// operator map — its keys aren't operators — so it falls through to the
// complex-value branch and throws a helpful error.
function isOperatorMap(v) {
  if (!isPlainObject(v)) return false;
  const keys = Object.keys(v);
  if (keys.length === 0) return false;
  for (const k of keys) {
    if (!OPERATOR_SET.has(k)) return false;
  }
  return true;
}

// Evaluate ONE (lhs, op, rhs) triple. Returns bool. Throws on operator
// misuse (e.g., `in` with non-array rhs).
function matchOperator(lhs, op, rhs, path) {
  switch (op) {
    case 'eq': {
      // primitives: strict equality
      if (lhs === rhs) return true;
      // arrays-of-primitives: JSON.stringify equality
      if (Array.isArray(lhs) && Array.isArray(rhs)) {
        try { return JSON.stringify(lhs) === JSON.stringify(rhs); }
        catch (_) { return false; }
      }
      // complex object rhs is not supported
      if (isPlainObject(rhs)) {
        fail(
          ERROR_CODES.UNKNOWN_OPERATOR,
          `graph-query: eq on complex-value not supported (field "${path}"). Use a dotted path like "${path}.someKey" instead.`,
          { path, op, rhs },
        );
      }
      return false;
    }
    case 'ne': {
      // symmetric to eq
      if (lhs === rhs) return false;
      if (Array.isArray(lhs) && Array.isArray(rhs)) {
        try { return JSON.stringify(lhs) !== JSON.stringify(rhs); }
        catch (_) { return true; }
      }
      if (isPlainObject(rhs)) {
        fail(
          ERROR_CODES.UNKNOWN_OPERATOR,
          `graph-query: ne on complex-value not supported (field "${path}"). Use a dotted path instead.`,
          { path, op, rhs },
        );
      }
      return true;
    }
    case 'gt':
    case 'gte':
    case 'lt':
    case 'lte': {
      if (isNullish(lhs) || isNullish(rhs)) return false;
      if (typeof lhs !== typeof rhs) {
        if (!WARNED.mixedTypeSort) {
          WARNED.mixedTypeSort = true;
          console.warn(`[graph-query] ${op} on mixed types (field "${path}"): ${typeof lhs} vs ${typeof rhs}. Returning false.`);
        }
        return false;
      }
      if (op === 'gt')  return lhs >  rhs;
      if (op === 'gte') return lhs >= rhs;
      if (op === 'lt')  return lhs <  rhs;
      return lhs <= rhs;
    }
    case 'in': {
      if (!Array.isArray(rhs)) {
        fail(
          ERROR_CODES.UNKNOWN_OPERATOR,
          `graph-query: "in" requires an array rhs (field "${path}", got ${typeof rhs}).`,
          { path, op, rhs },
        );
      }
      for (const item of rhs) {
        if (lhs === item) return true;
      }
      return false;
    }
    case 'contains': {
      if (typeof lhs === 'string') {
        const needle = String(rhs).toLowerCase();
        return lhs.toLowerCase().includes(needle);
      }
      if (Array.isArray(lhs)) {
        for (const item of lhs) {
          if (Object.is(item, rhs)) return true;
        }
        return false;
      }
      return false;
    }
    case 'exists': {
      if (typeof rhs !== 'boolean') {
        fail(
          ERROR_CODES.UNKNOWN_OPERATOR,
          `graph-query: "exists" requires a boolean rhs (field "${path}", got ${typeof rhs}).`,
          { path, op, rhs },
        );
      }
      const present = lhs !== undefined;
      return rhs ? present : !present;
    }
    default:
      fail(
        ERROR_CODES.UNKNOWN_OPERATOR,
        `graph-query: unknown operator "${op}" (field "${path}"). Known: ${QUERY_OPERATORS.join(', ')}`,
        { path, op },
      );
  }
  return false; // unreachable
}

// Walk the top-level where clause. Implicit AND across keys, implicit AND
// within a single field's operator map.
function matchFilter(node, where) {
  if (!where) return true;
  for (const path of Object.keys(where)) {
    const rhs = where[path];
    const lhs = getFieldValue(node, path);
    if (isOperatorMap(rhs)) {
      for (const op of Object.keys(rhs)) {
        if (!matchOperator(lhs, op, rhs[op], path)) return false;
      }
    } else {
      if (!matchOperator(lhs, 'eq', rhs, path)) return false;
    }
  }
  return true;
}

// ---------- comparator ----------

function compareByField(field, dir) {
  const mult = dir === 'desc' ? -1 : 1;
  return (a, b) => {
    const va = getFieldValue(a, field);
    const vb = getFieldValue(b, field);
    const aNull = isNullish(va);
    const bNull = isNullish(vb);
    if (aNull && bNull) return 0;
    if (aNull) return 1;   // nulls always last
    if (bNull) return -1;
    let cmp;
    if (typeof va === 'string' && typeof vb === 'string') {
      cmp = va.localeCompare(vb, undefined, { numeric: true, sensitivity: 'base' });
    } else if (typeof va === typeof vb) {
      cmp = va < vb ? -1 : va > vb ? 1 : 0;
    } else {
      if (!WARNED.mixedTypeSort) {
        WARNED.mixedTypeSort = true;
        console.warn(`[graph-query] orderBy "${field}" has mixed types. Coercing to string for compare.`);
      }
      cmp = String(va).localeCompare(String(vb));
    }
    return mult * cmp;
  };
}

// ---------- normalization ----------

// Validates + defaults + deep-freezes a clone of the query. Throws on any
// unknown operator, forbidden path, missing required field, bad direction,
// bad depth. Callers get the frozen query for downstream use.
function normalizeQuery(q) {
  if (!isPlainObject(q)) {
    fail(ERROR_CODES.INVALID_QUERY, 'graph-query: query must be a plain object');
  }
  if (!VALID_QUERY_TYPES.has(q.type)) {
    fail(
      ERROR_CODES.UNKNOWN_TYPE,
      `graph-query: query.type must be "select" or "traverse" (got ${JSON.stringify(q.type)})`,
      { type: q.type },
    );
  }
  // clone+freeze so caller mutations can't affect in-flight work
  const frozen = Object.freeze(structuredClone(q));

  // validate where clause shape
  if (frozen.where !== undefined) {
    if (!isPlainObject(frozen.where)) {
      fail(ERROR_CODES.INVALID_QUERY, 'graph-query: where must be a plain object');
    }
    for (const path of Object.keys(frozen.where)) {
      // proto-poisoning rejected at parse time (walker also guards)
      const segs = path.split('.');
      for (const seg of segs) {
        if (FORBIDDEN_PATH_SEGMENTS.has(seg)) {
          fail(
            ERROR_CODES.UNSAFE_FIELD_PATH,
            `graph-query: forbidden segment "${seg}" in where path "${path}"`,
            { path, segment: seg },
          );
        }
      }
      const rhs = frozen.where[path];
      // fail-fast: any plain-object rhs MUST be a valid operator map. This
      // means `{ lessThan: 5 }` (typo) and `{ props: { title: 'x' } }`
      // (wrong nested syntax) are caught at normalize time regardless of
      // whether any nodes exist to filter against. Shorthand equality is
      // for primitives and arrays only — complex-value equality requires
      // a dotted path.
      if (isPlainObject(rhs)) {
        const keys = Object.keys(rhs);
        if (keys.length === 0) {
          fail(
            ERROR_CODES.INVALID_QUERY,
            `graph-query: empty object in where["${path}"]. Use a primitive, an array, or a valid operator map.`,
            { path },
          );
        }
        for (const k of keys) {
          if (!OPERATOR_SET.has(k)) {
            fail(
              ERROR_CODES.UNKNOWN_OPERATOR,
              `graph-query: unknown operator "${k}" in where["${path}"]. Known: ${QUERY_OPERATORS.join(', ')}. For nested matches, use a dotted path like "${path}.${k}".`,
              { path, op: k },
            );
          }
        }
        // fast-validate operator value shapes at normalize time
        if ('in' in rhs && !Array.isArray(rhs.in)) {
          fail(
            ERROR_CODES.UNKNOWN_OPERATOR,
            `graph-query: "in" requires an array (where["${path}"].in got ${typeof rhs.in}).`,
            { path, op: 'in', rhs: rhs.in },
          );
        }
        if ('exists' in rhs && typeof rhs.exists !== 'boolean') {
          fail(
            ERROR_CODES.UNKNOWN_OPERATOR,
            `graph-query: "exists" requires a boolean (where["${path}"].exists got ${typeof rhs.exists}).`,
            { path, op: 'exists', rhs: rhs.exists },
          );
        }
      }
      // reject eq:undefined — force consumers to use exists:false
      if (rhs === undefined) {
        fail(
          ERROR_CODES.INVALID_QUERY,
          `graph-query: where["${path}"] is undefined. Use { exists: false } to match missing fields.`,
          { path },
        );
      }
    }
  }

  if (frozen.type === 'select') {
    if (typeof frozen.from !== 'string' || !frozen.from) {
      fail(ERROR_CODES.MISSING_FROM, 'graph-query: select requires a `from` type');
    }
  }

  if (frozen.type === 'traverse') {
    if (typeof frozen.startNode !== 'string' || !frozen.startNode) {
      fail(ERROR_CODES.MISSING_START_NODE, 'graph-query: traverse requires a `startNode`');
    }
    const t = frozen.traverse || {};
    const direction = t.direction ?? DEFAULT_TRAVERSE_DIRECTION;
    if (!VALID_DIRECTIONS.has(direction)) {
      fail(
        ERROR_CODES.INVALID_DIRECTION,
        `graph-query: traverse.direction must be out/in/both (got ${JSON.stringify(direction)})`,
        { direction },
      );
    }
    const depth = t.depth ?? DEFAULT_TRAVERSE_DEPTH;
    if (!Number.isInteger(depth) || depth < 0) {
      fail(
        ERROR_CODES.INVALID_DEPTH,
        `graph-query: traverse.depth must be a non-negative integer (got ${JSON.stringify(depth)})`,
        { depth },
      );
    }
    if (t.kinds !== undefined && !Array.isArray(t.kinds)) {
      fail(
        ERROR_CODES.INVALID_QUERY,
        `graph-query: traverse.kinds must be an array when provided`,
        { kinds: t.kinds },
      );
    }
  }

  return frozen;
}

// ---------- select ----------

async function runSelect(store, q) {
  const rawNodes = await store.getNodesByType(q.from, { limit: SELECT_OVERFETCH });
  if (rawNodes.length === SELECT_OVERFETCH && !WARNED.overfetch) {
    WARNED.overfetch = true;
    console.warn(`[graph-query] select "${q.from}" hit overfetch cap (${SELECT_OVERFETCH}); results may be incomplete.`);
  }

  let out = q.where ? rawNodes.filter(n => matchFilter(n, q.where)) : rawNodes;

  if (q.orderBy && q.orderBy.field) {
    const dir = q.orderBy.dir === 'desc' ? 'desc' : 'asc';
    const cmp = compareByField(q.orderBy.field, dir);
    // all-nullish warning: if every sort key is nullish, user probably forgot props. prefix
    if (out.length > 0 && !WARNED.allNullSort) {
      let allNull = true;
      for (const n of out) {
        if (!isNullish(getFieldValue(n, q.orderBy.field))) { allNull = false; break; }
      }
      if (allNull) {
        WARNED.allNullSort = true;
        console.warn(`[graph-query] orderBy "${q.orderBy.field}": every node has nullish value. Did you forget "props." prefix?`);
      }
    }
    out = out.slice().sort(cmp);
  }

  if (typeof q.limit === 'number' && q.limit >= 0) {
    out = out.slice(0, q.limit);
  }
  return out;
}

// ---------- traverse ----------

async function runTraverse(store, q) {
  const start = await store.getNode(q.startNode);
  if (!start) {
    fail(
      ERROR_CODES.START_NODE_NOT_FOUND,
      `graph-query: startNode "${q.startNode}" not found`,
      { startNode: q.startNode },
    );
  }

  const t = q.traverse || {};
  const direction = t.direction ?? DEFAULT_TRAVERSE_DIRECTION;
  const depth = t.depth ?? DEFAULT_TRAVERSE_DEPTH;
  const kinds = t.kinds; // undefined means "match all", [] means "match nothing"

  const visited = new Map();
  visited.set(start.id, start);
  const edgeBag = [];
  const seenEdges = new Set();

  let frontier = [start.id];
  let edgeCapHit = false;
  let nodeCapHit = false;

  outer: for (let d = 0; d < depth; d++) {
    if (frontier.length === 0) break;
    const nextFetchIds = [];

    for (let i = 0; i < frontier.length; i++) {
      const fromId = frontier[i];
      const edgeArrays = [];
      if (direction === 'out' || direction === 'both') {
        edgeArrays.push(await store.getEdgesFrom(fromId));
      }
      if (direction === 'in' || direction === 'both') {
        edgeArrays.push(await store.getEdgesTo(fromId));
      }
      for (const edges of edgeArrays) {
        for (const e of edges) {
          if (kinds !== undefined && !kinds.includes(e.kind)) continue;
          const key = `${e.from}\u0000${e.kind}\u0000${e.to}`;
          if (seenEdges.has(key)) continue;
          seenEdges.add(key);
          edgeBag.push(e);
          if (edgeBag.length >= MAX_TRAVERSE_EDGES) {
            if (!WARNED.traverseEdgeCap) {
              WARNED.traverseEdgeCap = true;
              console.warn(`[graph-query] traverse edge cap hit (${MAX_TRAVERSE_EDGES}); truncating.`);
            }
            edgeCapHit = true;
            break outer;
          }
          const neighborId = (e.from === fromId) ? e.to : e.from;
          if (!visited.has(neighborId) && !nextFetchIds.includes(neighborId)) {
            nextFetchIds.push(neighborId);
          }
        }
      }
    }

    // parallel fetch new neighbors for this level
    const fetched = await Promise.all(nextFetchIds.map(id => store.getNode(id)));
    const nextFrontier = [];
    for (let i = 0; i < fetched.length; i++) {
      const node = fetched[i];
      if (!node) {
        // dangling edge: drop the edges pointing at it too
        const deadId = nextFetchIds[i];
        for (let j = edgeBag.length - 1; j >= 0; j--) {
          if (edgeBag[j].from === deadId || edgeBag[j].to === deadId) {
            edgeBag.splice(j, 1);
          }
        }
        continue;
      }
      if (visited.size >= MAX_TRAVERSE_NODES) {
        if (!WARNED.traverseNodeCap) {
          WARNED.traverseNodeCap = true;
          console.warn(`[graph-query] traverse node cap hit (${MAX_TRAVERSE_NODES}); truncating.`);
        }
        nodeCapHit = true;
        break outer;
      }
      visited.set(nextFetchIds[i], node);
      nextFrontier.push(nextFetchIds[i]);
    }
    frontier = nextFrontier;
  }

  // suppress unused var lint
  void edgeCapHit; void nodeCapHit;

  return {
    nodes: [...visited.values()],
    edges: edgeBag,
  };
}

// ---------- entry point ----------

export async function query(store, q) {
  assertStoreShape(store);
  const normalized = normalizeQuery(q);
  if (normalized.type === 'select') {
    return runSelect(store, normalized);
  }
  return runTraverse(store, normalized);
}

// ---------- inline sanity tests (localhost only) ----------
//
// Runs on a dedicated `astrion-graph-query-test` IndexedDB. Wipes the DB
// BEFORE init so the second run starts clean. Uses the real GraphStore as
// the backing store — duck-typed, but consistent behavior.
//
// Wrapped in top-level .catch so hot-reload races never crash boot.

if (typeof window !== 'undefined' && window.location?.hostname === 'localhost') {
  (async () => {
    const { GraphStore } = await import('./graph-store.js');
    const TEST_DB = 'astrion-graph-query-test';

    // wipe before init
    await new Promise((resolve) => {
      const r = indexedDB.deleteDatabase(TEST_DB);
      r.onsuccess = r.onerror = r.onblocked = () => resolve();
    });

    const store = new GraphStore({ dbName: TEST_DB, emitEvents: false });
    await store.init();

    let failures = 0;
    const fail2 = (msg, ...extras) => {
      failures++;
      console.warn('[graph-query]', msg, ...extras);
    };

    // --- seed ---
    const T1 = Date.now();
    const note1 = await store.createNode('note', { title: 'School notes', content: 'algebra stuff', tags: ['school'] });
    await new Promise(r => setTimeout(r, 4));
    const note2 = await store.createNode('note', { title: 'Grocery list', content: 'milk eggs' });
    const note3 = await store.createNode('note', { title: 'School party', content: 'pizza' });
    const todo1 = await store.createNode('todo', { text: 'wash dishes', done: true });
    const todo2 = await store.createNode('todo', { text: 'call mom', done: false });
    await store.addEdge(note1.id, 'references', note2.id);
    await store.addEdge(note2.id, 'references', note3.id);
    await store.addEdge(note3.id, 'mentions', note1.id);
    await store.addEdge(note1.id, 'self', note1.id);

    // 1. select no where
    try {
      const all = await query(store, { type: 'select', from: 'note' });
      if (all.length !== 3) fail2('test 1: expected 3 notes, got', all.length);
      const limited = await query(store, { type: 'select', from: 'note', limit: 2 });
      if (limited.length !== 2) fail2('test 1: limit failed');
    } catch (err) {
      fail2('test 1 threw', err);
    }

    // 2. select shorthand equality
    try {
      const done = await query(store, { type: 'select', from: 'todo', where: { 'props.done': true } });
      if (done.length !== 1 || done[0].id !== todo1.id) fail2('test 2: shorthand equality wrong', done);
    } catch (err) {
      fail2('test 2 threw', err);
    }

    // 3. select operator map AND
    try {
      const range = await query(store, {
        type: 'select', from: 'note',
        where: { updatedAt: { gt: note1.updatedAt, lte: Date.now() } },
      });
      // note1 excluded (gt), note2+note3 included
      if (range.length !== 2) fail2('test 3: AND range wrong count', range.length);
    } catch (err) {
      fail2('test 3 threw', err);
    }

    // 4. select contains case-insensitive
    try {
      const schoolish = await query(store, {
        type: 'select', from: 'note',
        where: { 'props.title': { contains: 'school' } },
      });
      if (schoolish.length !== 2) fail2('test 4: contains expected 2, got', schoolish.length);
      // contains on a null-title node (none in seed, but verify no crash on missing field)
      const missing = await query(store, {
        type: 'select', from: 'note',
        where: { 'props.nonexistent': { contains: 'x' } },
      });
      if (missing.length !== 0) fail2('test 4: contains on missing should be empty');
    } catch (err) {
      fail2('test 4 threw', err);
    }

    // 5. select `in` array + non-array throws
    try {
      const noteOrTodo = await query(store, {
        type: 'select', from: 'note',
        where: { type: { in: ['note', 'todo'] } },
      });
      if (noteOrTodo.length !== 3) fail2('test 5: in array wrong count', noteOrTodo.length);
      let threw = false;
      try {
        await query(store, { type: 'select', from: 'note', where: { type: { in: 'note' } } });
      } catch (err) {
        if (err.code === 'UNKNOWN_OPERATOR') threw = true;
      }
      if (!threw) fail2('test 5: in with non-array should throw UNKNOWN_OPERATOR');
    } catch (err) {
      fail2('test 5 threw outer', err);
    }

    // 6. exists true/false
    try {
      const withTags = await query(store, {
        type: 'select', from: 'note',
        where: { 'props.tags': { exists: true } },
      });
      if (withTags.length !== 1 || withTags[0].id !== note1.id) fail2('test 6: exists:true wrong');
      const withoutTags = await query(store, {
        type: 'select', from: 'note',
        where: { 'props.tags': { exists: false } },
      });
      if (withoutTags.length !== 2) fail2('test 6: exists:false wrong count', withoutTags.length);
    } catch (err) {
      fail2('test 6 threw', err);
    }

    // 7. orderBy desc with stable ties (createdAt ties)
    try {
      const sorted = await query(store, {
        type: 'select', from: 'note',
        orderBy: { field: 'updatedAt', dir: 'desc' },
      });
      if (sorted.length !== 3) fail2('test 7: sort count wrong');
      // sorted[0] should be the most recent (note2 or note3); stability means relative order preserved
      // we don't assert specific winner, just that it's monotonic
      for (let i = 1; i < sorted.length; i++) {
        if (sorted[i].updatedAt > sorted[i-1].updatedAt) fail2('test 7: not descending at', i);
      }
    } catch (err) {
      fail2('test 7 threw', err);
    }

    // 8. orderBy nulls-last (asc AND desc)
    try {
      // add some pinned notes
      const pinnedA = await store.createNode('pin', { title: 'a', pinnedAt: 200 });
      const pinnedB = await store.createNode('pin', { title: 'b', pinnedAt: 100 });
      const unpinnedC = await store.createNode('pin', { title: 'c' });
      const asc = await query(store, {
        type: 'select', from: 'pin',
        orderBy: { field: 'props.pinnedAt', dir: 'asc' },
      });
      if (asc[asc.length - 1].id !== unpinnedC.id) fail2('test 8: nulls not last on asc');
      const desc = await query(store, {
        type: 'select', from: 'pin',
        orderBy: { field: 'props.pinnedAt', dir: 'desc' },
      });
      if (desc[desc.length - 1].id !== unpinnedC.id) fail2('test 8: nulls not last on desc');
      // cleanup
      for (const n of [pinnedA, pinnedB, unpinnedC]) await store.deleteNode(n.id);
    } catch (err) {
      fail2('test 8 threw', err);
    }

    // 9. select limit post-filter
    try {
      // seed 20 junk nodes quickly
      const junkIds = [];
      for (let i = 0; i < 20; i++) {
        const j = await store.createNode('junk', { i });
        junkIds.push(j.id);
      }
      const limited = await query(store, { type: 'select', from: 'junk', limit: 5 });
      if (limited.length !== 5) fail2('test 9: limit wrong', limited.length);
      for (const id of junkIds) await store.deleteNode(id);
    } catch (err) {
      fail2('test 9 threw', err);
    }

    // 10. traverse out depth 1 (+ self-loop recorded but not revisited)
    try {
      const r = await query(store, {
        type: 'traverse',
        startNode: note1.id,
        traverse: { direction: 'out', depth: 1 },
      });
      const ids = r.nodes.map(n => n.id).sort();
      const expected = [note1.id, note2.id].sort();
      if (ids.length !== 2 || ids[0] !== expected[0] || ids[1] !== expected[1]) {
        fail2('test 10: wrong nodes', ids);
      }
      // edges: references + self-loop
      if (r.edges.length !== 2) fail2('test 10: wrong edge count', r.edges.length);
      const hasSelf = r.edges.some(e => e.from === note1.id && e.to === note1.id);
      if (!hasSelf) fail2('test 10: self-loop not recorded');
    } catch (err) {
      fail2('test 10 threw', err);
    }

    // 11. traverse both depth 2 with cycle
    try {
      const r = await query(store, {
        type: 'traverse',
        startNode: note1.id,
        traverse: { direction: 'both', depth: 2 },
      });
      const nodeIds = new Set(r.nodes.map(n => n.id));
      if (!nodeIds.has(note1.id) || !nodeIds.has(note2.id) || !nodeIds.has(note3.id)) {
        fail2('test 11: did not reach all 3 notes');
      }
      // edge dedupe: no edge key should appear twice
      const edgeKeys = r.edges.map(e => `${e.from}\u0000${e.kind}\u0000${e.to}`);
      if (new Set(edgeKeys).size !== edgeKeys.length) fail2('test 11: duplicate edges');
    } catch (err) {
      fail2('test 11 threw', err);
    }

    // 12. traverse kinds allowlist
    try {
      const r = await query(store, {
        type: 'traverse',
        startNode: note1.id,
        traverse: { direction: 'in', kinds: ['mentions'], depth: 1 },
      });
      // note3 --mentions--> note1, so in-direction from note1 with kinds=mentions reaches note3
      const reachedNote3 = r.nodes.some(n => n.id === note3.id);
      if (!reachedNote3) fail2('test 12: mentions->note3 not reached');
      // only the mentions edge should be in edgeBag (not references, not self)
      if (!r.edges.every(e => e.kind === 'mentions')) fail2('test 12: wrong edge kinds', r.edges.map(e => e.kind));
    } catch (err) {
      fail2('test 12 threw', err);
    }

    // 13. traverse startNode missing
    try {
      let threw = false;
      try {
        await query(store, { type: 'traverse', startNode: 'n-ghost' });
      } catch (err) {
        if (err.code === 'START_NODE_NOT_FOUND') threw = true;
      }
      if (!threw) fail2('test 13: missing startNode did not throw');
    } catch (err) {
      fail2('test 13 threw outer', err);
    }

    // 14. prototype pollution attempt
    try {
      let threw = false;
      try {
        await query(store, { type: 'select', from: 'note', where: { '__proto__.x': 1 } });
      } catch (err) {
        if (err.code === 'UNSAFE_FIELD_PATH') threw = true;
      }
      if (!threw) fail2('test 14: proto pollution did not throw');
      // benign query after still works
      const benign = await query(store, { type: 'select', from: 'note' });
      if (benign.length !== 3) fail2('test 14: benign after-pollution query wrong', benign.length);
    } catch (err) {
      fail2('test 14 threw', err);
    }

    // bonus: store shape check
    try {
      let threw = false;
      try {
        await query({}, { type: 'select', from: 'x' });
      } catch (err) {
        if (err.code === 'STORE_MISSING_METHOD') threw = true;
      }
      if (!threw) fail2('bonus: store shape check did not throw');
    } catch (err) {
      fail2('bonus threw outer', err);
    }

    const TOTAL = 14;
    if (failures === 0) {
      console.log(`[graph-query] all ${TOTAL} sanity tests pass`);
    } else {
      console.warn(`[graph-query] ${failures}/${TOTAL} sanity tests FAILED`);
    }

    // teardown: leave DB behind for post-mortem inspection (wiped next run)
    store._close();
  })().catch(err => console.warn('[graph-query] sanity tests crashed', err));
}
