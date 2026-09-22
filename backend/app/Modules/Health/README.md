# Health module

Owns provider-neutral health observations and ingestion workflows.

`GET /api/v1/health/trends?range=30d` provides an owner-scoped summary for the Health screen and main dashboard. Supported ranges are `7d`, `30d`, `90d`, and `ytd`; daily buckets use the application timezone. Steps, active calories, sleep duration, and workout duration are summed per day. Weight uses the most recent reading per day and the latest reading for the range total. Recognized minutes/hours/seconds are normalized for workouts; sleep intervals from Apple Health count only asleep stages, not in-bed or awake intervals. Unknown units remain separate rather than being converted. Every trend includes manual/imported sample counts and its named sources.
