# Contributors Log

This file tracks everyone who has contributed to Astrion OS. If Astrion ever makes money (via the revenue paths in `PLAN.md`), early contributors get first dibs on revenue share / equity / whatever comes. This log is the proof of who was early and what they did.

**Viraaj's promise:** I'm 12 and I can't sign contracts. But if Astrion hits, I will look at this file and be generous proportional to what people contributed.

## The format

Every entry looks like this:

```
### <Name> — <Jobs they picked>
First contribution: <date>
Role tier: <friend | contributor | core>

#### Contributions
- [YYYY-MM-DD] <What they did> — shipped in <commit or release>
- [YYYY-MM-DD] <What they did> — shipped in <commit or release>

#### What they've received
- Credit in release notes <version>
- Their name in <app/wallpaper/about dialog>
- ...
```

## Role tiers (my internal ranking)

- **friend** — did 1-2 starter tasks, helped once or twice. Gets credit in release notes.
- **contributor** — did 5+ meaningful contributions, stayed involved over weeks. Gets credit + named mention in the About Astrion dialog.
- **core** — contributed regularly for months, shaped real features, reliable. If Astrion makes money, core contributors get meaningful revenue share.

Nobody starts as core. Everyone starts as friend. Advancement happens by doing the work consistently.

---

## The team (as of 2026-04-11)

### Koa — Bug Hunter + Tester
First contribution: TBD (starter tasks sent)
Role tier: friend

#### Contributions
- Picked 2 jobs on 2026-04-11 right after the presentation
- (First bug / first tester report pending)

#### What he's received
- (Nothing shipped yet)

---

### Naren — Hype Person + Designer
First contribution: TBD (starter tasks sent)
Role tier: friend

#### Contributions
- Picked 2 jobs on 2026-04-11
- **Asked the "how does pay work" question before the presentation, which prompted Viraaj to add the "The Deal" slide to the deck.** Meaningful contribution to transparency. Credit in lessons for that one.

#### What he's received
- (Nothing shipped yet)

---

### Lauren — Writer + UX Reviewer
First contribution: TBD (starter tasks sent)
Role tier: friend

#### Contributions
- Picked 2 jobs on 2026-04-11

#### What he's received
- (Nothing shipped yet)

---

### Jian — Ideas Person + Namer
First contribution: TBD (starter tasks sent)
Role tier: friend

#### Contributions
- Picked 2 jobs on 2026-04-11 (first day on the team)

#### What he's received
- (Nothing shipped yet)

---

## AI pair-programmer

### Claude (Anthropic)
Role tier: tool, not a human contributor

Claude wrote most of the code alongside Viraaj. It's an AI and doesn't get equity or revenue share — but every commit that Claude co-authored has `Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>` in the commit message as proper attribution.

---

## How to update this file

Whenever a friend contributes something (a bug report, a wallpaper, a suggestion, a post, anything):

1. Add an entry to their `#### Contributions` section with the date and what they did
2. If you shipped their work, add a `shipped in <commit>` reference
3. Add what they received (credit in notes, name in About, etc.) to their `#### What they've received` section
4. If they level up to `contributor` or `core` tier, update their `Role tier`

Review this file every release. Never delete entries — it's the historical record.
