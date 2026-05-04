# Stitch Feature Brief

## Purpose

Translate the production plan into the first desktop product screens for Stitch to generate.

This product is a **local-first desktop state recovery system for interrupted technical work**. The user is a technical founder or senior developer whose day gets broken by Slack, meetings, PR review, and task switching. The UI should make one promise feel true: **save the thread fast, then get back in without mental archaeology**.

Design for a real desktop app, not a marketing site and not a generic productivity dashboard.

## Ruthless Prioritization

Generate these screens in this order:

1. Return Note Capture Modal - `Core MVP`
2. Re-entry Card - `Core MVP`
3. Breadcrumb Rail / Current Thread Surface - `Core MVP`
4. Thread Detail + Recovery Timeline - `Core MVP`
5. Permissions + Context Sources Setup - `Core MVP`
6. Recovery Search Workspace - `Phase Two`

## 1) Return Note Capture Modal

**Why it matters strategically**

This is the activation moment and the habit-forming behavior. If saving state is not fast, structured, and slightly opinionated, the whole product collapses into vague note-taking. The screen must force a clear next visible action while still feeling lighter than opening a document.

**Prompt for Stitch**

Design a desktop quick-capture modal for a local-first app that helps senior developers save work state before an interruption. Centered modal over a dimmed desktop, compact but high-trust. The primary field is a required "Next visible action" input and it dominates the layout. Above it, a short thread title field with smart defaults. Below it, a "Park distractions" area for quick side-thread bullets. On the right or bottom, a compact context bundle showing detected app, window title, repo, branch, working directory, and browser domain as structured chips. Include strong keyboard-first affordances, subtle hotkey hints, a clear primary action to save the return note, and a lighter action to cancel. Tone is precise, calm, technical, and fast; it should feel like a save point, not a journaling app.

## 2) Re-entry Card

**Why it matters strategically**

This is the felt product. It is the proof that the tool rescues momentum after interruption. If this screen is weak, the user just made notes; if it is excellent, the user experiences continuity and remembers the product as useful.

**Prompt for Stitch**

Design a desktop re-entry card that appears when a developer returns from a meeting, idle period, or manual hotkey. The card should feel immediate and relieving, like the software is handing the user their thread back. Large thread title, prominent next visible action, compact list of parked distractions, and a concise context snapshot with repo, branch, last app, and time saved. Include one obvious primary action to resume work and smaller actions to open thread details, snooze, or dismiss. Use strong visual hierarchy, restrained color, and crisp spacing. This is not a notification toast; it is a focused recovery surface with enough context to restart work in seconds.

## 3) Breadcrumb Rail / Current Thread Surface

**Why it matters strategically**

The visible path back is part of the moat. This surface keeps the current thread legible throughout the day, reduces drift, and turns recovery from a one-time event into an ongoing sense of continuity.

**Prompt for Stitch**

Design a persistent desktop side rail or slim utility panel for a state recovery app used during technical work. The rail shows the current active thread, the next visible action, and a breadcrumb-style path of recent return points. Include small structured context chips, a count of parked items, and quick actions for Return Me, New Return Note, and open timeline. The layout should be narrow, information-dense, and quiet enough to live beside code editors all day. It should feel like a trusted instrument panel, not a chat sidebar or kanban board. Use compact typography, concise labels, and subtle separators so the current thread is always legible at a glance.

## 4) Thread Detail + Recovery Timeline

**Why it matters strategically**

Users need confidence that saved state is durable, inspectable, and recoverable later, not just in the current moment. This screen turns isolated rescue events into a trustworthy history and strengthens the local-first value proposition.

**Prompt for Stitch**

Design a desktop thread detail screen for a local-first recovery tool. Main pane shows a selected thread with its current next visible action, saved context bundle, timestamped return notes, and parked distractions. Adjacent pane or left column shows a chronological recovery timeline of recent save points. The interface should make it easy to understand how the thread evolved across interruptions. Include export-friendly, structured presentation rather than decorative cards: clear lists, timestamps, repo and branch badges, and a readable distinction between active thread state and historical entries. The feeling should be calm, serious, and dependable, like a technical logbook built for re-entry rather than analysis.

## 5) Permissions + Context Sources Setup

**Why it matters strategically**

Trust is part of the product. The app only wins if users understand exactly what local context is being captured and believe they remain in control. This screen prevents the product from feeling like surveillance while still explaining why permissions improve recovery quality.

**Prompt for Stitch**

Design a desktop permissions and context-sources setup screen for a privacy-sensitive local-first app. The user is a senior developer deciding whether to allow access to window titles, repo metadata, browser domain, calendar meeting boundaries, and local file context. Show each source as a clearly explained toggle row with short benefit language and plainspoken privacy language. Include a strong local-first trust frame: local storage, no required account, export available, and optional sources clearly marked. Avoid legalistic clutter and avoid consumer wellness aesthetics. The screen should feel crisp, transparent, and engineering-friendly, with structured rows, subtle icons, and a clear continue action once the essentials are enabled.

## 6) Recovery Search Workspace

**Why it matters strategically**

This is the first meaningful expansion surface after the core rescue loop is working. It deepens recovery and makes the product more useful over longer time horizons, but it should wait until the primary habit is real.

**Prompt for Stitch**

Design a desktop search and recovery workspace for a state recovery product used by developers. The screen should let the user search across past threads, return notes, repos, branches, browser domains, and parked items. Use a focused search bar, dense results list, and a rich preview panel that shows the selected thread's next action and context snapshot. Results should feel like recovering a work state, not browsing documents. Show filters for date, repo, app, and interruption type. Keep the visual tone consistent with the rest of the product: pragmatic, sharp, and local-first, with minimal ornament and strong scanability.

## Shared Visual And System Guidance

- Desktop-first, utility-grade product design for technical professionals.
- Calm, precise, and trustworthy; never playful, fluffy, or wellness-coded.
- Favor dense but readable layouts over oversized cards or empty hero-like spacing.
- Use a restrained neutral base with one clear accent color for active thread state, one warm warning color for interruption risk, and green only for confirmed recovery/saved states.
- Show structured context as chips or compact metadata rows; use monospace for repo, branch, path, and domain fragments.
- Keep corners tight, around 6-8px. Subtle dividers and shadows only where they improve scanability.
- The most important object on every screen is the **next visible action**. It should always be visually dominant.
- "Parked" items should read as secondary but still quickly recoverable.
- Include keyboard cues and hotkey hints wherever they help reinforce speed.
- Make local-first trust visible in the UI: local storage, explicit permissions, exportability, and no-account-needed cues.
- Avoid anything that makes the app look like a generic notes product, task manager, AI chat app, or analytics dashboard.

## MVP Vs Phase Two

**Core MVP**

- Return Note Capture Modal
- Re-entry Card
- Breadcrumb Rail / Current Thread Surface
- Thread Detail + Recovery Timeline
- Permissions + Context Sources Setup

**Phase Two**

- Recovery Search Workspace

## What Not To Spend Stitch Cycles On Yet

- Marketing pages
- Team admin or billing views
- Broad project management surfaces
- Habit dashboards, productivity scores, or mood tracking
- Full AI assistant screens
- Cross-device sync flows
