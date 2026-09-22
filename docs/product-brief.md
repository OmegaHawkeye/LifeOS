# LifeOS Product Brief

Status: MVP baseline | Owner and initial user: Julian | Related issues: OME-138, OME-172 | Last updated: 2026-09-21

## Product statement

LifeOS is a private personal operating system that brings daily planning, personal finances, fitness, nutrition, and selected health signals into one calm, coherent application. It should help Julian decide what matters today, capture important data with little friction, and review progress without switching between disconnected tools.

The product is deliberately personal before it is general. The first release optimizes for one trusted user and a handful of repeatable workflows; it is not a configurable life-management platform.

## Target user

The MVP serves one user: Julian, using LifeOS across desktop, phone, and a wall-mounted tablet. LifeOS runs on a home server and remains usable by non-technical people after setup. He wants more control over money, training, food, and routines, but does not want daily administration to become another project. He values privacy, clear trends, fast manual entry, and the ability to retain and export his own data.

Future multi-user needs may be researched later, but they must not shape the MVP architecture or interface unless a decision would otherwise make later evolution prohibitively expensive.

## Jobs to be done

### Daily planning

- When I start or check my day, show the few priorities, planned activities, and exceptions that deserve attention.
- Let me jump from the dashboard directly into the most common capture and planning actions.
- When the week ends, help me review what happened and prepare the next week.

### Finance

- Let me record an income or expense quickly and understand the current month's cash flow.
- Help me see whether budgets, subscriptions, and savings goals are on track.
- Preserve clean, user-owned records that can later accept imports without making bank sync a prerequisite.

### Fitness

- Let me record body metrics and workouts manually and see progress over time.
- Show the next planned workout, recent consistency, and meaningful personal records.
- Keep source information so future health imports can coexist with manual entries.

### Nutrition

- Help me plan a realistic week of meals around nutrition targets, budget, and preparation effort.
- Turn planned meals into a practical preparation and shopping workflow.
- Let me compare the plan with what I actually ate without punishing or noisy feedback.

### Health

- Give me a small, understandable view of health signals that support daily decisions.
- In the MVP, derive this view from manual body and workout data.
- Later, import selected Apple Health data with explicit consent, provenance, deduplication, and revocation rules.

## First release

The first usable LifeOS release is a private, responsive single-user web app where Julian can sign in, open a daily dashboard, quickly record transactions and body metrics, log or plan workouts, plan meals for the week, and track a small set of goals and reminders. The dashboard summarizes only data already captured in LifeOS and provides direct next actions. It remains useful without bank connections, Apple Health, automated recommendations, or native mobile apps.

## MVP boundary

### Included in the MVP

- Private single-user authentication and a protected application shell.
- Settings for timezone, currency, measurement units, theme, and privacy defaults.
- A responsive PWA-style experience for desktop, phone, and tablet.
- Daily dashboard with today's focus, finance pulse, next workout, meal plan, goals, and reminders.
- Manual finance accounts, categories, transactions, and a monthly cash-flow overview.
- Manual body metrics, fitness goals, workout templates, planned sessions, and workout logs.
- Recipes, basic nutrition targets, weekly meal planning, and meal status.
- A small set of goals and reminders plus a guided weekly review.
- User-triggered export of all structured personal data in documented, portable formats.
- Basic audit metadata for sensitive writes and guided, configurable backups on the home server.

### Post-MVP

- Apple Health research, import, sync history, health trends, and conflict resolution.
- Bank or card imports, transaction enrichment, and financial data synchronization.
- Budgets, subscription tracking, dedicated savings-goal workflows, and deeper finance planning.
- Generated shopping lists and more advanced meal-prep workflows.
- Reusable routines, completion histories, snoozing, and external reminder delivery.
- Advanced asset and investment tracking, including automated valuations.
- Progress-photo storage and comparison.
- Rich recommendations, forecasting, and automation across modules.
- Dedicated ambient iPad or wall-display mode with privacy controls.
- Native iOS applications, widgets, and deeper device integrations.
- Offline writes and multi-device conflict resolution if real usage shows they are necessary.

### Out of scope

- Social feeds, sharing, public profiles, coaching marketplaces, or community features.
- Household, family, team, or general multi-tenant use.
- Medical diagnosis, treatment advice, or claims that LifeOS is a medical device.
- Banking, custody, trading, payment initiation, or tax filing.
- A generic no-code database, workflow builder, or plugin marketplace.
- Gamification that pressures the user through streak loss, shame, or excessive notifications.
- Automated ingestion without explicit user action, consent, and visible source information.

