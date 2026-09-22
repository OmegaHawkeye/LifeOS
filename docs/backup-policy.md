# LifeOS home-server backup policy

## Goals

- Keep backup copies under the owner's control; LifeOS does not require a cloud backup service.
- Make the safe default automatic and understandable for non-technical home-server owners.
- Recover the database and private LifeOS files as a consistent set.

## Defaults

| Setting | Policy |
| --- | --- |
| Schedule | One automatic backup every day |
| Retention | 30 days by default; configurable up to two years where storage permits |
| Recovery point objective (RPO) | No more than 24 hours of data loss, assuming the daily backup succeeded |
| Recovery time objective (RTO) | Restore a usable LifeOS installation within 24 hours; verify this in restore drills |
| Destination | A local destination on the LifeOS server is allowed and must not be blocked during setup |
| Recommended destination | A NAS or second external drive, to protect against failure of the server's primary disk |
| Cloud dependency | None; core backup and restore workflows work without a LifeOS-hosted or third-party cloud service |

The RPO and RTO are targets, not guarantees: actual recovery depends on backup health, hardware, storage speed, and owner access to the backup. Show the last successful backup and any current failure clearly.

The home-server Compose stack runs Laravel's scheduler continuously. The `lifeos:backup:status` command reports the last attempt, last successful backup, and a safe failure message without displaying paths, keys, or personal data.

## Scope and protection

Back up the database and private uploaded files together, with enough application metadata and key material to restore them. Backups must be encrypted. Generate a per-installation recovery key and make it exportable during setup; explain that it must be stored separately from backup media to recover from server loss. The original Laravel `APP_KEY` is also required to decrypt protected application values after a restore; keep it separately in a password manager. Never include secrets in logs or expose backup contents through public paths. OME-173 implements and tests this recovery flow.

## Restore and deletion

OME-173 must provide a repeatable restore drill that restores a backup to a clean LifeOS installation and verifies database records and private files. Deleting an account removes its active data; backup copies may remain until the configured retention period expires, after which they are removed by normal backup rotation.

## Limitations

A backup stored on the same physical disk is useful for accidental deletion or corruption but cannot protect against failure or loss of that disk. LifeOS recommends a NAS or second external drive, but never requires one: setup and scheduled backups remain available with only the home server.
