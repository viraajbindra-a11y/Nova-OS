# Provenance — Design Doc

**Audit hole addressed:** #8 — "No provenance / epistemic hygiene"

**Status:** Design doc. Implementation targets M4 (verifiable computation).

---

## The problem

When the AI tells you a fact, where did it come from? When it writes code, what was it copied from, what was inferred, what was hallucinated? Without answers to these questions, "helps mankind stay on course" is impossible — you can't correct what you can't audit.

**Inversion:** Every fact, artifact, and action the AI produces must carry a **receipt** that is:
- Structured (not prose)
- Surfaced (not hidden in the LLM context)
- Verifiable (the user can spot-check the claim against the source)

---

## The receipt shape

```ts
interface Receipt {
  id: string;              // content-addressed hash
  createdAt: number;       // epoch ms
  createdBy: {
    brain: 's1' | 's2';    // which model answered (ties into M3 brain indicator)
    modelVersion: string;  // e.g., "claude-opus-4-6@2026-04-09"
    seed?: number;         // for reproducibility
  };

  // What this receipt is for
  artifact: {
    kind: 'fact' | 'code' | 'action' | 'answer';
    content: string | object;
    summary: string;       // one line, for UI display
  };

  // Where the answer came from
  sources: Source[];

  // How sure the model is
  confidence: number;      // 0–1
  uncertaintyNotes?: string; // free text, e.g., "source A and B disagree"

  // Reasoning trace (NOT the hidden LLM context — a user-facing explanation)
  reasoning: ReasoningStep[];

  // For code specifically
  codeProof?: {
    spec: string;          // plain English, user-approved in M4
    tests: TestResult[];
    testsPass: boolean;
  };
}

interface Source {
  kind: 'training' | 'tool' | 'user_memory' | 'graph' | 'external_url' | 'inference';
  ref?: string;            // URL, file path, memory key, tool call id
  snippet?: string;        // quoted excerpt if available
  confidence: number;      // how much the source contributed
}

interface ReasoningStep {
  step: number;
  thought: string;         // short, human-readable
  evidence: string[];      // source ids that support this step
}

interface TestResult {
  name: string;
  pass: boolean;
  output?: string;
}
```

## How the user sees it

Every AI response has a small "receipt" pill. Click it → slide-out panel shows:

1. **Summary** — one line of what the AI did/said
2. **Sources** — list of where the info came from, with confidence per source
3. **Reasoning** — numbered steps, each linked to evidence
4. **Tests** (for code) — pass/fail, with output
5. **Actions** — "copy source", "verify", "flag as wrong", "undo" (if applicable via M5)

## Why this works

1. **Hallucinations become visible.** When the AI states a fact with no source, the receipt shows "sources: []" — user knows to distrust it.
2. **Code trust scales.** "Here's the spec, here are the tests, all pass" is cheaper to verify than reading every line of generated code.
3. **Self-improvement has a signal.** When users flag receipts as "wrong", the system can identify patterns (which sources are unreliable, which categories S1 is miscalibrated on).
4. **Credit assignment works.** If the AI uses a user memory that turns out to be stale, the receipt points at the specific memory — easy to update.

## Storage

Receipts are nodes in the M2 hypergraph with type `receipt`. Every generated artifact has an edge to its receipt. Receipts are never deleted (audit trail).

## The hallucination test

At CI time, a batch of known questions is run through the AI. For each response, the receipt is checked:

- Does it have sources? If no, fail.
- Do the sources actually say what the response claims? If no, flag for review.
- Is the confidence calibrated? If response is wrong but confidence > 0.8, log a calibration failure.

This is the foundation for M3's calibration tracker.

## Inversion table (what will break)

| Will break | Inverted fix |
|---|---|
| AI fabricates sources (cites URLs that don't exist) | Verify source URLs at receipt creation time; fail if 404 |
| Reasoning step is just hand-waving | Require each step to reference at least one source or explicit inference marker |
| Receipt panel is ignored, decorative | Make receipts clickable from anywhere the artifact appears; surface low-confidence receipts proactively |
| Receipt storage explodes | Receipts are content-addressed; identical source sets dedupe |
| User flags "wrong" as a joke, polluting the calibration signal | Require a reason with every flag; weight flags by user's historical precision |

## Timeline

- **M1** — capabilities return receipts as part of `CapabilityResult.provenance`
- **M3** — brain indicator reads from receipts (shows S1/S2 tag)
- **M4** — full receipt panel ships; code receipts have spec + tests
- **M5** — receipts gain reversalHandles for undo
- **M6** — low-confidence receipts trigger Socratic prompts
- **M7** — receipts are shareable as part of skill marketplace (proof of what a skill actually did on a test run)