## First workflows

1. **Morning check-in:** Open the dashboard, review today's priorities, next workout, meal plan, reminders, and current financial pressure points.
2. **Quick capture:** Add a transaction, body measurement, meal update, or completed workout in a few focused steps from any relevant screen.
3. **Plan ahead:** Prepare the next workout, assign meals to the coming days, and note preparation needs.
4. **Weekly review:** Review cash flow, training consistency, body trend, meal-plan adherence, and open goals; then set next week's priorities.

The product should favor these flows over module completeness. A dashboard card must either support a decision or lead to an action; otherwise it waits.

## Privacy, ownership, and export

- All LifeOS data is private by default and visible only to the authenticated owner.
- Production secrets and personal production data never belong in the repository, fixtures, screenshots, logs, or analytics payloads.
- Collect only data required for an included workflow. Analytics and error reporting must avoid personal domain values by default.
- LifeOS data stays on the user's home server and local devices; it is not sent to LifeOS-operated cloud services. Health data is read through the platform's explicit HealthKit/Health Connect permissions and synced to the user's own server.
- Sensitive values must be protected in transit and at rest using controls available on the user's devices and home-server installation.
- Destructive and security-relevant actions should be attributable through timestamps and appropriate audit metadata.
- The owner can export all structured data without vendor-specific lock-in. Finance, fitness, nutrition, goals, and settings should have documented JSON and/or CSV representations; files should retain their original format and metadata where practical.
- Export and deletion behavior must be designed before storing highly sensitive files such as progress photos or health exports.
- Backups are for recovery, not an alternative ownership path; retention and restoration expectations must be documented before production use.

## Deployment decision

LifeOS is a **self-hosted home-server application**. The home server is the source of truth; web and mobile devices connect to it over the user's home network. LifeOS must not require a hosted account, cloud database, vendor telemetry, or a third-party storage service for core functionality.

HealthKit and Health Connect are device-platform integrations, not LifeOS cloud integrations: the mobile app reads only the health data the user grants and syncs selected records directly to their own home server. Any future remote access must remain an explicit user-configured path to that server, not a LifeOS relay or hosted data copy.

The setup experience should work for non-technical home-server owners. Backups run daily with 30-day retention by default, configurable up to two years where storage permits. Recommend a NAS or second external drive as an independent target, while still allowing backups on the server itself so a separate device is never a setup prerequisite. The recovery objectives are documented in [the backup policy](backup-policy.md) and validated by restore drills.

## Product principles and success signals

- **Useful before complete:** Ship vertical workflows that improve a real day or week.
- **Manual before integrated:** Prove the domain model and interaction before adding external sync.
- **Calm by default:** Prefer a small number of actionable signals over dense dashboards and alerts.
- **Modules stay separable:** Finance, Fitness, Nutrition, Health, and Dashboard may compose through explicit shared concepts, not hidden coupling.
- **User-owned data:** Access, export, deletion, and provenance are product features.

The MVP is successful when Julian voluntarily uses it for several consecutive weeks, can complete each quick-capture workflow without friction, relies on the weekly review to plan the next week, and can export his data confidently. Exact quantitative targets should be set after the first instrumented prototype establishes a realistic baseline.

## Assumptions

- One owner account is sufficient for the first release.
- Manual entry is acceptable when common actions are fast and mobile-friendly.
- The user has a home server and devices can reach it over the home network.
- Core LifeOS use must not depend on internet access; external health-platform access is limited to device-authorized APIs.
- Existing calendar, notification, banking, and Apple Health systems remain external during the MVP.
- Finance, fitness, and nutrition summaries can share goals, reminders, files, settings, and audit concepts without sharing their domain models.
- LifeOS is a personal decision-support tool, not a regulated financial or medical product.

## Open questions

- Which home-server installation and update flow best supports non-technical users?
- Which setup and update flow makes self-hosting approachable for non-technical home-server owners?
- Which export formats and schemas provide the best balance between human readability and lossless re-import?
- Which two or three dashboard signals are valuable enough to lead the first vertical slice?
- What maximum interaction time should define "quick" for transaction, metric, meal, and workout capture?
- Are reminders in-app only for the MVP, or is one external delivery channel essential?
- Which data, if any, may appear in a future visible wall-display mode by default?
- What evidence would justify investing in offline writes or a true local-first architecture?

## Decision guardrail

If a proposed feature does not improve one of the first workflows, protect user data, or unblock the first usable release, it should be moved to post-MVP until real usage proves otherwise.
