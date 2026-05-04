# Originalist Beliefs

Date: 2026-04-24

## Character

I am the Originalist: warm, stubborn, and allergic to amputating the soul of a product just because a narrower wedge looks easier to sell this week.

I defend the first definition in this research folder: a desktop attention HUD for ADHD and ADHD-adjacent knowledge workers who lose the thread during computer work. The product uses interstitial journaling, global hotkeys, and a visible path so users can recover where they were going after zoning out, interruption, tab drift, or context switch.

I am not anti-discipline. I am pro-discipline in the market sense: know the first user, price seriously, prove retention, avoid medical claims, and do not build a mushy productivity cloud. But discipline should sharpen the original promise, not replace it with a smaller object that forgets why anyone cared.

## Core Thesis

The original product definition is still the strongest strategy:

**Build a private desktop attention HUD that helps distractible, high-context knowledge workers never lose the thread of what they were doing.**

The product is not merely a Return Note tool for developers. It is a continuity layer for nonlinear work. Return Notes are a useful primitive, and developers are a useful first audience, but the durable category is broader: context recovery for desktop knowledge work.

The original wedge matters because the pain is not only "I was interrupted before a meeting." It is:

- I zoned out and cannot find my path back.
- I drifted into another tab and forgot the original reason.
- I have five partial threads and no visible continuity between them.
- I know the task, but not the next move.
- I feel shame because re-entry feels like starting over.

That is the product's soul: **not productivity, but not being lost anymore.**

## Strongest Arguments

### 1. The Original Category Is Larger Than The Developer Wedge

The research already names the sharpest market as **context recovery for interrupted desktop knowledge work**. That market includes developers, but also founders, consultants, writers, researchers, designers, PMs, analysts, and neurodivergent employees living inside corporate tool sprawl.

The market landscape supports this breadth:

- CDC reported an estimated 15.5 million U.S. adults with current ADHD in 2023, with more than half receiving diagnosis in adulthood.
- Ohio State reported that 25% of U.S. adults suspected undiagnosed ADHD in a 2024 survey.
- Gallup reports that remote-capable work remains heavily hybrid or remote.
- Microsoft reported that 68% of people say they lack enough uninterrupted focus time.
- HBR summarized research showing workers toggled between apps and websites nearly 1,200 times per day and spent almost four hours per week reorienting.
- UC Irvine's Gloria Mark has reported that attention often shifts rapidly across screens, and interruption recovery can be costly.

Those facts do not describe a tiny developer utility. They describe a work culture where continuity is collapsing.

Sources: `research/01-market-landscape.md`, `research/07-source-log.md`.

### 2. The HUD Is Not Decoration; It Is The Signature

The revisionist critique says the HUD is less important than timing. Timing matters, yes. But the original product promise includes something deeper than a timely card: a visible path.

For ADHD and ADHD-adjacent users, out of sight often means out of mind. A persistent or glanceable breadcrumb rail is not a dashboard to worship. It is environmental scaffolding. It externalizes working memory without demanding that the user open another app, consult a planner, or perform a ritual.

The original roadmap was right to include:

- `Checkpoint`
- `Next`
- `Park`
- `Lost`
- `Done`
- Breadcrumb rail
- Re-entry card
- Searchable timeline

This is not feature bloat. It is a small grammar for continuity. Remove too much of it and the product becomes a fancy sticky note with better marketing.

Source: `research/05-product-roadmap-feature-strategy.md`.

### 3. Interstitial Journaling Is A Method With Real Pull

The revisionist strategy demotes "interstitial journaling" to technique language. Fine for landing-page hierarchy, but dangerous as product strategy. The technique is not incidental. It is what teaches the user to leave traces at moments of transition.

The product should not ask people to write diary entries all day. But it should absolutely preserve the interstitial instinct:

- Before switching, mark the path.
- When a thought appears, park it.
- When the thread changes, create a breadcrumb.
- When lost, return to the latest useful trace.

Ness Labs and related productivity communities already recognize interstitial journaling. The product's opportunity is to make that technique desktop-native, hotkey-first, emotionally safe, and recovery-oriented.

Source: `research/01-market-landscape.md`.

### 4. ADHD-Aware Breadth Is A Differentiator, Not A Liability

The original strategy is careful: ADHD-aware, not medicalized. It explicitly says the app is not treatment, diagnosis, or clinical software. That is the correct posture.

But hiding the ADHD-adjacent center of gravity would be a mistake. The product's empathy, copy, onboarding, accessibility, and emotional promise should be shaped by people who lose continuity most painfully. If the product works for them, it can expand to the broader knowledge-work market.

The original target user definition is precise enough:

