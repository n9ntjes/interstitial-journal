# GTM, Pricing, And Risk

## Recommended Packaging

### Trial

- 14-day free trial.
- No credit card if possible.
- Onboarding goal: get the user to create their first `Next` and experience one re-entry card.

### Solo

Price:

- $12/month or $96/year.

Includes:

- Quick Punch HUD.
- Global hotkeys.
- Breadcrumb rail.
- `Lost` re-entry card.
- Timeline/search.
- Local-first storage.
- Manual export.
- Basic tags/threads.

### Pro

Price:

- $18-$20/month or $144-$180/year.

Includes:

- AI next-step refinement.
- Semantic search.
- Encrypted sync.
- Calendar integration.
- App/window context metadata.
- Thread summaries.
- Developer integrations.
- Advanced export.

### Team Later

Price:

- $12-$18/user/month.

Only after:

- Privacy model is excellent.
- Admin controls exist.
- SSO/security docs exist.
- Employee-owned data boundaries are clear.

## Pricing Rationale

Comparable products show a wide paid range:

- Llama Life: App Store listing shows $6/month and $39/year. Source: [Llama Life](https://apps.apple.com/us/app/adhd-organizer-llama-life/id6454469750).
- Tiimo: App Store listing shows monthly and yearly Pro options around $12/month and $54/year. Source: [Tiimo](https://apps.apple.com/us/app/tiimo-visual-daily-planner/id1480220328).
- RescueTime: annual Solo plans at $7/month and $12/month. Source: [RescueTime](https://www.rescuetime.com/plans).
- Rize: individual plans at $9.99/month and $14.99/month when billed annually. Source: [Rize](https://rize.io/pricing).
- Raycast Pro: $8/month annual or $10/month monthly. Source: [Raycast](https://www.raycast.com/pricing).
- Sunsama: $25/month monthly or $20/month annually. Source: [Sunsama](https://www.sunsama.com/pricing).
- Akiflow: $34/month monthly or $19/month annually. Source: [Akiflow](https://akiflow.com/pricing).

The product should price above lightweight ADHD timers and below premium daily planners at first. $12/month is credible if the daily re-entry benefit is felt quickly.

## Launch Strategy

### Phase 1: Founder-Led Prosumer Beta

Target:

- 50 to 200 ADHD/ADHD-adjacent desktop workers.
- Developers, founders, consultants, writers.

Goal:

- Validate that people use hotkey entries multiple times per day and feel rescued by re-entry.

Channels:

- Direct outreach in developer/founder communities.
- ADHD productivity creators with careful claims.
- Product Hunt waitlist.
- Hacker News "Show HN" once the demo is crisp.
- Indie Hackers build-in-public posts.
- Obsidian/Raycast/VS Code communities.

### Phase 2: Workflow Content

Publish concrete workflows:

- "Interstitial journaling for software engineers."
- "How I stop losing the thread after meetings."
- "A hotkey journaling setup for ADHD founders."
- "Debugging your attention like a stack trace."
- "How to park distractions without opening another app."

SEO topics:

- interstitial journaling app.
- ADHD context switching.
- ADHD programmer productivity.
- attention residue.
- recover focus after interruption.
- desktop focus HUD.
- never lose the thread.

### Phase 3: Integrations And Prosumer Expansion

Build integrations where the beachhead already lives:

- VS Code.
- GitHub.
- Linear/Jira.
- Raycast.
- Calendar.
- Obsidian/Markdown export.

### Phase 4: Team Packs

Only after strong individual retention:

- Team licenses for engineering/product teams.
- Shared templates, not shared private logs.
- Employee-controlled exports.
- Admin controls without surveillance.

## Core Metrics

Activation:

- User creates first thread.
- User creates first `Next`.
- User opens first `Lost` or sees first re-entry card.

Retention:

- Active days per week.
- Threads resumed after idle/interrupt.
- Number of successful re-entries.
- Parked items reviewed.

Habit:

- Punches per active workday.
- Ratio of `Next` punches to generic punches.
- Time from `Lost` to resumed work.

Business:

- Trial to paid.
- Week 4 retention.
- Annual conversion.
- Refund reasons.

Qualitative:

- "I felt less lost."
- "I trusted myself to come back."
- "I stopped opening random tabs."
- "I did not need to reconstruct the whole task."

## Claims And Regulatory Risk

### Safer Claims

- "Helps you capture transitions."
- "Helps you return to work with context."
- "Designed for distractible, high-context desktop work."
- "Supports focus habits and work continuity."
- "A private breadcrumb trail for your workday."

### Risky Claims

- "Treats ADHD."
- "Reduces ADHD symptoms."
- "Clinically proven to improve executive function."
- "Alternative to medication."
- "Medical-grade focus improvement."
- "Therapy for ADHD."

The product should remain in general wellness/productivity territory unless the company intentionally pursues clinical validation and regulatory review.

FDA guidance says general wellness products can be outside device regulation when they encourage healthy lifestyle and do not diagnose, cure, mitigate, prevent, or treat disease. Source: [FDA General Wellness guidance](https://www.fda.gov/regulatory-information/search-fda-guidance-documents/general-wellness-policy-low-risk-devices).

FDA regulates software functions that meet the definition of a medical device. Source: [FDA device software functions](https://www.fda.gov/medical-devices/digital-health-center-excellence/device-software-functions-including-mobile-medical-applications).

FTC requires health-related claims to be truthful, not misleading, and supported by competent evidence. Source: [FTC Health Products Compliance Guidance](https://www.ftc.gov/business-guidance/resources/health-products-compliance-guidance).

## Privacy Risk

If the product stores health-related information or explicitly frames user data as ADHD/mental-health data, privacy obligations and user trust burden rise.

FTC updated the Health Breach Notification Rule in 2024 to clarify its applicability to health apps and similar technologies not covered by HIPAA. Source: [FTC final rule press release](https://www.ftc.gov/news-events/news/press-releases/2024/04/ftc-finalizes-changes-health-breach-notification-rule), [FTC basics for business](https://www.ftc.gov/business-guidance/resources/health-breach-notification-rule-basics-business).

Recommended privacy posture:

- Local-first by default.
- No keystroke logging.
- No screen recording by default.
- Screenshots only on explicit command.
- App/window metadata opt-in.
- Clear data deletion.
- Export to Markdown/JSON.
- Encrypted sync if cloud is offered.
- Never sell user data.
- Avoid manager visibility into private logs.

## Accessibility Requirements

Because the product targets distractible and neurodivergent users, accessibility is a core requirement:

- Full keyboard access.
- Screen reader labels.
- Visible focus states.
- High contrast mode.
- Reduced motion.
- Resizable text.
- No time-limited UI that cannot be paused.
- No forced animations.
- Clear error recovery.
- Simple language.

WCAG 2.2 adds criteria around focus visibility, dragging, target size, and related concerns. Sources: [W3C WCAG 2.2 announcement](https://www.w3.org/WAI/news/2023-10-05/wcag22rec/), [What's new in WCAG 2.2](https://www.w3.org/WAI/standards-guidelines/wcag/new-in-22/).

## Main Go-To-Market Bet

Sell the first version as:

**A private attention HUD for desktop workers who keep losing the thread.**

Then prove it with one repeated user experience:

The user gets interrupted, hits `Lost`, and immediately knows what to do next.
