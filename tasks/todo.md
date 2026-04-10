# Session Plan — 2026-04-09

## Goals
1. Publish the bootable ISO to the latest GitHub Release (v0.1.95) so people can download it without logging into GitHub Actions
2. Rewrite `PLAN.md` as v2 — based on the adversarial audit, committed to an AI-native architecture, written so a 12-year-old can read it
3. Create a team presentation explaining Astrion OS, the audit, and the new direction

## Rules Active (from workflow orchestration)
- Plan first → this file
- Verify plan → check in with user before any implementation
- Inversion thinking → for every task, name what will break, then flip it into the solution
- Simplicity first, minimal impact
- Capture lessons in `tasks/lessons.md` after any correction
- Audience is a 12-year-old — ELI12 tone in prose, real precision in specs

## Lessons Applied (from `tasks/lessons.md`)
- **#17**: `nova-update` only updates web files — OK here because no `distro/` changes since the ISO build; web files can be delivered via update
- **#19**: Don't hallucinate features — verify ISO contents with `file` before publishing
- **#20**: Cancel and retrigger stale builds — NOT needed here, verified no `distro/` commits since build

---

## Task 1 — Publish ISO to GitHub Release v0.1.95

### Facts (verified via recon)
- Latest successful ISO build: workflow run `24164335232`, 2026-04-08 23:39 UTC
- Artifact: `nova-os-bootable-iso` (contains `nova-os.iso`)
- Size: **1,862,922,900 bytes ≈ 1.86 GB** (under GitHub's 2 GB per-asset limit)
- SHA256: `d8ff869e9520bcc4caa5f5fb58968e83f1acec8f7ff11696b20fb93b586972c5`
- Expires: 2026-05-09 (safe)
- Built from commit: `f671ca2` (shell/C code unchanged since)
- Release v0.1.95 currently has: DMG, AppImage, exe — **no ISO**
- Disk free: ~1 TB (plenty)

### Inversion — what will break and how to prevent it
| Will break | Inverted solution |
|---|---|
| Artifact is actually expired / 404 | Re-verify expiry right before download with `gh api` |
| Downloaded zip is empty / corrupt | Check file size after download; extract and `file` the iso |
| Upload is >2 GB (release asset limit) | Already verified 1.86 GB — safe |
| Asset name is unclear (`nova-os.iso` is old branding) | Rename to `astrion-os-0.1.95-amd64.iso` |
| User can't verify integrity of download | Also upload a `.sha256` checksum file next to the ISO |
| Future builds still orphan the ISO as expiring artifacts | Follow-up: patch `build-iso.yml` to auto-attach on tag push (separate commit, after Task 1 lands) |
| Re-running clobbers the existing Electron assets on the release | Use `gh release upload --clobber` ONLY on the iso+sha256, not on existing assets |
| Leftover 3+ GB of temp files on disk | Clean up zip and extracted iso after upload succeeds |
| Wrong commit baked in (stale ISO) | Verified: no `distro/` changes since build — ISO shell/C is current; note web-side version in release body |
| Upload takes forever over home WiFi | Run upload in background and monitor; expect ~5-15 min |

### Steps
- [ ] A0. Re-verify artifact still exists and is not expired
- [ ] A1. Create working dir `/tmp/astrion-iso-publish`
- [ ] A2. Download artifact via `gh run download 24164335232 -n nova-os-bootable-iso -D /tmp/astrion-iso-publish`
- [ ] A3. Verify downloaded file is a valid ISO with `file`
- [ ] A4. Rename to `astrion-os-0.1.95-amd64.iso`
- [ ] A5. Generate SHA256 file: `astrion-os-0.1.95-amd64.iso.sha256`
- [ ] A6. Upload both to v0.1.95 release via `gh release upload v0.1.95 ... --clobber`
- [ ] A7. Update release body notes to mention ISO + flashing instructions + SHA256 verification
- [ ] A8. Clean up `/tmp/astrion-iso-publish`
- [ ] A9. Verify via `gh release view v0.1.95` that both assets are listed

### Follow-up (separate commit, AFTER A0-A9 succeed and you approve)
- [ ] A10. Patch `.github/workflows/build-iso.yml` so future builds also `gh release upload` to the latest tag — so this is never manual again

### Success looks like
`https://github.com/viraajbindra-a11y/Astrion-OS/releases/tag/v0.1.95` has `astrion-os-0.1.95-amd64.iso` as a downloadable asset, plus its `.sha256`, plus release notes explaining how to flash it.

---

## Task 2 — Rewrite `PLAN.md` as v2

### Goal
Replace the macOS-clone-with-Claude plan with one committed to an architecture that actually survives the AGI transition. ELI12 prose, real engineering precision, inversion baked into every milestone.

### Constraints
- Must be readable by a 12-year-old
- Must keep the April 6-14 shell rebuild (substrate work is still needed)
- Must commit to exactly 3 load-bearing architectural choices (no more — overloading kills shipping)
- Every milestone needs: a 1-sentence success definition, a demo script, and an inversion table
- Must say explicitly what survives from the current 51-app codebase and what gets demoted

### Inversion for the plan itself
| Will break | Inverted solution |
|---|---|
| Plan becomes sci-fi philosophy no one ships | Each milestone ends with a concrete demo the kid can show dad |
| Too many new ideas → analysis paralysis | Cap at 3 load-bearing commitments; defer others to M7+ |
| Jargon wall → kid zones out | Every concept paired with kid-version + adult-version |
| Plan contradicts 51 existing apps → migration cliff | Explicit "survives / demoted / deleted" table |
| No safety section → same failure as v1 | Safety rails listed per milestone, not as an appendix |
| No exit criteria → milestones drag forever | Each milestone has ONE sentence: "done when X" |
| Revenue section is SaaS clone | Reshape to usage-based (compute + attention + risk budget) |
| Plan ignores current distro/shell work | Make Phase 0 = finish the shell rebuild, don't skip it |

### The 3 load-bearing commitments
1. **Intent Kernel** — the OS schedules goals, not programs
2. **Dual-process brain (fast + slow)** — this is the path from LLM → AGI → SGI, unchanged architecture
3. **Verifiable + Reversible + Socratic** — safety fused into the default loop: every AI action has a receipt, every destructive action is undoable, every big decision asks you first

### Structure of new PLAN.md
1. The one sentence (vision)
2. What was wrong with v1 (short, honest)
3. The 3 commitments (kid + adult version each)
4. Safety rails (always-on rules)
5. What survives from today's codebase
6. What gets demoted
7. M0: finish shell rebuild (April 6-14) — keep from v1
8. M1: Intent Kernel foundations
9. M2: Hypergraph storage + graph-native apps
10. M3: Dual-process runtime (S1 local / S2 cloud)
11. M4: Verifiable code generation
12. M5: Reversibility + temporal substrate
13. M6: Socratic loop + red-team agent
14. M7: Declarative intent language + skill marketplace
15. M8: Alignment-proven self-modification (the real AGI milestone)
16. Revenue — reshaped
17. Lessons carried forward

### Steps
- [ ] B1. Draft PLAN_v2 outline with all inversion tables filled
- [ ] B2. Write to `PLAN.md` (overwriting v1 — v1 is safe in git history)
- [ ] B3. Re-read aloud as a 12-year-old, flag any jargon, fix it
- [ ] B4. Commit with clear message referencing the audit

### Success looks like
The 12-year-old (you) can read `PLAN.md` and explain each milestone in one sentence to your dad without looking.

---

## Task 3 — Team Presentation

### Questions I need answered before writing (AskUserQuestion)
1. **Who is the team?** — classmates? friends helping code? family? online collab group?
2. **What format?** — Markdown slides (easiest), Canva deck (pretty, I can build it via MCP), PDF
3. **How long?** — 5 min lightning / 15 min standard / 30 min deep dive
4. **What's the goal?** — recruit contributors / share progress / get buy-in on new direction / all three

### Inversion
| Will break | Inverted solution |
|---|---|
| Too jargon-heavy → team zones out | ELI12 first, technical terms only after the concept lands |
| No visuals → boring | Screenshots of running OS + simple diagrams |
| Too long → audience drifts | Hard cap at 12 slides for 15-min version |
| Only "what I built" → feels like showing off, not inviting help | 3-act structure: Today → Problem → Future |
| Kid forgets what to say mid-presentation | Speaker notes under every slide |
| Audience doesn't know what an OS is | Slide 2 = "what's an OS" in 30 seconds |
| No ask at the end → no one helps | Final slide = specific asks (write app X, test ISO on device Y, etc.) |
| Dense slides = people read instead of listen | 1 big idea per slide, max 20 words of text |

### Default plan (used if you just say "you pick")
- Format: Canva deck (uses the MCP, looks sharp, shareable)
- Length: 12 slides for a 15-minute talk
- Structure:
  1. Title + one-liner ("An AI-native OS for a 12-year-old's team")
  2. What's an OS? (30 sec explainer)
  3. Astrion OS today (screenshot + stats: 51 apps, native C shell, ISO)
  4. What we got right (3 wins)
  5. What we got wrong (audit findings, 3 biggest)
  6. The thinking-house metaphor (the shift in vision)
  7. The 3 load-bearing ideas (intent kernel / dual brain / verifiable+reversible+socratic)
  8. Safety — why this matters for AGI
  9. The new roadmap (M0 → M8)
  10. Demo: ISO download + boot
  11. How you can help (specific asks)
  12. Q&A / contact

### Steps
- [ ] C0. Ask the 4 questions via AskUserQuestion (parallel with Task 1 if possible)
- [ ] C1. Outline slides based on answers
- [ ] C2. Write slide content + speaker notes
- [ ] C3. Generate in chosen format
- [ ] C4. Re-read as presenter — flag anything I'd stumble on

### Success looks like
You can run through the whole deck once without a script and feel confident presenting it to your team.

---

## Execution Order (proposed)
1. **Check in with user on this plan** ← we are here
2. Ask the 4 presentation questions (Task 3, C0) — parallel with ISO download
3. Publish ISO (Task 1) — longest running, I/O bound
4. Rewrite PLAN.md (Task 2) — during ISO upload wait
5. Write presentation (Task 3)
6. Update `tasks/lessons.md` if any new lessons came up
7. Review section added here
