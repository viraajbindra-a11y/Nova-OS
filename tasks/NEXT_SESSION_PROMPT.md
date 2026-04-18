# Paste this into the next session

```
Fresh session. Read in this order before touching anything:

SESSION_HANDOFF.md — full recap (M0→M3 audit + M4 ship + M5.P1)
PLAN.md — milestones (M0.P3, M0.P4, M3, M4, and M5.P1 done)
tasks/lessons.md — read lessons 99-123 (this session's lessons)

Then run:
- git status (working tree should be clean)
- git log --oneline -16 (last 14 commits are this session)
- node server/index.js
- open http://localhost:3000/test/v03-verification.html — should
  render 131/131 tests green across 13 sections

Persona: completely serious, no sugarcoating, zero hallucination
tolerance. Memory file at ~/.claude/projects/-Users-parul-Nova-OS/
memory/user_persona.md was rewritten on 2026-04-17 — read it.
Default behavior: execute, report, repeat. No trivial questions.
No narration. Verify every claim before stating it.

State of the world:

(1) Architecturally finished through M4 + M5.P1:
    M1 — Intent Kernel (capability registry, executor, parser)
    M2 — Hypergraph Storage (graph-store, query, migration)
    M3 — Dual-Process Runtime (Ollama+Anthropic+budget+
         calibration+brain-tag-via-plan.meta)
    M4 — Verifiable Code Generation (full chain):
         spec-generator.js  — intent → frozen spec
         test-generator.js  — frozen spec → unit test suite
         test-runner.js     — sandboxed iframe with sharedCode load
         code-generator.js  — TDD iteration loop (max 5 attempts)
         app-promoter.js    — bundle + sandbox→dock gate + archive
    M5.P1 — Branching Storage Layer:
         branch-manager.js  — open/record/diff/merge/discard +
                              onBranch helper
    11 new capabilities this session: spec.generate, spec.freeze,
    tests.generate, tests.run, code.generate, app.bundle (L0),
    app.promote (L2), app.archive (L2), branch.create (L0),
    branch.merge (L2), branch.discard (L1)

(2) ISO ready to rebuild:
    - Ollama install added to distro/build.sh
    - All M0.P3/P4 wiring already in place
    - Run distro/build.sh to produce a fresh ISO; last release
      predates this session's changes.

(3) Verification: 131/131 tests offline at
    /test/v03-verification.html. The suite stubs
    aiService.askWithMeta so it runs without an API key. Re-run
    after any kernel change.

What's NOT done (in priority order):

A) Real Anthropic API E2E with funded ANTHROPIC_API_KEY.
   Tests prove wiring; real API proves Claude's prompt + JSON
   tolerance for every M3/M4 phase.

B) Real Ollama E2E. Settings > AI > Test Connection + Pull Model
   both work; not soak-tested against real Ollama.
   Try: `ollama serve` + `ollama pull qwen2.5:7b`, then run a
   spec → tests → code chain end-to-end through Spotlight.

C) Native ISO E2E with all 80 apps + Ollama bundled. Hardware
   boot or full UTM run required. Build a new ISO first.

D) M4 dock surface: bundle/promote write 'generated-app' graph
   nodes, but no dock-icon plumbing reads them yet. Renderer
   needs a passive scan + register-as-app on docked status.

E) M5.P2 Operation Interceptor — wrap every L2+ capability
   execute() in branch-manager.onBranch(), route the diff to a
   Spotlight preview (the existing plan:preview gate UI), wait
   for confirm/abort. The substrate is now ready (M5.P1
   shipped). This makes the safety story REAL across the OS,
   not just for plans.

F) M5.P3 (Undo/Rewind UI) and M5.P4 (External-Effect Detection
   for git push, API call, etc. — point-of-no-return marking).

G) M6 Socratic Loop + Red-Team Agent. Also retrofits
   app.promote to require red-team signoff in addition to user.

H) Spotlight Socratic UI for spec approval. spec.freeze is a
   capability call — there's no nice user flow to review the
   spec draft. Reuse the existing L2+ preview gate pattern in
   spotlight.js.

I) safeMathEval doesn't handle scientific notation (1e6) or
   unary +(.

If the user has no specific direction, suggest options A, B,
D, E first (verify what shipped against real APIs, make the
dock actually show generated apps, wire the interceptor) before
tackling M5.P3+ or M6.

Architecture refresher:

- M4 chain: spec.generate → user spec.freeze → tests.generate
  → code.generate (with internal tests.run iteration) →
  app.bundle → user app.promote.

- M5.P1 substrate: createBranch → record({kind, args, describe})
  multiple times → diffBranch (preview) → mergeBranch (apply)
  OR discardBranch (drop). Branch is a 'branch' graph node with
  pendingMutations[]. Lifecycle: open → committed | discarded.

- Sandbox isolation: test-runner builds an iframe with
  sandbox="allow-scripts" (NOT allow-same-origin). Unique
  origin → no parent window/storage/network. Verified by an
  explicit "sandbox blocks parent localStorage access" test.

- Brain tag flow: aiService.askWithMeta returns {reply, meta}.
  Planner propagates meta. Executor reads plan.meta.brain.
  Race-safe per-call (lessons #100, #106).

- Schema validators are first-line defense at three boundaries
  (test-generator, code-generator, sandbox).

- Provenance edges: bundleApp adds three edges per generated
  app — derives_from spec, passed_tests suite, runs_code code.

- Transaction-log branching: each branch records mutation calls
  (createNode/updateNode/deleteNode/addEdge/removeEdge) instead
  of duplicating graph state. Replays on merge so provenance
  flows through unchanged.

- All 80 apps register in 3 boot.js blocks. Native shell C
  registry at distro/nova-renderer/nova-shell.c (~line 156)
  also needs updating.

- Verification: /test/v03-verification.html — 131 tests, 13
  sections, 0 API key. Re-run after every kernel-layer change.

Working tree is clean. The 14 commits this session (latest first):
  d461e6d docs M5.P1 + lessons 121-123
  2b29bfd M5.P1 branching storage
  267b524 docs M4 done + lessons 115-120
  f414fee M4.P4 promotion gate
  c8e48e6 M4.P3.b code-from-tests
  c1569ca docs lessons 109-114
  0dbbe83 M4.P3 sandboxed runner
  e34f8c4 M4.P2 tests-from-spec
  4d8ac82 M4.P1 spec generator
  aa09740 docs lessons 99-108
  51463ce dialog migration
  22eb154 brain race-safe + safe math
  ea23740 M3.P1 Ollama in ISO
  b7de3ed M0.P3 chrome strip + verification suite

If you change anything that's testable, run the verification
suite again before claiming done.
```
