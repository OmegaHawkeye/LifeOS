# Fitness body metrics contract

Status: implementation brief | Related issue: OME-146 | Updated: 2026-09-17

The Fitness module stores manual body measurements separately from imported Health samples. Every record is owner-scoped and carries source metadata so a future Apple Health import can coexist without overwriting manual history.

## Body metric record

- `metric_type`: `weight`, `body_fat`, `waist`, `chest`, `hip`, `arm`, or `custom`
- `value` and `unit`: normalized numeric value plus explicit unit
- `measured_at`: user-local measurement timestamp
- `notes`: optional progress note
- `source`: `manual` by default, future values may be `apple_health` or another integration
- `external_id`: nullable stable source identifier for idempotent imports

Manual records are never replaced by imported records. Imported records with the same source and external identifier are idempotent; conflicting values remain separate and retain their provenance.

## Fitness goal

- goal metric and target value/unit
- optional start value and deadline
- status: `active`, `paused`, `completed`, or `abandoned`
- owner-scoped update history

## Read models

The module will expose a latest-value summary and trend points for 7, 30, and 90-day ranges. The dashboard consumes only this summary contract, never Fitness tables directly.
