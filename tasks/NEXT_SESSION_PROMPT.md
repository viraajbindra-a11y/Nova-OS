# Paste this into the next session

```
Fresh session. Read in this order before touching anything:

SESSION_HANDOFF.md — full recap of the M0→M3 audit + ship sprint
PLAN.md — milestones (M0.P3, M0.P4, M3 are now ✅; next pending is M4)
tasks/lessons.md — read lessons 99-108 (this session's lessons; older
ones still apply)

Then run:
- git status (changes from this session are uncommitted on disk)
- git log --oneline -20
- grep "44/44" SESSION_HANDOFF.md to confirm test/v03-verification.html
  is the verification entry point

Persona: completely serious, no sugarcoating, zero tolerance for
hallucination. Memory file at ~/.claude/projects/-Users-parul-Nova-OS/
memory/user_persona.md was rewritten on 2026-04-17 — read it. Default
behavior is: execute, report, repeat. Do not ask trivial questions.
Do not narrate plans, just do them. Verify every claim before stating it.

State of the world after the prior session:

(1) M0.P3 done — /app/:appId route in server/index.js strips shell
    chrome and dynamically loads only the requested app's CSS file (if
    any). 80 apps work; 17 have per-app CSS, 63 use only window+system.
    Path traversal blocked via [a-z0-9-]+ whitelist on the route param.

(2) M0.P4 confirmed — nova-first-boot.sh + nmcli auto-reconnect +
    ntpdate + DNS fallback + worldtimeapi timezone all wired in
    distro/build.sh's .xinitrc heredoc. Real Surface Pro 6 e2e test
    still requires hardware boot.

(3) M3 fully shipped:
    - M3.P1: Ollama bundled in ISO via build.sh (curl install +
      systemctl enable). Default model qwen2.5:7b. Settings > AI now
      has a "Download Model" button that streams progress from
      /api/ai/ollama-pull (server proxy of Ollama's /api/pull).
    - M3.P2: budget-manager.js with $0.50/day + $0.05/intent caps,
      Settings dashboard shows daily spend + 50-call rolling log.
    - M3.P3: calibration-tracker.js writes calibration-sample graph
      nodes per category, escalates to S2 when accuracy <70% on 5+
      samples in 7 days. Settings dashboard shows category accuracy
      table + escalated-categories badge.
    - M3.P4: ai:response event with full meta. Menubar brain
      indicator subscribes. Spotlight shows reasoning row when
      escalated.

(4) Brain detection fix:
    - Old: localStorage('nova-ai-provider') was the source of truth.
      Wrong for 'auto' fallthrough cases.
    - First fix: module-level __lastBrain captured from ai:response.
      Race-trap with concurrent plans.
    - Final fix: aiService.askWithMeta(prompt) returns {reply, meta}.
      planIntent returns plan.meta. intent-executor reads
      plan.meta.brain. Race-safe per call.

(5) Verification suite at test/v03-verification.html — 44 tests,
    runs against the running Express server with stubbed AI. Re-run
    by visiting http://localhost:3000/test/v03-verification.html and
    refreshing. No API key needed.

(6) Polish landed:
    - Function() eval in ai-service.js replaced with safeMathEval
      (handles + - * / ^ ** parens, right-assoc exponent).
    - js/lib/dialog.js gained showConfirm. finder + youtube + music
      + text-editor migrated off native confirm()/prompt() — all 8
      call sites use showPrompt/showConfirm now.
    - 7 "leaky timer" apps from prior handoff verified to already
      have correct MutationObserver cleanup. Prior handoff was wrong.

What's NOT done (open loops):

A) Real Anthropic API end-to-end with a funded ANTHROPIC_API_KEY.
   Stub verification proves wiring; real API proves prompt + JSON
   tolerance. Lesson #80/#83 still apply.

B) Real Ollama end-to-end on a machine where `ollama serve` is
   running with qwen2.5:7b pulled. Settings > AI > Test Connection
   button is the way to verify.

C) Native ISO E2E with all 80 apps in GTK windows. Requires
   hardware boot or full UTM run. Last ISO build was prior to this
   session's distro/build.sh changes — needs a fresh build to
   include the Ollama install block.

D) safeMathEval doesn't handle scientific notation (1e6) or unary
   `+` followed by `(`. Add tests + extend if users hit it.

E) Bigger work for next milestone:
   - M4 (Verifiable Code Generation): spec-from-intent →
     tests-from-spec → code-to-pass-tests → provenance + dock
     promotion. Most invasive milestone yet.
   - OR: continue ground-level polish (more apps past 80, ISO
     installer UX, marketplace prep)

If the user has no specific direction, suggest options A-C first
(verification work) before starting M4 — there's no point shipping
M4 on top of M3 wiring that hasn't been proven against real APIs.

Architecture refresher:
- All 80 apps register in js/apps/*.js via processManager.register().
- boot.js has THREE registration blocks (spotlight popup ~167,
  native mode ~227, normal ~335). All three must mirror each other.
- Native shell registry: distro/nova-renderer/nova-shell.c
  app_registry[] near line 156. Update when adding apps.
- Brain tag flow: aiService.askWithMeta → planner returns plan.meta
  → executor reads plan.meta.brain → calibration-tracker.recordSample.
- ai:response event still emitted for menubar/Spotlight UI.
- Verification: /test/v03-verification.html is the single source of
  truth for "does v0.3 still work?"
- Smart answers: getSmartAnswer() from js/lib/smart-answers.js.
- Dialog: showAlert / showPrompt / showConfirm in js/lib/dialog.js.
  showConfirm(msg, container, destructive=true) for delete flows.
- Ollama install in ISO: distro/build.sh after Waydroid block.
  Tolerates network failure with `|| echo "..."`.
- Settings AI section: budget cap input, Test Connection button,
  Download Model (Pull) button with ndjson streaming.

The prior session (2026-04-17) committed nothing — every file
mentioned in SESSION_HANDOFF.md "What's uncommitted" is staged on
disk. User decides commit boundaries (suggested split is in the
handoff doc).

If you change anything that's testable, run the verification suite
again before claiming done.
```