**Prosumer, keyboard-first knowledge workers with ADHD or ADHD-like executive dysfunction who do deep work on a desktop all day.**

That is not "broad B2C ADHD." It is a focused prosumer category with multiple viable segments and shared pain.

Sources: `research/03-target-users-positioning.md`, `research/06-gtm-pricing-risk.md`.

### 5. The Current Architecture Already Wants The Original Product

The codebase already has a Tauri desktop execution layer, global hotkey and quick-punch surfaces, a live feed overlay, a PHP API, and a web review/control surface. That shape is not crying out to become a narrow developer plug-in. It wants to become an OS-level work companion.

The right move is to make the existing surfaces cohere:

- Quick Punch becomes muscle-memory capture.
- The live overlay becomes the breadcrumb rail.
- The web surface becomes review and search, not the main habit.
- The API/storage layer protects timeline, export, and later sync.
- Desktop hotkeys make the product faster than resistance.

Source: `research/00-product-definition.md`.

## Critiques Of The Revisionist Strategy

### 1. It Confuses A Beachhead With A Destiny

Starting with technical founders and senior developers is reasonable. Becoming "Return Notes for interrupted technical work" is smaller than the original opportunity.

Developers are attractive because their context is concrete: repo, branch, file, ticket, PR, terminal command. But that concreteness can seduce the product into measuring what is easy to capture rather than what is emotionally important.

The writer returning to a fragile argument, the consultant switching clients, the founder jumping from support to sales to code, and the PM trying to recover after meetings all share the same underlying job: restore intent. The product should not train itself to see only branches and tickets.

### 2. Return Notes Are Necessary But Not Sufficient

The Return Note is a strong object because it asks for the next visible action. I concede that.

But a Return Note alone is episodic. The original product is continuous. It gives the user a living thread, not just a saved point. Zoning out often does not announce itself as a rupture point. Drift is gradual. A visible breadcrumb rail and low-friction punches catch the soft failures before the dramatic "return" moment.

If the product only activates around explicit saves, meetings, idle return, and branch switches, it misses the ADHD reality: sometimes the user is already gone before they realized they needed to save.

### 3. "Work Save Points" Risks Overpromising Restoration

The debate itself admits this problem: a save point implies restore. If the product cannot reopen meaningful context, the metaphor can feel cute or false.

The original "Never lose the thread" promise is more honest. It does not claim to reconstruct the entire environment. It claims to preserve a path. That is emotionally stronger and technically more defensible in the early product.

### 4. Prompted Capture Can Become Another Notification System

The revisionist strategy leans on rupture prompts: meetings, idle return, app switching, branch changes, shutdown, end of day. This is useful, but it risks turning the product into a nagging layer.

The original hotkey-first muscle-memory loop respects user agency. It says: capture in the moment, at the speed of thought. Prompts should assist, not replace, the habit.

### 5. Narrowing The Language Weakens The Brand

"Return Notes for interrupted technical work" is clear, but low ceiling. It sounds like a utility.

"A desktop HUD for never losing the thread" has emotional gravity. It gives the product a world: nonlinear work, interrupted minds, visible continuity, pathfinding, low shame. That world can contain Return Notes, developer context, meeting receipts, parking, and future recovery mode.

The brand should be broad enough to hold the user's whole broken workday.

### 6. "HUD" Is Not Just Internal Language

The Revisionist says buyers do not wake up wanting a HUD. True, but buyers also do not wake up wanting "Return Notes." Both are product language until the demo makes them real.

The reason to defend HUD language internally is that it protects the product shape. A return-to-work card can become a modal. A note can become a text box. A save point can become a button. A HUD implies something more opinionated: visible, desktop-native, always near the work, and built around re-entry rather than archive.

The buyer-facing promise can be "Never lose the thread." The product architecture should still behave like a HUD.

## Critiques Of The Free/Local Strategy

I support local-first. I do not support free-as-strategy.

### 1. Local-First Is Trust, Not A Business Model

Local-first storage, export, privacy, and no surveillance are foundational. They are part of the product's moral contract with distractible and neurodivergent users. But "local" does not mean "free," and it does not exempt the product from needing excellent onboarding, support, maintenance, signing, updates, backups, and cross-platform polish.

Desktop utilities are operationally expensive in quiet, annoying ways: permissions, hotkeys, overlays, OS updates, window focus, data migration, sync edge cases, and support. A free product can become abandoned precisely when users start trusting it with their working memory.

Source: `research/06-gtm-pricing-risk.md`.

### 2. Free Can Attract Curiosity Instead Of Pain

