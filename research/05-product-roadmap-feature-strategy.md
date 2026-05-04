# Product Roadmap And Feature Strategy

## Product Principles

- Present tense beats planning.
- One line beats structure.
- Hotkeys beat notifications.
- Recovery beats discipline.
- Private by default.
- Never shame the user for drifting.
- Every entry should make return easier.
- AI should clarify, not chat.
- The core unit is a thread, not a task.
- The app should disappear faster than resistance can form.

## MVP

The MVP should prove one thing:

**A user can lose the thread and recover it in seconds.**

### 1. Global Hotkeys

Recommended hotkeys or commands:

- `Checkpoint`: what am I doing right now?
- `Next`: what is the next physical step?
- `Park`: capture a distraction without following it.
- `Lost`: show me where I was going.
- `Done`: close this thread.

### 2. Quick Punch HUD

The current quick-punch idea should become the main surface:

- Opens instantly.
- Accepts one line.
- Has mode chips or hotkey-selected modes.
- Saves and disappears.
- Works without opening the web app.

### 3. Breadcrumb Rail

A slim overlay or menubar/panel view that shows:

- Current thread.
- Last checkpoint.
- Next step.
- Parked item count.

The rail should be glanceable and draggable. It should not feel like a dashboard.

### 4. Re-entry Card

Shown when the user hits `Lost`, returns after idle, or comes back from a meeting:

- "You were working on..."
- "Last useful note..."
- "Next step..."
- "Parked while you were here..."
- Optional app/window context if enabled.

This is the magic moment.

### 5. Local-First Journal Store

Even if the server API remains, the desktop product should feel reliable offline:

- Entries never disappear.
- Sync can be later or optional.
- Export is simple.
- Privacy posture is strong.

### 6. Searchable Timeline

The web app can remain the review surface:

- Today.
- Yesterday.
- Last 7 days.
- Tags.
- Search.
- Thread view.
- Stats only if they help reflection, not guilt.

## Next Features

### Passive Context Metadata

Optional, explicit, and private:

- Active app.
- Window title.
- Browser domain.
- File path or repo name.
- Git branch.
- Calendar meeting.
- Focus mode state.

Do not collect keystrokes. Do not record screen by default. Avoid screenshots except explicit capture.

### Thread Inference

Use entries and metadata to infer the current thread:

- "Still on login bug?"
- "This looks like the pricing research thread."
- "You switched to Slack. Keep current thread or park?"

### Vague-To-Concrete AI

When user writes:

- "work on deck"
- "fix auth"
- "research market"

AI suggests:

- "Open the deck."
- "Find the slide with the problem statement."
- "Inspect session middleware redirect."
- "Create source list and competitor table."

The AI should produce next visible actions, not long advice.

### Shiny Object Parking Lot

Dedicated `Park` flow:

- Capture a distraction.
- Tag it automatically.
- Keep it out of the current thread.
- Review later.

This turns restraint into capture, which is friendlier for ADHD users than pure blocking.

### Loop Detector

If the user circles the same topic repeatedly:

- "You have returned to this three times."
- "Split it, park it, or choose one next step?"

Keep tone neutral and practical.

### Meeting Interruption Receipt

Before meetings:

- Auto-prompt: "When you come back, continue from..."

After meetings:

- Show previous thread and next step.

This could become a viral workflow for remote/hybrid workers.

### Browser Drift Rescue

If enabled:

- Detect multiple unrelated tabs/domains.
- Ask: "Part of current thread or park?"
- Create parked items without shaming.

### Integrations

Prioritize integrations that enrich re-entry:

- VS Code / JetBrains: file, repo, branch, selected text.
- GitHub / Linear / Jira: issue/PR context.
- Calendar: meeting boundaries.
- Raycast: command access.
- Obsidian/Markdown export: user-owned archive.
- Browser extension: tab/title/context capture.

## Long-Term Bets

### Recovery Mode

The product restores the working environment for a thread:

- Reopen tabs.
- Open repo/file.
- Show notes.
- Show next step.
- Rehydrate context after a break, weekend, or meeting day.

### On-Device AI

Local model for:

- Thread inference.
- Summaries.
- Next-step refinement.
- Semantic search.

This supports the privacy story.

### Cross-Device Continuity

Desktop first, then mobile companion:

- View current thread.
- Park thoughts on phone.
- Receive re-entry reminders.
- End-of-day review.

Avoid becoming a mobile planner.

### Team-Safe Handoff Notes

Later:

- Employee-controlled summary export.
- Client work logs.
- Pairing handoffs.
- "What changed while I was in this thread?"

Never make private attention data visible to managers by default.

## Feature Prioritization

| Feature | Impact | Complexity | Priority |
|---|---:|---:|---|
| `Lost` re-entry card | Very high | Medium | P0 |
| `Next` hotkey/mode | Very high | Low | P0 |
| Parked distractions | High | Low/medium | P0 |
| Breadcrumb rail | High | Medium | P0 |
| Thread view | High | Medium | P1 |
| Idle return prompt | High | Medium | P1 |
| App/window metadata | Medium/high | Medium/high | P1 |
| AI next-step refinement | High | Medium/high | P1 |
| VS Code/GitHub/Linear integration | High for devs | High | P2 |
| Team features | Medium now | High | Later |

## Activation Moment

The user must experience this within the first week:

1. They write a next step.
2. They get interrupted or drift.
3. They hit `Lost` or see a re-entry card.
4. They resume without rebuilding context.

That is the retention event.

## Product North Star

Suggested north-star metric:

**Successful re-entries per active workday.**

Proxy events:

- User creates a `Next` punch.
- User opens `Lost` after idle or app switching.
- User resumes the same thread within 5 minutes.
- User marks thread `Done`.

Avoid optimizing for raw entries only. A lot of entries without recovery value can become noise.
