# Requests, Features, Specs, and Plans from `research`

This file consolidates the feature requests, product specs, strategic recommendations, and launch plans scattered across `/research` and `/research/agent-debate-02`.

Source shorthand in the tables is resolved in the `Source Key` at the bottom of this file.

`Status` guide:

| Status | Meaning |
|---|---|
| Canonical | First-pass recommendation from the main research set |
| Revised | Post-debate preferred direction |
| Alternative | Credible variant proposed in the second debate round |
| Later | Intentionally postponed until the core rescue loop works |
| Deferred | Explicitly not for the early build |

## Research Structure

| Collection | Files | Notes |
|---|---|---|
| Core definition and market strategy | [00] [01] [02] [03] [04] [05] [06] | Main product thesis, market wedge, roadmap, pricing, and operating constraints |
| Supporting index | [README] [07] | Folder guide and source log |
| First debate and revision | [08] [09] | Challenges the first thesis, then sharpens the preferred strategy |
| Second debate round | [Central] [OBeliefs] [RBeliefs] [FBeliefs] [ODebate] [RDebate] [FDebate] | Originalist, Revisionist, and Freeware variants plus consensus points |

## Product Direction and Positioning

| Collection | Request / recommendation | Status | Sources |
|---|---|---|---|
| Category language | Sell the product as a private `return-to-work`, `work session recovery`, or `work continuity` tool; keep `desktop attention HUD` mainly as internal shape language. | Revised | [01] [03] [08] [09] [OBeliefs] [RBeliefs] |
| Core promise | Lead with `never lose the thread` and `resume work without rebuilding context`. | Canonical -> Revised | [00] [03] [08] [09] [Central] |
| Core object | Upgrade the generic entry/punch into a `Return Note`; use `Work Save Points` as a memorable metaphor, not the only serious positioning language. | Revised | [05] [08] [09] [RBeliefs] [OBeliefs] |
| Core unit | Treat a `thread` as the atomic unit instead of a task. | Canonical | [00] [05] |
| Beachhead user | Start with technical founders and senior developers, or more broadly keyboard-first interrupted knowledge workers with acute context-loss pain. | Revised | [03] [04] [08] [09] [RBeliefs] [Central] |
| Expansion user | Expand later to consultants, writers/researchers, PMs/designers, broader ADHD-adjacent desktop workers, and only then team packs. | Canonical -> Revised | [03] [04] [09] [OBeliefs] |
| Product boundaries | Do not position it as medical treatment, therapy, a planner, a full task manager, surveillance software, or a passive record-everything tool. | Canonical | [00] [01] [06] |

## Core MVP and P0 Features

| Feature / spec | Recommendation | Status | Sources |
|---|---|---|---|
| Command grammar | Early grammar was `Checkpoint`, `Next`, `Park`, `Lost`, and `Done`; the revised MVP narrows this to `Set Return Note` / `Quick Save`, `Return Me`, and a parking action. | Revised | [05] [08] [09] [ODebate] [RDebate] |
| Required capture field | Every save should include the `next visible action`; optional fields can include why it matters and what was parked. | Revised | [05] [08] [09] [RBeliefs] |
| Quick capture surface | Make the quick-punch HUD the main surface: instant open, one-line input, mode selection, save, disappear, and no dependency on the web app. | Canonical | [05] [00] |
| Re-entry command | Provide a one-step recovery action (`Lost` / `Return Me`) that shows the exact path back into the thread. | Canonical -> Revised | [00] [05] [08] [09] |
| Re-entry card | Show current thread, last useful note, next step, parked items, and optional context after interruption, idle return, or meeting return. | Canonical -> Revised | [00] [05] [08] [09] |
| Parking lot | Let users capture distracting ideas without following them; parking is part of the core loop, not an add-on. | Canonical -> Revised | [00] [04] [05] [08] [09] |
| Context bundle | Capture app/window title and, where easy, repo, branch, file, ticket/PR URL, browser domain, terminal directory, or meeting context. | Revised | [04] [08] [09] [RBeliefs] |
| Rupture prompts | Prompt at natural breakpoints such as before meetings, after meetings, idle return, app switch, branch switch, ticket switch, shutdown, or end of day. | Revised | [08] [09] [RBeliefs] [ODebate] |
| Visible path surface | Keep a lightweight breadcrumb rail or continuity surface, but make a persistent HUD optional rather than mandatory. | Revised | [00] [05] [08] [09] [OBeliefs] [RBeliefs] |
| Local-first store | Keep the desktop product reliable offline with local-first storage so entries do not disappear even if sync remains optional or later. | Canonical | [05] [06] [09] |
| Review surface | Keep a local timeline / searchable thread history as backup and trust-building support, not as the main daily destination. | Revised | [05] [08] [09] |
| Export | Ship Markdown/JSON export from the beginning to reinforce trust and data ownership. | Canonical -> Revised | [06] [09] [FBeliefs] [ODebate] |

