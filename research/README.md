# Research Folder

Date: 2026-04-24

This folder treats the current product definition as canonical:

> A desktop HUD that helps people with attention deficit lay a track or path of where they were going, using interstitial journaling and system hotkeys so making an entry becomes muscle memory. The goal is that a user never feels lost after zoning out while working behind the computer.

Legacy product descriptions in older markdown files should not steer market strategy. The current codebase still matters as implementation context: it already contains a Tauri desktop execution layer, global hotkey/quick-punch surfaces, a live feed overlay, a PHP API, and a web review/control surface.

## Main Thesis

The market is not simply journaling, ADHD apps, time tracking, or task management. The sharpest market is **context recovery for interrupted desktop knowledge work**.

The product should own this sentence:

**Never lose the thread of what you were doing.**

The best initial customer is a prosumer, keyboard-first knowledge worker with ADHD or ADHD-like executive dysfunction: developers, founders, consultants, writers, researchers, designers, PMs, and analysts who spend most of their workday on a computer and lose expensive context when interrupted.

## Files

- [00-product-definition.md](00-product-definition.md): what the product is, what it is not, and the core loop.
- [01-market-landscape.md](01-market-landscape.md): category map, market urgency, and evidence.
- [02-competitor-map.md](02-competitor-map.md): adjacent products and the gap this product can own.
- [03-target-users-positioning.md](03-target-users-positioning.md): beachhead users, jobs to be done, messaging, and channels.
- [04-pivot-options.md](04-pivot-options.md): possible pivots and which ones are most attractive.
- [05-product-roadmap-feature-strategy.md](05-product-roadmap-feature-strategy.md): MVP, next features, long-term bets, and product principles.
- [06-gtm-pricing-risk.md](06-gtm-pricing-risk.md): pricing, packaging, launch strategy, claims risk, and privacy/accessibility concerns.
- [07-source-log.md](07-source-log.md): source links used across the research.
- [08-adversarial-debate.md](08-adversarial-debate.md): counter-agent debate that challenges the first thesis.
- [09-revised-strategy-after-debate.md](09-revised-strategy-after-debate.md): sharper post-debate recommendation and validation plan.

## Strategic Read

The product should not compete head-on with Tiimo, Sunsama, Motion, Akiflow, RescueTime, or Raycast. Those tools organize time, tasks, or commands. This product should preserve intent and make re-entry easy.

The gap:

- Planners know what the user hoped to do.
- Trackers know what apps the user used.
- Blockers try to stop distraction.
- Journals store reflection after the fact.
- AI memory tools record everything, often with privacy baggage.
- This product should remember the user's **working thread**: what they were trying to do, why it mattered, and the next concrete step.

That is a product with its own emotional pull. It is not "be more productive." It is "I am not lost anymore."

## Debate Update

The adversarial review sharpened the thesis:

- "Desktop attention HUD" is useful internally, but not always buyer-native.
- "Interstitial journaling" is a technique, not the product promise.
- The risky assumption is that users will manually journal all day.
- The stronger object is a **Return Note**: a one-line handoff to future self.
- The stronger metaphor is **Work Save Points**, but only if the product can actually restore meaningful work context.
- The first wedge should be technical founders and developers doing interrupted, high-context work.

Updated strategic sentence:

**A local-first return-to-work tool that lets interrupted technical workers save their place, park distractions, and reload the next step.**
