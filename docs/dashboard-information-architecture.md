# LifeOS daily dashboard information architecture

Status: approved implementation brief | Related issue: OME-158 | Updated: 2026-09-16

## Purpose

The dashboard is a decision surface for the next few hours, not a metrics wall. It answers three questions in order:

1. What deserves attention today?
2. What is the next useful action?
3. Is anything important drifting in finance, fitness, nutrition, or goals?

Only data already captured in LifeOS is summarized. Empty modules show a useful setup action instead of invented or noisy metrics.

## Information hierarchy

### 1. Today

The first section contains today's focus, a short list of priorities, and time-sensitive reminders. It is actionable: each item links to the relevant capture or planning flow.

### 2. Next actions

Quick actions provide one-tap entry points for a transaction, body metric, workout, and meal update. On touch devices, actions are large enough for comfortable use and remain visible without opening a menu.

### 3. Signals

Show at most one calm summary card per active domain:

- Finance: current-month net cashflow and the most relevant budget pressure.
- Fitness: next workout or latest body-metric trend.
- Nutrition: today's planned meals and the next preparation step.
- Goals: one goal needing attention soonest.

Cards are hidden when the underlying module has no data, replaced by a compact setup prompt. Apple Health is not required for any MVP card.

### 4. Review

The bottom section links to the weekly review and shows only unresolved items that need a decision. It should never compete with today's focus.

## Responsive behavior

| View | Layout | Interaction rule |
| --- | --- | --- |
| Phone | One column; Today and quick actions first | No horizontal scrolling; cards stack and use compact summaries |
| iPad/tablet | Two columns for signals, one-column Today | Preserve reading order; use generous touch targets and stable card heights |
| Desktop | Two-column content with a narrow action rail | Keep the primary content centered with deliberate right padding |
| Wall mode (later) | Large, low-density grid | Hide sensitive values by default and avoid editable controls |

## Component boundaries for OME-159

- `DashboardPage`: data loading, responsive composition, and empty-state policy.
- `TodayFocusCard`: priorities and time-sensitive reminders.
- `QuickActions`: links to existing create/entry flows.
- `FinancePulseCard`: consumes the finance overview read model.
- `FitnessStatusCard`: consumes fitness summary data.
- `NutritionStatusCard`: consumes meal-plan summary data.
- `GoalReminderCard`: consumes the shared goal/reminder summary.
- `WeeklyReviewPrompt`: links to the review workflow and reports outstanding items.

Each card owns presentation only. Domain queries remain in their module and expose small summary DTOs so the dashboard does not reach into module tables or controllers.

## Content rules

- Prefer one decision or action per card.
- Never show a zero, placeholder chart, or fabricated trend as if it were meaningful.
- Respect `mask_sensitive_data_by_default` for amounts and personal details.
- Keep loading and error states local to a card where possible.
- A failed optional module must not prevent Today or Quick Actions from rendering.
