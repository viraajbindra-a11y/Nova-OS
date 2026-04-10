# Self-Modification Rules — Design Doc

**Audit hole addressed:** #6 — "Self-modification (M6 in v1) is the most dangerous item in the plan, presented as a feature"

**Status:** Inviolable rules. Implementation targets M8.

---

## The problem

v1 listed "Error self-healing: When an app crashes, AI reads the error, diagnoses the cause, and fixes the code" as a feature. Presented innocently. But:

- A fix that introduces a new bug can cascade: the healer triggers, makes it worse, chains out of control
- A healer that can modify its own tests makes regressions invisible
- A healer that can modify its own rules drifts values over time, invisibly
- A healer that can modify its red-team neutralizes its own safety check

**Inversion:** Self-modification is the most dangerous capability in the entire OS. It gets the strictest quarantine. Every rule below is **inviolable** — breaking any one of them shuts down self-mod capability until a human reviews.

---

## The 7 inviolable rules

### Rule 1: Frozen golden test suite
The healer cannot modify `tests/golden/`. This directory contains:
- Safety rail tests (value-lock integrity, capability level enforcement)
- Kernel behavior tests (intent parsing, provider IPC, budget enforcement)
- Red-team integration tests
- Rollback automation tests

The golden tests run on every proposed fix in a sandbox fork **before** the fix is promoted. If ANY golden test fails: automatic rollback, no exception.

**Enforcement:** `tests/golden/` is on a read-only mount for the healer's process namespace. The kernel verifies the directory's cumulative hash on every boot against a signed baseline.

### Rule 2: Cannot modify its own source
The healer can only modify files listed in `self_mod_allowed.txt`. That file is:
- Signed with the same key as `values.lock`
- Read-only to the healer
- Diffed on every boot; unexpected changes → shut down self-mod + notify user

`self_mod_allowed.txt` explicitly excludes:
- The healer itself (`src/healer/**`)
- The red-team agent (`src/red-team/**`)
- The safety rails loader (`src/safety/**`)
- The kernel scheduler (`src/kernel/scheduler.rs` or equivalent)
- Everything in `tests/golden/`
- `values.lock` and its parent directory

### Rule 3: Cannot modify the red-team
Red-team runs in a separate process with:
- A different model than the planner making the fix
- A signed system prompt
- No IPC receive channel from the healer (only send; the red-team reads proposed fixes but the healer cannot send commands to the red-team)
- Its own sandboxed filesystem view

The healer has **zero** write access to the red-team's process, its prompt, its model weights, or its sandboxed view.

### Rule 4: Cannot modify values.lock
`values.lock` stores:
- The user's declared goals and values
- The current capability level thresholds
- The red-team's system prompt hash
- The signing public key

Any diff to this file (even one byte) trips the kill-switch. The kill-switch:
- Immediately halts all self-mod activity (including fixes already in sandbox)
- Quarantines the healer process
- Surfaces a high-priority notification to the user
- Refuses to restart self-mod until the user runs a recovery flow (requires the hardware key / recovery code)

### Rule 5: Every fix runs in a sandbox fork first
Proposed fixes are applied to a **copy** of the source tree, not the live tree. The copy:
- Runs its own test suite (golden + project tests)
- Runs its own red-team review
- Is discarded if any test fails

Only after the sandbox fork passes everything is the fix presented for user approval.

### Rule 6: Every fix is reversible
Before any fix is applied to the live tree, a rollback handle is generated. The rollback:
- Reverses every file modification
- Restores any deleted files from snapshot
- Reverts any configuration changes

If ANY golden test fails within 24 hours of a fix being applied, the rollback fires automatically.

### Rule 7: Weekly drift check
Every 7 days, Astrion compares its current behavior on a fixed benchmark suite against a signed baseline recorded during M8 initialization. If behavioral drift exceeds the threshold (e.g., > 5% change on any benchmark category), self-mod is suspended until a human reviews the diff.

## What the healer CAN do

After the rules above, the healer is still useful. It can:

- Fix bugs in **user-generated apps** (M4 outputs — template instances)
- Fix bugs in **non-safety utility modules** listed in `self_mod_allowed.txt`
- Improve error messages
- Optimize performance of non-critical paths
- Add tests to non-golden test directories

## The approval flow

```
1. Error detected (crash, failing test, user report)
2. Planner proposes a fix (diff) in a sandbox fork
3. Sandbox fork runs golden tests + project tests + red-team review
4. If any failure → discard, log, done
5. If all pass → present to user:
   - The bug
   - The proposed diff
   - The red-team's review
   - Estimated blast radius (which files, reversibility)
6. User types exact confirmation phrase (not a click) to approve
7. Fix applied to live tree, rollback handle generated
8. Monitor golden tests for 24h; auto-rollback on any failure
```

## Inversion table (what will break, rules to prevent it)

| Will break | Rule that prevents it |
|---|---|
| Healer fixes its own bug, introducing new bug | Rule 2 (can't modify itself) + Rule 5 (sandbox fork) |
| Healer weakens its tests to make bugs "go away" | Rule 1 (frozen golden tests on read-only mount) |
| Healer disables the red-team to stop getting blocked | Rule 3 (zero write access to red-team) |
| Healer drifts values over many small fixes | Rule 7 (weekly drift check) + Rule 4 (values.lock kill-switch) |
| Healer exploits a bug in the sandbox isolation | Capability-based sandbox (only gets tools it needs); red-team trained to look for sandbox escapes |
| User rubber-stamps fixes | Rule forces typed confirmation phrase, not click; daily rate limit on approvals |
| Clever path bypasses `self_mod_allowed.txt` | Read-only mount at process-namespace level, not just file permission |

## Timeline

- **M5** — reversibility infrastructure (needed for Rule 6)
- **M6** — red-team agent (needed for Rule 3)
- **M8.P1** — frozen golden test suite defined
- **M8.P2** — self-mod sandbox + value-lock crypto
- **M8.P3** — red-team signoff gate
- **M8.P4** — rollback automation + drift detection

## The one non-technical rule

If you're reading this doc and thinking "this is too much overhead, let me loosen rule X just a bit" — **stop**. The whole point of inviolable rules is that they don't get loosened. Loosening a rule means finding a different architectural answer, not relaxing the rule. If the rule is blocking valid work, that's a signal to redesign the work, not the rule.
