# Product Definition

## Canonical Definition

This app is a **desktop attention HUD** for people who lose the thread during computer work.

It uses interstitial journaling and global hotkeys to let the user leave quick breadcrumbs throughout the workday. The entries should be so low-friction that they become muscle memory: press a hotkey, write one line, return to work.

The product's emotional promise:

**When you zone out, get interrupted, or drift into another task, you can come back and immediately see where you were going.**

## Current App Shape

The codebase already supports the right architecture for this direction:

- `tauri-app/`: native desktop execution layer for system-level hotkeys, quick-punch, overlays, screenshots, and OS integration.
- `web-app/`: browser-based review/control surface with journal browsing, stats, tags, settings, and download/boot flows.
- `api/`: PHP/MySQL store for entries, tags, images, sessions, stats, and related endpoints.

This means the product can be positioned as a real OS-level work companion rather than just another browser tab.

## What It Is

- A hotkey-first HUD for capturing the present working state.
- A live breadcrumb rail for current intent.
- A recovery surface for "what was I doing?"
- A micro-journal optimized for work transitions, not long reflection.
- A private working-memory aid for desktop knowledge workers.
- A product that makes re-entry after interruption faster and calmer.

## What It Is Not

- Not a medical treatment for ADHD.
- Not a diagnostic tool.
- Not a full task manager.
- Not a calendar scheduler.
- Not a passive employee monitoring system.
- Not a traditional diary.
- Not a blocker-first focus app.
- Not "record everything on my screen" lifelogging.

## Core Unit: The Thread

The product should treat a "thread" as the atomic unit, not a task.

A task is something to complete. A thread is a path through thought and work:

- "Fix login redirect"
- "Understanding the market positioning"
- "Draft the proposal"
- "Debug why upload fails"
- "Prepare for client call"

Each thread accumulates tiny entries that preserve state:

- What I am doing now.
- Why I am doing it.
- What changed.
- What I should do next.
- What I parked for later.
- How to resume.

## Core Loop

1. **Checkpoint**
   The user hits a hotkey and writes what they are doing now.

2. **Next**
   The user writes the next physical step, not a vague intention.

3. **Park**
   The user captures distractions without chasing them.

4. **Lost**
   The user hits a hotkey when they feel adrift. The HUD shows the current thread, last checkpoint, next step, parked ideas, and recent context.

5. **Done**
   The user closes the loop and optionally starts the next thread.

## Product Primitives

### Punch

A one-line entry with optional metadata. It is the smallest possible unit of capture.

### Thread

A chain of punches connected by intent. A thread can be inferred, user-selected, or created from a hotkey.

### Next Step

A special punch that answers: "When I return, what is the next visible action?"

### Parked Item

A thought that is not part of the current thread. Parking must feel rewarding because it prevents tab drift.

### Re-entry Card

A small recovery surface shown after idle time, app switching, meeting return, or a `Lost` hotkey:

- Current thread.
- Last useful note.
- Next step.
- Recent app/doc context if enabled.
- Parked distractions.

### Breadcrumb Rail

A persistent or glanceable overlay:

`Thread -> current sub-problem -> next action`

This is the product's HUD signature.

## Product Promise

The product should say:

> Your workday is not linear. This gives you a path back.

That phrasing avoids moralizing and avoids medical claims. It frames the product around lived experience: computer work is fragmented, and some brains need visible continuity.
