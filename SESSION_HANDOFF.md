# Session Handoff: M0→M3 Audit + Ship + Polish Pass

**Date:** 2026-04-17
**Branch:** main (uncommitted — see "What's uncommitted" below)
**Commits this session:** 0 yet (all changes staged on disk, not committed — user will decide commit boundaries)
**Starting point:** 80 apps, commit `f8a47fa` (timer.js leak fix)
**Verification:** 44/44 tests in `test/v03-verification.html` (no API key needed)

---

## What This Session Was

User direct order: "everything up to M3 needs to be done … no claude keys stopping me from doing anything." Persona reset to fully serious / no sugarcoating (memory file updated).

The session opened by re-reading PLAN.md and SESSION_HANDOFF.md and discovered that **M3 was substantively shipped already** — `budget-manager.js`, `calibration-tracker.js`, ai-service.js Ollama+Anthropic+budget+escalation routing, and Settings dashboard for both budget + calibration were all on disk. PLAN.md status had drifted (lesson #99). M0.P4 was also already wired in build.sh.

So the actual session work was: audit what shipped, fix bugs found in the audit, fill the remaining gaps, and write a verification suite that proves it works without an API key.

---

## What Shipped This Session

### M0.P3 — Web Apps in Native Mode ✅
- `/app/:appId` route in `server/index.js:725-805` rewritten to:
  - Load only `system.css` + `window.css` + the requested app's CSS (if it exists). Previously hardcoded 17 of 80 apps' CSS.
  - Path traversal guard: `[a-z0-9-]+` regex on `:appId` returns 400 for `/app/../../etc/passwd`.
  - Inline `display:none` rules still hide chrome elements that boot.js's window-manager references.
- Verified all 4 routes via preview: terminal (has CSS), rps (no CSS, valid), path traversal blocked, launch marker present.

### M0.P4 — Install + Persistence ✅ (already shipped, verified)
- `nova-first-boot.sh` (zenity install/try/never-ask dialog) wired in `.xinitrc` before nova-shell.
- `nmcli device wifi rescan` + auto-connect saved profile.
- `sudo ntpdate -u pool.ntp.org`.
- DNS fallback (8.8.8.8 + 1.1.1.1).
- Auto timezone via worldtimeapi.org IP geolocation.

### M3.P1 — Bundle Ollama in ISO ✅
- Added install block in `distro/build.sh` after Waydroid (line 184-205):
  - `curl -fsSL https://ollama.com/install.sh | sh` inside chroot
  - `systemctl enable ollama.service` (manual symlink fallback for chroot)
  - Tolerates failure with `|| echo "..."` per lesson #104
- Model not bundled (ISO size cap); user pulls `qwen2.5:7b` from Settings post-install.

### M3 brain detection bug fix ✅
- `js/kernel/intent-executor.js`: was reading `localStorage('nova-ai-provider')` for calibration brain tag. With `auto` provider, an Ollama failure that fell through to Anthropic was tagged as `s1` — calibration data wrong by design.
- Fix: subscribe to `ai:response` at module scope, capture latest `brain` field, use it in `recordSample()`. intent:plan handler is sequential within a query so a single module-level variable is race-free.

### Function() eval replaced with safe parser ✅
- `js/kernel/ai-service.js:_mockResponse` math handler used `Function('"use strict"; return (' + expr + ')')()` with regex-gated input. Safe in practice but fails security audits.
- Replaced with a 35-line recursive-descent parser (`safeMathEval`, exported at file end) handling `+ - * /`, parens, unary minus.

### Settings UI cleanup
- Default Ollama model changed `llama3.2` → `qwen2.5:7b` (matches ai-service.js default; was inconsistent).
- Model description updated to reference `ollama pull MODEL`.

### Persona memory rewrite
- `~/.claude/projects/-Users-parul-Nova-OS/memory/user_persona.md` rewritten per user order: completely serious, zero sugarcoating, hallucination zero-tolerance, technical default, execute-first.

### v0.3 Offline Verification Suite ✅
- `test/v03-verification.html` — 44 tests, runs against the Express server with a stubbed AI (no API key needed).
- Sections: safe math parser (11 — incl. 4 new exponent tests), budget manager (6), calibration tracker (8), capability registry (3), planner with stubbed AI (6), executor end-to-end with binding (7), brain detection via plan.meta (3).
- **Result: 44/44 pass.** Verified on preview server.
- Re-runnable any time at `http://localhost:3000/test/v03-verification.html` — refresh to re-run.

### Polish pass (after the M3 audit landed)
- **Timer leak audit:** Handoff said 7 apps had leaks. Verified all 7 (clock, music, beat-studio, animate, matrix-rain, youtube, voice-memos) already have proper `MutationObserver` cleanup that clears their timers/intervals/RAF on disconnect. **No work needed** — the handoff note was wrong.
- **Dialog migration:**
  - `js/lib/dialog.js`: added `showConfirm(message, container, destructive=false)` (yes/no with optional red Delete styling).
  - `js/apps/finder.js`: 2 `confirm()` calls → `showConfirm` with destructive styling for delete flows.
  - `js/apps/youtube.js`: `prompt()` for API key → `showPrompt` (async).
  - `js/apps/music.js`: `prompt()` for API key → `showPrompt` (async).
  - `js/apps/text-editor.js`: 3 `prompt()` (Cmd+G goto-line, save-as, dead `_old_replace`) → `showPrompt`. Deleted unreachable `_old_replace` legacy block.
- **Brain race-safety upgrade:** the prior fix used an `__lastBrain` module variable, race-prone with concurrent plans. Replaced with `aiService.askWithMeta(prompt)` returning `{reply, meta}`. The planner returns `meta` in its result, the executor reads `plan.meta.brain` for calibration. `__lastBrain` kept as a fallback only for code paths that haven't migrated.
- **Ollama "Pull Model" UI:**
  - `server/index.js`: new `POST /api/ai/ollama-pull` route that streams ndjson progress from Ollama's `/api/pull` to the client (30-min hard cap).
  - `js/apps/settings.js`: new "Download Model" row + Pull button. Streams progress in the row description, shows ✅ on completion.
- **Math parser exponents:** `safeMathEval` now handles `**` and `^` (right-associative — `2^3^2 = 512`).

### Documentation
- `PLAN.md` M0.P3, M0.P4, M3.P1-P4 updated to ✅ COMPLETE with on-disk verification notes.
- `tasks/lessons.md` 7 new lessons (99-105) covering PLAN drift, brain-from-event, dynamic CSS, init order in tests, provenance vs resolved args, chroot-tolerant installs, hand-rolled parsers vs eval.
- `SESSION_HANDOFF.md` (this file) rewritten.

---

## What's Uncommitted

Run `git status` and `git diff` to see exactly what's on disk. High-level changes (no files added that aren't listed):

