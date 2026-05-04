# Revised Strategy After Debate

Date: 2026-04-24

## New Recommendation

The product should evolve from:

**A desktop attention HUD for interstitial journaling**

to:

**A local-first return-to-work tool for interrupted high-context workers.**

The core object is no longer a generic journal entry. It is a **Return Note**.

The core metaphor is:

**Work Save Points.**

The core promise is:

**Save your place before work breaks. Reload the next step when you come back.**

## Why This Is Better

### It Is More Concrete

"Interstitial journaling" explains the method, but not the buyer's pain.

"Desktop attention HUD" describes the interface, but not the job.

"Work Save Points" and "Return Notes" tell the user what they get:

- I saved my place.
- I can let go.
- I can come back.
- I know what to do next.

### It Is Less Saturated

The broad productivity market is saturated with planners, timers, journals, blockers, AI notes, and trackers.

This strategy does not claim "organize your day." It claims:

**Recover interrupted work state.**

That is a narrower job with a more visible before/after.

### It Avoids The Weakest Habit Assumption

The first thesis assumed users would make frequent punches because the hotkey is fast.

The debate says that is not enough. The product must prompt at **rupture points**, not rely only on discipline.

Capture becomes:

- manual when the user wants it,
- prompted when context is about to break,
- enriched automatically with local context.

## Target Market

### First Beachhead

Technical founders and senior developers.

Why:

- They feel context loss intensely.
- They work across code, browser, tickets, Slack, docs, terminals, and meetings.
- They understand hotkeys and "save state" metaphors.
- Their context is concrete enough to capture: repo, branch, file, issue, PR, command, test, local server.
- They can pay for a sharp utility if it proves itself.

### Secondary Expansion

After the rescue loop is proven:

- Consultants and fractional operators.
- Writers and researchers.
- Product managers and designers.
- ADHD/ADHD-adjacent knowledge workers more broadly.
- Team packs for engineering/product teams.

Do not start with broad B2C ADHD. The ADHD-aware story remains important, but the front-door sale should be interrupted high-context work.

## Positioning

### Main Positioning

**Return Notes for interrupted technical work.**

### Plain-Language Headline Options

- "Resume work without rebuilding context."
- "Save your place before Slack, meetings, and tabs blow up your flow."
- "Leave yourself a return path."
- "Know exactly what to do when you come back."
- "Never lose the thread after an interruption."

### Product Metaphor

**Work Save Points**

Use this in demos and memorable copy:

- Quick Save.
- Load Save.
- Save before meeting.
- Save before weekend.
- Restore the thread.

### Serious Category Language

- Return-to-work tool.
- Work session recovery.
- Context recovery for interrupted work.
- Private work continuity layer.

Avoid making "desktop attention HUD" the main landing-page phrase. Users may not know they need a HUD.

## Product Scope

### MVP

Build the smallest paid beta that proves the rescue loop:

1. `Set Return Note`
  One hotkey. One line. Required next visible action.
2. `Return Me`
  One hotkey. Shows the re-entry card.
3. Rupture prompts
  Prompt around meetings, idle return, app switching, branch/ticket changes, shutdown, or end of day.
4. Context bundle
  Capture app/window title and, where easy, repo, branch, file, ticket/PR URL, terminal directory, or current browser domain.
5. Parking lot
  Capture distracting ideas without switching threads.
6. Local-first timeline
  Backup and review surface, not the main product.
7. Export
  Markdown/JSON export to reinforce user trust.

### Do Not Build Yet

- Full AI memory.
- AI chat.
- Team plans.
- Manager summaries.
- Generic productivity stats.
- Habit dashboards.
- Full task manager.
- Heavy tag system.
- Cross-device sync unless needed for beta.
- Deep IDE integrations before proving the behavior manually.

### One Tiny AI Exception

Do not build broad AI features, but consider lightweight friction reduction if it helps the core loop:

