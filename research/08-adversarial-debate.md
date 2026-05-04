# Adversarial Debate

Date: 2026-04-24

## Purpose

The first research pass produced a plausible thesis:

> Build a desktop attention HUD for context recovery, aimed first at ADHD or ADHD-adjacent knowledge workers.

This debate intentionally challenged that thesis because abstract productivity ideas often sound correct before they meet user behavior, distribution, pricing, and competition.

Four counter-agents attacked the plan from different angles:

- Market/category skeptic.
- Product habit skeptic.
- GTM/pricing skeptic.
- Creative contrarian.

Then they responded to each other's convergence.

## First-Round Critiques

### Market Skeptic

Verdict:

**The pain is real. The category is not yet real.**

Key points:

- "Context recovery for desktop knowledge work" is useful internal strategy language, but buyers do not yet shop that category.
- Buyers understand notes, focus timers, ADHD planners, time trackers, launchers, AI memory, meeting notes, and developer tools.
- The product sits between categories, which creates both differentiation and ambiguity.
- The biggest competitors are not only Tiimo, Sunsama, or RescueTime. They are also Raycast Notes, Apple Notes, Obsidian daily notes, Focana, Screenpipe, Microsoft Recall, and "I just DM myself in Slack."
- The strongest distinction is not "journaling." It is **manual intent capture plus recovery**.

Important competitive pressure:

