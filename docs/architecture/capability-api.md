# Capability API — Design Doc

**Audit hole addressed:** #2 — "The OS Action API is a lie of abstraction" (`terminal.run` alone is infinite capability hidden behind one verb)

**Status:** Design doc. Implementation targets M1.P2 (Capability Provider Interface).

---

## The problem

The old plan listed 8 tools for the AI: `file.create`, `file.read`, `terminal.run`, `browser.navigate`, etc. `terminal.run(command)` is a lie — it's literally "do anything" hidden in a single verb. When the planner reasons about safety, cost, or reversibility, it has no idea whether `terminal.run("ls")` and `terminal.run("rm -rf /")` are different, because they're the same tool.

**Inversion:** Instead of a small list of god-powered verbs, define a **typed capability interface** where every action declares its blast radius, cost, and reversibility up front. The planner reasons about categories, not command strings.

---

## The shape

Every capability is defined by a `Capability` object with these fields:

```ts
interface Capability {
  id: string;                    // e.g., "file.create"
  providerId: string;            // e.g., "files" (the provider that owns it)
  summary: string;               // human-readable, shown to user in Socratic prompts

  // Safety classification
  level: 0 | 1 | 2 | 3;          // L0=observe, L1=sandbox, L2=real, L3=self-mod
  reversibility: 'free' | 'bounded' | 'permanent';
  blastRadius: 'none' | 'file' | 'directory' | 'account' | 'external';
  externalEffects: string[];     // e.g., ["network", "filesystem", "device"]

  // Cost / budget
  estimateCost(args: unknown): {
    timeMs: number;
    tokens?: number;
    usdCents?: number;
    irreversibilityTokens: number;
  };

  // Execution
  validate(args: unknown): { ok: boolean; errors: string[] };
  execute(args: unknown, ctx: ExecutionContext): Promise<CapabilityResult>;
}

interface CapabilityResult {
  ok: boolean;
  output: unknown;
  provenance: {                  // receipt — audit hole #8
    capabilityId: string;
    args: unknown;
    timestamp: number;
    durationMs: number;
    reversalHandle?: string;     // for M5 reversibility
  };
  error?: string;
}
```

## Why this works

1. **Planner can reason about categories, not commands.** Before running a capability, the planner knows: what level it's at, how reversible it is, how much it costs. That maps directly to M5 (reversibility budget) and M6 (Socratic prompts for L2+).
2. **No more god verbs.** `terminal.run` is replaced by a small set: `terminal.cd`, `terminal.ls`, `terminal.cat`, `terminal.spawn` (with a validated process descriptor). Things that truly need arbitrary shell execution require an L2 unlock from the user every time.
3. **Every result carries a receipt.** The `provenance` field is the foundation for M4 (verifiable computation).
4. **Cost and irreversibility are first-class.** No more blind spending. Ties into the resource economy in the revenue section of `PLAN.md`.

## Example capabilities (first batch — M1.P2)

| id | level | reversibility | blast |
|---|---|---|---|
| `file.read` | L0 | free | none |
| `file.create` | L1 | free (stays in sandbox) | file |
| `file.edit` | L2 | bounded (diff stored) | file |
| `file.delete` | L2 | bounded (trash) | file |
| `file.delete_permanent` | L2 | **permanent** | file |
| `notes.create` | L1 | free | none |
| `notes.search` | L0 | free | none |
| `app.launch_template` | L1 | free | none |
| `terminal.spawn` | L2 | bounded | account |
| `browser.navigate` | L0 | free | none |
| `browser.download` | L2 | bounded | account + external |

## What the planner sees

Before executing a plan, the planner computes the total budget:

```
Plan: "clean up downloads folder"
  Step 1: file.read (L0, free) — ok
  Step 2: file.edit × 12 (L2, bounded) — 12 irreversibility tokens
  Step 3: file.delete × 3 (L2, bounded) — 3 irreversibility tokens (trash)

Total: L2 required, 15 irreversibility tokens, ~2s runtime.
```

The user sees this summary BEFORE approving. That's the Socratic gate.

## Inversion table (what will break)

| Will break | Inverted fix |
|---|---|
| Providers lie about their capability's level (say L1 when actually L2) | CI test suite that verifies each capability's actual effects match its declared level on a reference system |
| Estimating cost is wrong | Post-execution actual-cost tracking; flag capabilities where estimate drifts > 50% |
| Capability surface area explodes (1000 capabilities) | Providers are separate processes; each provider can have its own taxonomy; kernel only sees the top-level provider interface |
| User approves blindly | Irreversibility tokens have a daily cap; Socratic prompts escalate on high-token plans |

## Timeline

- **M1.P2** — define interface + first 15 capabilities
- **M1.P3** — budget tracker enforces token caps
- **M4** — provenance field feeds receipt panel
- **M5** — reversalHandle feeds undo system
- **M6** — capability level + irreversibility feed Socratic prompts
