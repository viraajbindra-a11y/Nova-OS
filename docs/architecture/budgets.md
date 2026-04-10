# Resource Budgets — Design Doc

**Audit hole addressed:** #7 — "No resource/attention economy"

**Status:** Design doc. Implementation targets M1.P3 (budget tracker) through M3 (dual-process runtime).

---

## The problem

An AGI-era OS has to budget things the old plan ignored:

- **Compute** (tokens, GPU-hours, $)
- **Energy** (watts, carbon)
- **Human attention** (how often the OS interrupts the user — arguably the scarcest resource)
- **Risk** (how much irreversibility is "spent" per hour)

Without budgets, every intent can spiral into unbounded cost. The AI has no incentive to prefer cheap solutions and the user has no way to say "stop, this is getting expensive."

**Inversion:** Every intent declares a budget up front. Every capability tracks its actual cost. The kernel halts and asks for approval when any budget is about to be exceeded.

---

## The four budgets

### 1. Compute budget

```ts
interface ComputeBudget {
  tokens: {
    s1Max: number;    // local model tokens — cheap but still limited
    s2Max: number;    // cloud model tokens — expensive
  };
  wallTimeMs: number;
  usdCents: number;   // hard cap on spend
}
```

**Defaults per intent:**
- S1 tokens: 10,000 (cheap, local, liberal)
- S2 tokens: 2,000 (expensive, conservative)
- Wall time: 30 seconds for interactive intents, 5 minutes for background
- USD: $0.05 per intent, $1.00 per day

User can override per intent. Hard daily caps are user-set in Settings.

### 2. Energy budget

For mobile/laptop use, track:
- Estimated joules per S1 call (local model)
- S2 API calls charge network + remote compute (estimated, not measured)
- Background intents pause when battery < 20%

Not critical for M1 — energy budget starts tracking in M3 when S1 is live.

### 3. Attention budget

The scarcest resource. How often the OS interrupts the user per hour.

```ts
interface AttentionBudget {
  maxPromptsPerHour: number;      // default: 6
  maxNotificationsPerHour: number; // default: 12
  maxSocraticPerHour: number;     // default: 4
}
```

**When the budget is exceeded:** the kernel silently queues the prompt and shows it when the user voluntarily opens a "pending questions" panel. NOT when the user is mid-task.

**Why this matters:** the easy trap with Socratic prompts is to ask about everything, which trains the user to rubber-stamp. Attention budget prevents that by rate-limiting interruptions.

### 4. Irreversibility budget

Every L2+ capability costs "irreversibility tokens" based on its blast radius:

| Action | Tokens |
|---|---|
| Delete file to trash | 1 |
| Overwrite file | 2 |
| Delete permanently | 10 |
| `git push` | 5 |
| Send message (email, IM) | 8 |
| Install package | 3 |
| Modify system config | 5 |
| Self-modification (L3) | 25 |

**Daily cap:** 50 tokens default, user-adjustable. When exceeded, the kernel surfaces a Socratic prompt: "You've spent 50 irreversibility tokens today. Continue?"

## Budget enforcement in the kernel

```
Intent received
  ↓
Planner decomposes intent into capability calls
  ↓
Kernel sums estimated budgets across all steps
  ↓
Compare to remaining daily budget
  ↓
If within budget → execute
If over budget → Socratic prompt → user decides
If hard cap exceeded → halt, require unlock
```

## User dashboard

Settings app gets a new "Budgets" page:

- Today's usage vs. caps for each budget
- 7-day trend graph
- Per-capability breakdown (which tools spent the most)
- Ability to reset or adjust caps

## Inversion table

| Will break | Inverted fix |
|---|---|
| Estimates are always wrong → budget is meaningless | Track actual vs. estimate; auto-adjust multiplier per capability over time |
| User disables budgets "just this once" and forgets | Disable-for-today expires at midnight, not forever |
| Background intents silently burn tokens | Background intents have separate lower caps; UI shows pending background usage |
| Budgets create friction on fast-path actions | L0/L1 actions have free budgets; only L2+ counts |
| Attention budget hides important prompts | "Pending questions" panel shows count in menubar; critical prompts bypass rate limit |

## Timeline

- **M1.P3** — budget tracker infrastructure; irreversibility tokens live
- **M3** — compute budget (S1/S2 split tracking)
- **M5** — reversibility budget (auto-spend tokens per branch)
- **M6** — attention budget (rate-limit Socratic prompts)