- Prefill "Working on auth redirect?" from window/repo/ticket context.
- Suggest a return note from recent activity.
- Convert vague text into a single next visible action.

This is not an AI product. It is a lower-friction return-note product.

## Paid Beta Plan

### Offer

Founding beta for technical founders and senior developers.

Possible pricing tests:

- $99/year founding plan.
- $149/year founding plan.
- $49-$99 for 3-6 month beta access with feedback agreement.
- Monthly fallback later, not the main validation path.

The goal is not to maximize early revenue. The goal is to filter for users who feel the pain enough to pay and give feedback.

### Beta Promise

> A private local-first desktop tool that helps you save and reload your work context after interruptions.

### Beta Onboarding

Do not onboard around "journaling."

Onboard around one concrete scenario:

1. Pick one active thread.
2. Set a return note.
3. Trigger a break or app switch.
4. Return with the card.
5. Resume from the next action.

The user should feel the rescue moment in the first session.

## Validation Criteria

Run a 30-day beta with 30-50 target users.

Pass thresholds:

- 20-25 users pay, not just join a waitlist.
- 40-60% are still active after 4 weeks.
- Retained users create or accept return notes on 3+ days/week.
- Retained users use `Return Me` or receive return cards 2+ times/week.
- Median retained user records 2+ useful return/recovery events per active workday.
- At least 10 users can describe a specific moment where the app saved re-entry time.
- At least 5 users say they would renew, expense, or be meaningfully upset if it disappeared.
- Support burden stays under 10 minutes/user/month.
- Users describe the value as "I got back into work faster," not "nice journal."

Kill or pivot if:

- Users mostly write reflections instead of next actions.
- Users use the timeline more than the return card.
- Users like the idea but do not use hotkeys.
- Onboarding requires repeated coaching.
- People ask for planner/calendar/task features before caring about re-entry.
- Willingness to pay clusters under $5/month.

## Competitive Strategy

### Against Raycast Notes

Raycast Notes owns fast hotkey note capture. Do not compete as "fast notes."

Differentiate on:

- Return timing.
- Rupture detection.
- Next-action enforcement.
- Context bundle.
- Re-entry card.
- Parking distractions without losing the current thread.

### Against Focana

Focana owns floating ADHD focus anchoring and simple session focus.

Differentiate on:

- Work session recovery after interruption.
- Developer/technical context.
- Return Notes, not timers.
- Local context restore, not only session history.

### Against Recall/Screenpipe/Limitless

Passive memory products answer:

"What did I see or hear?"

This product answers:

"What did I mean to do next?"

That distinction is the moat.

## Updated Roadmap

### Phase 0: Prototype Rescue Loop

- Local desktop quick save.
- Return note.
- Return card.
- App/window context.
- Parking lot.
- Manual export.

### Phase 1: Paid Technical Beta

- Add lightweight repo/branch detection if easy.
- Add meeting/idle prompts.
- Instrument re-entry events.
- Run interviews and retention checks.

### Phase 2: Developer Context

- VS Code or browser companion only after beta evidence.
- GitHub/Linear/Jira URL detection.
- Branch/ticket save points.
- Copy next command.
- Reopen context where possible.

### Phase 3: Broader High-Context Work

- Meeting re-entry.
- Research session return.
- Founder/operator workflows.
- Markdown/Obsidian export.
- Optional encrypted sync.

### Phase 4: Team And AI

Only after individual retention:

- Team licenses.
- Employee-controlled summaries.
- On-device AI suggestions.
- Shared templates.
- Admin controls without surveillance.

## Final Strategic Sentence

**Build a private work session recovery tool. Start with technical people because their context is capturable and interruption is expensive. Prove that users will pay to create and use Return Notes before expanding into ADHD productivity, AI memory, or team workflows.**

## One-Line Product Test

If a user returns from Slack, a meeting, lunch, or a tab detour and says:

> "I knew exactly what to do next."

then the product is working.