# Safety Rails — Design Doc

**Audit holes addressed:** #5 (zero safety story), #6 (self-mod dangerous as a feature)

**Status:** Design doc. Implementation spans M1 through M8.

---

## The problem

v1 of the plan had classical OS security (passwords, encryption, permission prompts) and called that "safety." That's not AI safety. As the AI gains capability, the OS needs structural safeguards that:

1. Prevent the AI from escalating its own privileges
2. Make destructive actions undoable by default
3. Keep the human in the decision loop on value-laden choices
4. Prevent self-modification from drifting values

**Inversion:** Instead of trusting the AI to behave, design the OS so that **bad behavior is structurally impossible**, and when that's not possible, make it **visible and reversible**.

---

## The four-level capability tier

Every action in Astrion belongs to one of four levels. The AI cannot promote itself.

| Level | Name | Scope | Unlock requirement |
|---|---|---|---|
| **L0** | Observe | Read-only: file.read, notes.search, browser.view | None — always allowed |
| **L1** | Sandbox | Scratch space: sandbox file ops, ephemeral app instances | None — always allowed |
| **L2** | Real | User data: file.edit/delete, settings.change, app.install | Per-session unlock (PBKDF2 password re-entry) |
| **L3** | Self-mod | Astrion's own code: workflow edits, kernel patches | Per-action unlock + red-team signoff |

**How promotion works:** Capability objects declare their level (see `capability-api.md`). The kernel checks the current unlock state before executing. If the current state is below the required level, the kernel halts and surfaces a Socratic unlock prompt. The AI has no API to unlock anything — only the human can.

## The value-lock

User's declared goals and the safety rails themselves are stored in a **cryptographically signed file** (`values.lock`) that is:

- Read-only to the kernel and all capability providers
- Modifiable only via a physical-touch confirmation flow (for desktop) or admin unlock (for cloud)
- Diffed on every boot; if the file's hash changes unexpectedly, Astrion refuses to start and surfaces a recovery flow

**Why:** When M8 (self-modification) lands, the healer cannot touch `values.lock` because any attempt trips the kill-switch. This is the inviolable rule.

## Mandatory red-team agent

Any plan that touches L2 or higher goes through a red-team agent. The red-team:

- Runs as a separate OS process with no write access
- Uses a different model than the planner (or the same model with an adversarial system prompt and isolated context)
- Produces a structured critique: list of failure modes, blast radius, alternatives
- Cannot be disabled by the planner or the user at runtime — it can only be reconfigured via a `values.lock` change

The user always sees both the plan AND the red-team's critique side-by-side. No silent execution for L2+.

## Provenance everywhere

See `provenance.md`. Short version: every fact the AI states and every artifact it generates carries:

- Source (training data, tool output, user memory, inference)
- Confidence (0–1, from the model's own estimate)
- Chain of reasoning (not hidden in the LLM's context window — surfaced as a clickable receipt)
- Timestamp + model version + seed (for reproducibility)

## Self-modification quarantine (M8)

When self-modification lands in M8, the healer operates under these **inviolable** rules:

1. **Cannot modify `values.lock`.** Any diff that touches it → immediate shutdown of self-mod mode.
2. **Cannot modify its own source code.** Only modifies modules listed in `self_mod_allowed.txt` (signed, also read-only to the healer).
3. **Cannot modify the golden test suite.** Tests are frozen and run on every proposed fix; any test failure → automatic rollback.
4. **Cannot modify the red-team.** Red-team is a different process with a different model; healer has no IPC into it.
5. **Every fix runs against the frozen tests in a sandbox fork first.** Only promoted to main after all tests pass.
6. **Every fix is reversible.** Automatic rollback handle generated before the fix is applied.

## Inversion table (what will break)

| Will break | Inverted fix |
|---|---|
| Providers lie about their declared level | CI suite tests actual effects on a reference system |
| User unlocks L2 once and forgets, leaving a wide-open session | Auto-re-lock after 5 min idle; risky actions force re-unlock even during active session |
| Red-team is predictable, planner learns to bypass it | Rotate red-team prompts + use chaos injection (random known-bad plans to test the red-team's precision) |
| Value-lock key is lost → user is locked out forever | Recovery flow requires a pre-registered hardware key or recovery code printed during setup |
| Self-mod sandbox has a bug that lets the healer escape | Capability-based sandbox (not syscall filtering); healer gets no tools it doesn't need |
| Healer modifies `self_mod_allowed.txt` via a clever path | File is on a read-only mount for the healer's process namespace |

## Timeline

- **M1** — L0/L1/L2/L3 declared on every capability
- **M3** — Brain indicator (S1/S2) surfaces which level of model answered
- **M4** — Provenance field on every artifact
- **M5** — Reversibility system honors the level (L2+ creates branches)
- **M6** — Red-team agent ships; Socratic prompts fire on L2+
- **M8** — Self-modification quarantine fully implemented
