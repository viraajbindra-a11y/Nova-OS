# Paste this into the next session

```
Fresh session. Read in this order before touching anything:

SESSION_HANDOFF.md — full recap (M0→M3 audit + entire M4 ship)
PLAN.md — milestones (M0.P3, M0.P4, M3, M4 all done)
tasks/lessons.md — read lessons 99-120 (this session's lessons)

Then run:
- git status (working tree should be clean)
- git log --oneline -14 (last 11 commits are this session)
- node server/index.js
- open http://localhost:3000/test/v03-verification.html — should
  render 113/113 tests green across 12 sections

Persona: completely serious, no sugarcoating, zero hallucination
tolerance. Memory file at ~/.claude/projects/-Users-parul-Nova-OS/
memory/user_persona.md was rewritten on 2026-04-17 — read it.
Default behavior: execute, report, repeat. No trivial questions.
No narration. Verify every claim before stating it.

State of the world:

(1) Architecturally finished through M4:
    M1 — Intent Kernel (capability registry, executor, parser)
    M2 — Hypergraph Storage (graph-store, query, migration)
    M3 — Dual-Process Runtime (Ollama+Anthropic+budget+
         calibration+brain-tag-via-plan.meta)
    M4 — Verifiable Code Generation:
         spec-generator.js  — intent → frozen spec
         test-generator.js  — frozen spec → unit test suite
         test-runner.js     — sandboxed iframe with sharedCode load
         code-generator.js  — TDD iteration loop (max 5 attempts)
         app-promoter.js    — bundle + sandbox→dock gate + archive
    8 new capabilities this session: spec.generate, spec.freeze,
    tests.generate, tests.run, code.generate, app.bundle (L0),
    app.promote (L2 user-approval gate), app.archive (L2)

(2) ISO ready to rebuild:
    - Ollama install added to distro/build.sh
    - All M0.P3/P4 wiring already in place
    - Run distro/build.sh to produce a fresh ISO that has the
      new bits — last ISO build was prior to this session.

(3) Verification: 113/113 tests offline at
    /test/v03-verification.html. The suite stubs
    aiService.askWithMeta so it runs without an API key. Re-run
    after any kernel change.

What's NOT done:

A) Real Anthropic API E2E with funded ANTHROPIC_API_KEY.
   Tests prove wiring; real API proves Claude's prompt + JSON
   tolerance for spec/test/code generation across all four phases.

B) Real Ollama E2E. ai-service.js routes to /api/ai/ollama →
   localhost:11434 by default. Settings > AI > Test Connection +
   Pull Model both work; not soak-tested against real Ollama.
   Try it: `ollama serve` + `ollama pull qwen2.5:7b`, then run a
   spec → tests → code chain end-to-end through Spotlight.

C) Native ISO E2E with all 80 apps + Ollama bundled. Hardware
   boot or full UTM run required. Build a new ISO first
   (distro/build.sh) since the last release predates these
   changes.

D) M4 dock surface: bundle/promote write graph nodes, but no
   actual dock-icon plumbing reads them yet. The renderer needs a
   passive scan + register-as-app on the docked status. Spotlight
   can already launch arbitrary capabilities; the gap is the dock
   UI showing the new app.

E) Spotlight Socratic UI for spec approval. spec.freeze is a
   capability call — there's no nice user flow to review the spec
   draft and approve it. Reuse the existing L2+ preview gate
   pattern in spotlight.js (it already shows "Press ↵ Enter to
   confirm" for L2 capabilities).

F) safeMathEval doesn't handle scientific notation (1e6) or
   unary +(. Add tests + extend if users hit it.

G) M5 (Reversibility) and M6 (Socratic + Red-Team Agent) are the
   next big milestones. M6 retrofits app.promote to require
   red-team signoff in addition to user L2.

If the user has no specific direction, suggest options A, B, D
first (verify what shipped against real APIs / hardware, then
make the dock actually show generated apps) before starting M5.

Architecture refresher:

- M4 chain: spec.generate → user spec.freeze → tests.generate →
  code.generate (with internal tests.run iteration) →
  app.bundle → user app.promote.

- Sandbox isolation: test-runner builds an iframe with
  sandbox="allow-scripts" (NOT allow-same-origin). Unique
  origin → no parent window/storage/network. Verified by an
  explicit "sandbox blocks parent localStorage access" test.
  Now also accepts a 'load' message that parses sharedCode at
  load time (so syntactically broken code fails the suite
  up-front, not per test).

- Brain tag flow: aiService.askWithMeta returns {reply, meta}.
  Planner propagates meta. Executor reads plan.meta.brain.
  Race-safe per-call (lessons #100, #106).

- Schema validators are first-line defense. test-generator AND
  code-generator both reject forbidden tokens (import, eval,
  fetch, etc.) before any sandbox execution. Three layers of
  defense: prompt rules, schema validator, sandbox isolation.

- Provenance edges: bundleApp adds three edges per generated
  app — derives_from spec, passed_tests suite, runs_code code.
  Spotlight queries can walk back to "what did this come from?"
  in one hop.

- All 80 apps register in 3 boot.js blocks (spotlight popup,
  native mode, normal). Add new apps to all three. Native shell
  C registry at distro/nova-renderer/nova-shell.c (~line 156)
  also needs updating.

- Verification: /test/v03-verification.html — 113 tests, 12
  sections, 0 API key. Re-run after every kernel-layer change.

Working tree is clean — every file change from this session is
in one of these 11 commits (latest first):
  f414fee M4.P4 promotion gate
  c8e48e6 M4.P3.b code-from-tests
  c1569ca docs (lessons 109-114)
  0dbbe83 M4.P3 sandboxed runner
  e34f8c4 M4.P2 tests-from-spec
  4d8ac82 M4.P1 spec generator
  aa09740 docs (lessons 99-108)
  51463ce dialog migration
  22eb154 brain race-safe + safe math
  ea23740 M3.P1 Ollama in ISO
  b7de3ed M0.P3 chrome strip + verification suite

If you change anything that's testable, run the verification
suite again before claiming done.
```