## Near-Term Feature Extensions

| Feature / spec | Recommendation | Status | Sources |
|---|---|---|---|
| Passive context metadata | Add opt-in metadata such as active app, window title, browser domain, file path, repo, branch, meeting, or focus mode state. | Canonical | [02] [05] [06] |
| Thread inference | Infer likely current thread from recent entries and context, then ask whether to continue or park. | Canonical | [05] |
| Tiny AI assist | Use AI only to reduce friction: suggest a return note, prefill the likely task, or turn vague text into a next visible action. | Revised | [05] [09] [RBeliefs] |
| Meeting interruption receipt | Add `before meeting save` and `after meeting return` flows so users can resume their pre-meeting thread quickly. | Canonical -> Revised | [04] [05] [08] [09] |
| Browser drift rescue | Detect unrelated browsing drift and ask whether the new tab/domain belongs to the current thread or should be parked. | Canonical | [05] |
| Loop detector | Detect repeated circles around the same topic and prompt the user to split, park, or choose one next step. | Canonical | [05] |
| Developer context enrichments | Add branch/ticket save points, GitHub/Linear/Jira URL detection, repo/branch/file capture, and copy-next-command helpers after the rescue loop is proven. | Revised | [04] [05] [09] |
| Semantic retrieval | Add semantic search and thread summaries as higher-value extensions once the core note/re-entry behavior is working. | Canonical -> Later | [04] [06] |

## Later-Stage and Advanced Features

| Feature / spec | Recommendation | Status | Sources |
|---|---|---|---|
| Recovery mode | Restore more of the working environment for a thread: reopen tabs, repo/file, notes, and the next step after a longer break. | Later | [05] [08] [09] |
| `Resume Button` / restore actions | Grow the re-entry card into a real restore tool that can reopen relevant apps, docs, tabs, or commands. | Later | [08] [09] |
| On-device AI | Move thread inference, summaries, next-step refinement, and semantic search toward local/on-device AI where possible. | Later | [05] [09] [FBeliefs] |
| Cross-device continuity | Add encrypted sync, backup/restore, and eventually a mobile companion for parking or reviewing the current thread. | Later | [05] [06] [09] |
| Team-safe handoff notes | Add employee-controlled exports, client work logs, pairing handoffs, and shared templates without default manager visibility. | Later | [05] [06] [09] |
| Team controls | Add team licensing, admin controls, SSO, and security docs only after individual retention and privacy boundaries are solid. | Later | [06] [09] |
| Plugin ecosystem | Expose a plugin API or marketplace for context packs such as VS Code, JetBrains, GitHub, Linear, Jira, browsers, terminals, and calendar apps. | Alternative -> Later | [FBeliefs] |
| Workflow packs | Offer reusable workflow packs such as developer interruption recovery, founder meeting return, research session save points, and consultant client switching. | Alternative -> Later | [FBeliefs] |

## Explicitly Deferred or Avoid-Early Items

| Deferred item | Recommendation | Status | Sources |
|---|---|---|---|
| Generic stats as a core workflow | Do not center the early product on generic productivity stats, shame loops, or dashboards that optimize entry volume over rescue quality. | Deferred | [05] [08] [09] |
| Tags as a core primitive | Do not make tags or a heavy tag system part of the main early behavior loop. | Deferred | [08] [09] |
| Screenshots / images as a default workflow | Do not make screenshots, images, or passive capture a core workflow; keep screenshots explicit only. | Deferred | [05] [08] [06] |
| AI chat / broad AI memory | Do not build chat, passive AI memory, or a generic assistant before the manual rescue loop works. | Deferred | [05] [08] [09] |
| Planner / calendar / task manager sprawl | Do not expand into a full planner, calendar, habits, routines, mood tracker, or generic task manager. | Deferred | [00] [04] [06] [09] |
| Team plans and manager summaries | Do not start with team features, manager dashboards, or surveillance-adjacent summaries. | Deferred | [05] [06] [08] [09] |
| Heavy dashboard usage | Do not make the web app, archive, or timeline the place users must visit all day. | Deferred | [05] [08] [09] |
| Deep IDE integrations before proof | Delay deep IDE/plugin work until the manual rescue behavior is already validated. | Deferred | [09] |
| Broad B2C ADHD front door | Avoid opening with broad ADHD consumer positioning that invites planner/coaching/health expectations before the rescue loop is proven. | Deferred | [03] [06] [09] [RBeliefs] |
| B2B-first launch | Do not start with team procurement, admin, SSO, or accommodation-heavy enterprise requirements. | Deferred | [03] [04] [06] |