- [Raycast Notes](https://www.raycast.com/core-features/notes) now directly claims fast, hotkey-accessible floating notes that let users capture thoughts without switching context.
- [Focana](https://www.focana.app/) is emotionally close: an ADHD-friendly floating attention anchor, parking lot, check-ins, session history, and $29 lifetime launch price.
- [Microsoft Recall](https://support.microsoft.com/en-us/windows/privacy-and-control-over-your-recall-experience-d404f672-7647-41e5-886c-a3c59680af15) and [Screenpipe](https://screenpi.pe/about) pressure the passive memory side.
- [Limitless](https://help.limitless.ai/en/articles/9129649-limitless-pricing-plans) pulls memory expectations toward passive capture, transcription, and AI summaries.

Main challenge:

> People who most need breadcrumbs are least likely to create them reliably unless capture is automatic, tied to an existing workflow, or delivers value in under 10 seconds.

Alternative thesis:

**A developer re-entry layer that saves and restores software work context after interruptions.**

### Product Skeptic

Verdict:

**The idea is emotionally sharp, but "hotkey interstitial journaling plus breadcrumb overlay" is a workflow, not yet a defensible product.**

Key points:

- The assumption that users will create entries throughout the workday is the highest-risk assumption.
- `Checkpoint` is weaker than `Next`, because `Next` has a future payoff.
- A persistent HUD may add cognitive load. It might become another thing to monitor.
- The product should be mostly absent until the user needs it or a rupture point happens.
- Hotkeys, notes, tags, AI next-step suggestions, and timelines are easy to clone.
- The magic is not the note. The magic is being returned to the right next step at the right time.

Recommended removal:

- Generic stats.
- Tags as a core primitive.
- `Checkpoint` as equal to `Next`.
- Persistent breadcrumb rail as the default.
- Screenshots/images as a core workflow.
- Broad AI features before the manual loop works.
- Web review as a daily destination.

Alternative object:

**Return Note**, not journal entry.

A Return Note contains:

- Current thread.
- Next visible action.
- Why the action matters.
- Optional context: app, file, branch, ticket, meeting.
- Parked interruptions.

### GTM Skeptic

Verdict:

**This can probably be sold, but the current business plan is too optimistic.**

Key points:

- "Desktop attention HUD" is less sellable than "recover your working context after interruptions."
- The ADHD angle is useful but dangerous as a growth crutch because claims and targeting can drift into health territory.
- Paid acquisition around ADHD may be difficult. Google restricts personalized ads around sensitive health categories, including mental health conditions. Source: [Google personalized advertising policy](https://support.google.com/adspolicy/answer/143465?hl=en).
- $12/month is plausible but unproven; users will compare against broader tools such as Raycast, Tiimo, Llama Life, Amazing Marvin, and Sunsama.
- Desktop utilities have support-heavy surfaces: hotkeys, overlays, permissions, window focus, sync, backups, and shortcuts.
- Annual purchase intent is useful, but usage retention matters more.

Subscription caution:

- RevenueCat's 2025 report shows that subscription app outcomes are highly uneven, annual plans retain better than monthly/weekly plans, and churn can hit early. Source: [RevenueCat State of Subscription Apps 2025](https://www.revenuecat.com/state-of-subscription-apps-2025/).

Alternative plan:

- Run a narrow paid beta.
- Charge real money.
- Avoid Pro tiers, AI memory, team plans, broad planner features, and ADHD improvement claims.
- Prove repeated `Lost` / re-entry value before building more.

### Creative Contrarian

Verdict:

**The more original metaphor is not journaling. It is Work Save Points.**

Core idea:

> Press a hotkey before the thread disappears. Reload exactly where your mind left off.

Potential category names:

- Work Save Points.
- Context Recovery HUD.
- Resume Layer.
- Attention Save States.
- Work Continuity Layer.
- Thread Recovery Tool.

Feature concepts:

- `Quick Save`: records what I am doing and the next visible action.
- `Load Save`: brings up the last usable re-entry card.
- `Before Meeting Save`: prompts before calendar events.
- `Weekend Save`: creates a Monday re-entry card on Friday.
- `Branch Save`: ties developer state to repo, branch, and ticket.
- `Distraction Escrow`: parks tempting ideas so the brain trusts they are not lost.
- `Resume Button`: reopens relevant apps, docs, tabs, or commands later.

Important nuance:

"Work Save Points" is sellable because "save your place" is concrete. But it overpromises if the app only stores notes. A real save point must restore meaningful context.

## Cross-Agent Convergence

The agents agreed on five major points:

1. Generic interstitial journaling is too weak as the product promise.
2. Manual capture is the biggest risk.
3. The stronger object is a Return Note or save point.
4. The first market should be narrower than "ADHD knowledge workers."
5. Build and sell less before adding AI, team features, or broad integrations.

## Cross-Agent Rebuttal

The rebuttal round refined the convergence:

### "Work Save Points" Is A Metaphor, Not The Whole Promise

Agents liked "save point" because it is memorable and demoable, but warned it could feel too cute or game-like.

It also implies restore. If the product cannot restore app/window/repo/file/ticket/next-action context, "save point" may overpromise.

Decision:

- Use **Work Save Points** as product metaphor and campaign language.
- Use **Return Notes** as the core object.
- Use **return-to-work** or **resume work without rebuilding context** as serious positioning.

### Developer Wedge Is Strong, But Not The Final Category

The developer wedge is strong because:

- Developers understand hotkeys, branches, stack traces, tickets, terminal commands, and interrupted state.
- Context is concrete and capturable.
- The pain is expensive.
- The demo is crisp.

But agents warned against becoming trapped as "developer journaling" or an IDE extension.

Decision:

- Start with technical founders and senior developers.
- Frame them as the first high-context workflow, not the whole company.
- Keep the broader emotional promise: interrupted work, not only code.

### Manual Capture Must Become Prompted Capture

All agents pushed against a pure "remember to punch" habit.

The product should combine:

- Automatic context snapshot.
- One required human next action.
- Prompting at natural rupture points.

Good rupture points:

- Before meetings.
- After meetings.
- Idle return.
- Branch switch.
- Ticket switch.
- Long app switch.
- Opening Slack.
- Closing laptop.
- End of day.
- Reopening the app after a break.

Decision:

The product is not "journal all day." It is:

**Leave a return note when context is about to break, then reload it when you come back.**

### Annual-First Beta Is Useful, But Not Proof Alone

Agents supported paid validation but warned annual payments can validate aspiration without validating habit.

Decision:

- Run a paid founding beta.
- Charge enough to filter serious users.
- Measure 4-week retention and rescue events.
- Do not treat payment alone as product-market fit.

### The HUD Is Less Important Than Timing

The first research emphasized a HUD/breadcrumb rail. The debate pushed back.

Decision:

- A persistent rail is optional.
- The essential surface is a correctly timed re-entry card.
- The signature should be **timing plus specificity**, not always-on UI.

## Final Debate Synthesis

The initial thesis was:

> Desktop attention HUD for context recovery.

The debate improved it to:

> A local-first return-to-work tool for interrupted high-context workers. It lets users create Return Notes at rupture points, then reload the exact next step and relevant context when they come back.

Shortest version:

**Return Notes for broken workdays.**

Most demoable metaphor:

**Work Save Points.**

Best first wedge:

**Technical founders and senior developers whose context is destroyed by Slack, meetings, tickets, code review, browser research, and branch switching.**

## What This Means For The Product

Build fewer things:

- One command: `Set Return Note`.
- One rescue action: `Return Me`.
- One required field: "When I come back, the next visible action is..."
- One context bundle: app/window plus repo/branch/file/ticket where available.
- One parked-distraction capture.
- One re-entry card after idle/meeting/app-switch return.

Do not build yet:

- Generic stats.
- Tags as a core workflow.
- Broad AI memory.
- Team features.
- Manager summaries.
- Full task management.
- Heavy dashboards.
- A general journaling archive.

## Core Risk After Debate

The product can still fail if users say:

"This is a good idea."

but do not actually:

- create return notes,
- use return cards,
- resume work faster,
- pay after novelty fades.

The only thing that matters now is proving the rescue loop.
