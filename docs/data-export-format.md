# LifeOS owner-data export

The authenticated `GET /api/v1/account/export` endpoint downloads a ZIP archive named `lifeos-export-YYYY-MM-DD.zip`. The archive is generated on demand and the temporary server-side copy is removed after the response is sent.

## Archive contents

- `manifest.json` identifies the format (`lifeos-owner-data-export`), schema version, generation time, `data.json`, and all included file paths.
- `data.json` contains the owner's profile and settings plus structured records grouped under `finance`, `fitness`, `health`, `nutrition`, `routines`, and `weekly_reviews`.
- `files/progress-photos/` contains each private fitness progress photo in its original image format. The corresponding `fitness.progress_photos` record contains a `file_archive_path` pointing to that file.

The JSON retains record IDs, foreign keys, timestamps, and supported relationships to keep the export useful for migration or re-import tooling. A consumer should inspect `schema_version` before interpreting the format; schema changes that affect meaning require a version change.

Authentication credentials, password hashes, two-factor secrets, access tokens, server credentials, health sync cursors, and sync error details are not included. The endpoint is read-only and responds with `Cache-Control: private, no-store`.

## Account deletion

The authenticated `DELETE /api/v1/account` endpoint permanently removes the owner account and all owner-scoped records, settings, password-reset tokens, active sessions, and personal access tokens. The Fitness module removes the owner's private progress-photo directory as part of the operation. The request requires the current password and an exact match for the account email; deletion cannot be undone.

Account deletion removes data from the active application database and storage. Backup retention is managed separately, so copies in backups, if any, may remain until those backups expire; account deletion does not immediately purge backup media.