## Packaging and Monetization Options

| Plan / packaging item | Recommendation | Status | Sources |
|---|---|---|---|
| Trial | Offer a 14-day trial with no credit card if possible, and aim onboarding at the first `Next` / return-note rescue moment. | Canonical | [06] |
| Solo plan | Price a solo plan around `$12/month` or `$96/year` with the hotkeys, HUD/re-entry loop, timeline, local-first storage, export, and basic threads/tags. | Canonical | [06] |
| Pro plan | Price a pro plan around `$18-$20/month` or `$144-$180/year` with AI next-step refinement, semantic search, sync, calendar/context metadata, summaries, and developer integrations. | Canonical | [06] |
| Team plan | Add a later team tier around `$12-$18/user/month` only after privacy, admin, and employee-owned data boundaries are ready. | Later | [06] |
| Paid founding beta | Test a paid beta around `$99/year`, `$149/year`, or `$49-$99` for a fixed beta term to validate seriousness and retention. | Revised | [09] [08] [RBeliefs] [RDebate] |
| Free local core + paid sync | Keep the local save/load loop free forever and charge for encrypted sync, backup, and restore. | Alternative | [FBeliefs] [FDebate] |
| Lifetime Pro | Offer a one-time license for richer context capture, custom prompts, developer bundles, advanced export, local AI integrations, or accessibility profiles. | Alternative | [FBeliefs] |
| Supporter / patron license | Offer optional supporter funding, early builds, roadmap voting, or patronage without coercing the core loop behind a subscription. | Alternative | [FBeliefs] [FDebate] |
| Open-core | Consider open local core plus paid/commercial modules for sync, enterprise policy, hosted distribution, or advanced integrations. | Alternative | [FBeliefs] |
| Paid onboarding / setup | Monetize install/setup help, workflow design, privacy review, team policy setup, or custom integrations for high-touch customers later. | Alternative -> Later | [FBeliefs] |

## Launch Plan and Roadmap

| Plan item | Recommendation | Status | Sources |
|---|---|---|---|
| Early cohort | Run an early beta with technical founders and senior developers first; the main research suggests `50-200` founder-led beta users, while the revised validation plan tightens to `30-50` highly qualified targets. | Canonical -> Revised | [06] [09] |
| Beta onboarding | Onboard around one concrete scenario: pick an active thread, set a return note, interrupt it, return with the card, and resume from the next action. | Revised | [09] |
| Phase 0 | Prototype the rescue loop with local desktop quick save, return note, return card, app/window context, parking lot, and manual export. | Revised | [09] |
| Phase 1 | Run a paid technical beta with lightweight repo/branch detection, meeting/idle prompts, re-entry instrumentation, and retention interviews. | Revised | [09] |
| Phase 2 | Add developer context helpers: browser/IDE companion, GitHub/Linear/Jira URL detection, branch/ticket save points, copy-next-command, and partial restore. | Revised | [09] |
| Phase 3 | Expand to broader high-context work such as meeting re-entry, research sessions, founder/operator workflows, Markdown/Obsidian export, and optional encrypted sync. | Revised | [09] |
| Phase 4 | Add team licenses, employee-controlled summaries, on-device AI suggestions, shared templates, and admin controls only after individual retention is strong. | Revised | [09] |
| Workflow content | Publish concrete workflows such as interstitial journaling for engineers, ADHD founder hotkey journaling, meeting re-entry, and attention stack-trace style use cases. | Canonical | [03] [06] |
| Acquisition channels | Lean on Hacker News, Product Hunt, Indie Hackers, Raycast/Obsidian/VS Code communities, ADHD-aware creator channels, and developer newsletters. | Canonical | [03] [06] |
| Originalist launch variant | Run a local-first public beta or generous alpha with no account, clear export, visible path surface, sparse rupture prompts, and an optional paid founding tier rather than a hard paywall. | Alternative | [ODebate] |
| Freeware launch variant | Ship a free local alpha, publish the storage format, include one beautiful save/load loop, invite optional supporters, and choose the first paid add-on from evidence later. | Alternative | [FBeliefs] [FDebate] |

## Validation, Metrics, and Kill Criteria