- `server/index.js` — `/app/:appId` chrome strip + new `/api/ai/ollama-pull` ndjson stream route
- `js/kernel/intent-executor.js` — brain capture from `ai:response` (fallback) + `plan.meta.brain` (primary)
- `js/kernel/intent-planner.js` — switched from `aiService.ask` to `aiService.askWithMeta`, returns `meta` in plan result
- `js/kernel/ai-service.js` — added `askWithMeta` (returns `{reply, meta}`) + replaced `Function()` eval with recursive-descent `safeMathEval` (now with `**` / `^`)
- `js/lib/dialog.js` — added `showConfirm` (yes/no, optional destructive styling)
- `js/apps/finder.js` — 2 `confirm()` → `showConfirm`
- `js/apps/youtube.js` — `prompt()` → `showPrompt`
- `js/apps/music.js` — `prompt()` → `showPrompt`
- `js/apps/text-editor.js` — 3 `prompt()` → `showPrompt`, deleted dead `_old_replace`
- `js/apps/settings.js` — Ollama default model `llama3.2`→`qwen2.5:7b`, new "Download Model" Pull button + ndjson progress stream
- `distro/build.sh` — Ollama install block after Waydroid
- `tasks/lessons.md` — appended 99-105 (will append 106-108 below for the polish pass)
- `PLAN.md` — M0.P3 / M0.P4 / M3 status updates
- `test/v03-verification.html` — new file (44-test offline suite)
- `SESSION_HANDOFF.md` — this file
- `~/.claude/projects/-Users-parul-Nova-OS/memory/user_persona.md` — persona rewrite (serious/no sugarcoating)

User decides commit boundaries. Suggested split:
1. M0.P3 chrome strip (`server/index.js` route + `test/`)
2. M3.P1 Ollama in ISO + Pull-model UI (`distro/build.sh` + `server/index.js` route + `js/apps/settings.js`)
3. M3 race-safe brain via askWithMeta + plan.meta (`js/kernel/ai-service.js` + `js/kernel/intent-planner.js` + `js/kernel/intent-executor.js`)
4. Function() eval → safeMathEval w/ exponents (`js/kernel/ai-service.js` — included in #3 if grouped by file)
5. Dialog migration (`js/lib/dialog.js` + 4 app files)
6. Docs (`PLAN.md` + `tasks/lessons.md` + `SESSION_HANDOFF.md`)

---

## What's NOT Done (Open Loops for Next Session)

### Verification gaps
- Real Anthropic API end-to-end with a funded `ANTHROPIC_API_KEY` — lesson #80/#83 still apply. Stub verification proves the wiring; real API proves the prompt + JSON tolerance hold under Claude Haiku's actual output style.
- Real Ollama end-to-end on a machine with `ollama serve` running. The Ollama path was tested via stub only this session.
- Native ISO E2E with all 80 apps in GTK windows — requires hardware boot.

### Known fragility
- The brain-from-event fix (`__lastBrain` module variable) assumes the intent:plan handler is sequential. If two plans fire concurrently (e.g. background scheduled task + user query), the second plan can poison the first's calibration sample. Not a problem today (user is single-threaded) but a real issue for M7+ marketplace skills.
- `safeMathEval` doesn't handle exponents (`**`, `^`) or unary `+` followed by `(`. Add tests + extend if users hit it.
- Settings UI doesn't expose a one-click "Pull Ollama model" button — user has to run `ollama pull qwen2.5:7b` from a terminal. Worth adding a "Download model" button in Settings > AI that POSTs to `/api/ai/ollama-pull`.

### Bigger work for next session
- M4 (Verifiable Code Generation): spec-from-intent → tests-from-spec → code-to-pass-tests → provenance + dock promotion
- Or: continue polish (timer leaks in 7+ apps, finder confirm() native dialog migration)

---

## Architecture Notes (Stable, Just Confirmed)

- **Ollama URL**: `http://localhost:11434` (default in ai-service.js)
- **Default model**: `qwen2.5:7b`
- **AI provider key**: `localStorage['nova-ai-provider']` — values `auto` | `ollama` | `anthropic` | `mock`
- **Brain tagging**: `ai:response` event carries `{brain, confidence, provider, capCategory, model, escalated}`. Subscribe to capture; never read provider setting.
- **Budget defaults**: $0.50/day, $0.05/intent
- **Escalation threshold**: 70% accuracy on 5+ samples in 7-day window
- **Web Spotlight popup**: `/popup/spotlight` (loaded by nova-shell via WebKitGTK)
- **App routes**: `/app/:appId` strips chrome, dynamic per-app CSS
- **Verification suite**: `/test/v03-verification.html` (38 tests, no API key needed)