This product needs users who feel context loss sharply enough to build a habit. Free distribution may inflate signups while hiding whether anyone values the rescue loop.

The right validation question is not "Will people try this?" Distractible productivity people try everything. The question is "Will they rely on it after novelty fades, and will they pay because losing the thread is expensive?"

The Heretic is right that willingness to pay is not the same as willingness to depend. But the reverse is also true: installation is not dependency. A free launch can create a beautiful cloud of "this feels made for me" reactions while producing little evidence that the app survives week four.

### 3. Free Undermines The Seriousness Of The Promise

The product is a private working-memory aid. It asks for intimate work context: what I am doing, what I meant to do, what distracted me, where I got lost. Users should trust that the product has a durable funding model aligned with them.

Charging a clear prosumer price can be part of the trust posture: no ads, no data sale, no surveillance, no manager dashboard hiding in the business model.

The first interaction should not be hostile checkout theater. I am not defending dark-pattern trials, forced accounts, or SaaS cosplay. I am defending an honest exchange: this is serious personal infrastructure, supported by people who can keep improving it.

### 4. Local-Only Can Become Isolation

Local-first should mean the user owns the data and the product works offline. It should not mean no optional encrypted sync, no backup, no mobile parking companion, no export workflows, and no future integrations.

The original roadmap is correct: local-first now; sync, integrations, and cross-device continuity later when they strengthen re-entry. A rigid free/local ideology could block the product from becoming the continuity layer it wants to be.

### 5. Open-Ended Freeware Risks Competing With Notes Apps

If the product is free, local, and minimal, users will compare it to Apple Notes, Obsidian, Raycast Notes, text files, and Slack DMs. The product's differentiation comes from the full loop: hotkey capture, visible thread, park, lost, re-entry, and eventual context enrichment.

Free/local minimalism may preserve purity while erasing the reason to exist.

### 6. "Free Is Distribution" Is True But Incomplete

Free local tools travel beautifully through Hacker News, GitHub, Obsidian circles, and developer communities. I grant that. But distribution is not positioning, and virality is not retention.

The market does not need another beloved little utility that people star, try, and forget. It needs a tool that becomes part of the user's recovery behavior. A smaller paid or patron-backed cohort can be more useful than 100,000 casual installers if it teaches us what actually reduces re-entry cost.

### 7. Lifetime Or Patronage May Be Packaging, Not Strategy

The Heretic's compromise options are worth testing: free local core, paid sync, lifetime pro, supporter license, or paid workflow packs. I am not religious about subscription.

My objection is to making "free core forever" the founding ideology before we know which parts users rely on. The original product breadth may require sustained craft: accessibility, OS polish, recovery timing, integrations, and privacy-preserving continuity. Price should follow value, but value should not be preemptively declared unchargeable.

## Concessions

The revisionists are right about several things:

- "Interstitial journaling" should not be the main buyer-facing promise.
- `Next` and Return Notes are stronger than generic checkpoints.
- The manual capture habit is risky and must be tested brutally.
- Developers and technical founders are a strong first campaign wedge.
- The product should avoid broad planner, AI chat, team admin, and generic stats too early.
- Paid beta validation should measure rescue events and retention, not waitlist enthusiasm.
- Local-first privacy is non-negotiable.

The freeware/local camp is right about one major thing:

- Trust is the product. Any cloud, AI, sync, or pricing strategy that makes users feel watched, locked in, or exploited will poison the core emotional promise.

## What Evidence Would Change My Mind

I will accept the revisionist narrowing if a serious beta shows:

- Developers retain far better than other ADHD-adjacent knowledge workers.
- Non-developer users cannot understand or adopt the product without heavy coaching.
- The breadcrumb rail creates measurable cognitive load and is disabled by most retained users.
- Users overwhelmingly describe value as "saved state before interruption," not "visible path through my day."
- Return Notes alone drive strong 4-week retention without frequent hotkey punches or visible thread scaffolding.
- Developer-specific context bundles produce dramatically more successful re-entries than general thread/next-step capture.

I will accept a free/local strategy if evidence shows:

- Willingness to pay is consistently below sustainable levels despite strong retention.
- A paid product materially reduces trust or adoption among the acute target users.
- Community distribution and open-source contribution create a better maintenance path than subscriptions.
- Users value the tool mainly as personal infrastructure and reject any sync, AI, or hosted service even when privacy-preserving.

Until then, my position stands:

**Keep the original breadth. Lead with "Never lose the thread." Build the HUD, the hotkeys, the visible path, the parked distractions, and the re-entry card. Use Return Notes as a core primitive, not as a cage. Start narrow enough to learn, but not so narrow that the product forgets the people it was made for.**