| Metric / criterion | Recommendation | Status | Sources |
|---|---|---|---|
| Activation moment | The user writes a next step or return note, gets interrupted, opens the return surface, and resumes without rebuilding context. | Canonical -> Revised | [05] [09] |
| North-star metric | Track `successful re-entries per active workday` rather than raw note volume. | Canonical | [05] |
| Activation events | Measure first thread, first `Next` / return note, first `Lost` / `Return Me`, and first re-entry card view. | Canonical -> Revised | [05] [06] |
| Retention metrics | Track active days per week, threads resumed after idle/interrupt, number of rescue events, parked items reviewed, and time from `Lost` / return card to resumed work. | Canonical | [06] |
| Pass thresholds | Aim for `20-25` paid users out of `30-50`, `40-60%` active after 4 weeks, `3+ days/week` return-note usage, `2+` rescue events per week, and at least `10` strong rescue stories. | Revised | [09] |
| Qualitative proof | Look for users saying `I got back into work faster`, `I trusted myself to come back`, or `I would be upset if this disappeared`. | Canonical -> Revised | [06] [09] |
| Kill / pivot triggers | Treat it as a failure signal if users mostly write reflections, prefer the timeline over the return card, ignore hotkeys, need repeated coaching, demand planner features first, or cluster below `$5/month` willingness to pay. | Revised | [09] [RBeliefs] |
| Freeware counter-test | The free/local camp would reconsider if paid users build the habit faster, retain above `50%` after four weeks, and show stronger indispensability than a much larger free cohort. | Alternative | [FBeliefs] |

## Trust, Privacy, Accessibility, and Safety Requirements

| Requirement | Recommendation | Status | Sources |
|---|---|---|---|
| No account wall to start | Keep the first experience local-first and light; if licensing exists, avoid a heavy account requirement before the user feels the rescue loop. | Revised / Alternative consensus | [09] [ODebate] [RDebate] [FBeliefs] |
| Local-first by default | Make local-first storage and offline reliability part of the product's trust contract. | Canonical -> Consensus | [05] [06] [09] [Central] |
| No keystroke logging | Never log keystrokes. | Canonical -> Consensus | [05] [06] [RBeliefs] |
| No screen recording by default | Do not record screens by default; screenshots should be explicit only. | Canonical -> Consensus | [05] [06] [RBeliefs] |
| Metadata is opt-in | Treat app/window metadata as optional and explicitly enabled. | Canonical -> Consensus | [02] [05] [06] [RBeliefs] |
| Clear deletion and export | Support clear deletion flows and straightforward Markdown/JSON export. | Canonical -> Consensus | [06] [09] [FBeliefs] |
| Encrypted sync only if offered | If sync/cloud ships, it should be encrypted and added only after trust is earned. | Canonical -> Consensus | [06] [FBeliefs] [RBeliefs] |
| No surveillance business model | Never sell user data or expose private logs to managers by default. | Canonical -> Consensus | [06] [05] [Central] |
| Accessibility baseline | Full keyboard access, screen reader labels, visible focus states, high contrast, reduced motion, resizable text, clear error recovery, and simple language are required, not nice-to-haves. | Canonical | [06] |
| Claim guardrails | Safe claims are around transitions, work continuity, and context return; avoid treatment, symptom-reduction, therapy, or medical-grade claims. | Canonical | [06] |

## Source Key

[README]: /Users/beherit/Sites/htdocs/ij/research/README.md
[00]: /Users/beherit/Sites/htdocs/ij/research/00-product-definition.md
[01]: /Users/beherit/Sites/htdocs/ij/research/01-market-landscape.md
[02]: /Users/beherit/Sites/htdocs/ij/research/02-competitor-map.md
[03]: /Users/beherit/Sites/htdocs/ij/research/03-target-users-positioning.md
[04]: /Users/beherit/Sites/htdocs/ij/research/04-pivot-options.md
[05]: /Users/beherit/Sites/htdocs/ij/research/05-product-roadmap-feature-strategy.md
[06]: /Users/beherit/Sites/htdocs/ij/research/06-gtm-pricing-risk.md
[07]: /Users/beherit/Sites/htdocs/ij/research/07-source-log.md
[08]: /Users/beherit/Sites/htdocs/ij/research/08-adversarial-debate.md
[09]: /Users/beherit/Sites/htdocs/ij/research/09-revised-strategy-after-debate.md
[Central]: /Users/beherit/Sites/htdocs/ij/research/agent-debate-02/central-voting-system.md
[OBeliefs]: /Users/beherit/Sites/htdocs/ij/research/agent-debate-02/originalist/beliefs.md
[RBeliefs]: /Users/beherit/Sites/htdocs/ij/research/agent-debate-02/revisionist/beliefs.md
[FBeliefs]: /Users/beherit/Sites/htdocs/ij/research/agent-debate-02/freeware-heretic/beliefs.md
[ODebate]: /Users/beherit/Sites/htdocs/ij/research/agent-debate-02/originalist/debate.md
[RDebate]: /Users/beherit/Sites/htdocs/ij/research/agent-debate-02/revisionist/debate.md
[FDebate]: /Users/beherit/Sites/htdocs/ij/research/agent-debate-02/freeware-heretic/debate.md
