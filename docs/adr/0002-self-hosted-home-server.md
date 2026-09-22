# ADR 0002: Self-hosted home-server product model

- Status: Accepted
- Date: 2026-09-21
- Decision owners: Julian and the LifeOS project
- Related issues: OME-172, OME-173, OME-174, OME-175, OME-176
- Supersedes: The hosted-first deployment and backup assumptions in ADR 0001

## Context

LifeOS is a free, open-source personal dashboard primarily intended for a wall-mounted tablet. The owner wants personal data to stay on infrastructure they control, rather than being sent to a LifeOS-operated cloud. The product must still be approachable for non-technical users who run a home server.

The existing Laravel API and React PWA remain useful: the home server is the data authority and serves clients on the home network. Future iOS/iPadOS clients can use Apple's HealthKit permissions on-device and send only explicitly selected records directly to that user's LifeOS server. Android health support can follow the equivalent Health Connect permission model. These platform integrations do not justify a LifeOS cloud backend.

## Decision

- LifeOS is self-hosted on the user's home server; there is no required LifeOS-hosted account, database, relay, analytics, or storage service.
- The home server is the source of truth. Browser and native clients connect directly to it; any future remote access is configured by the owner and connects to their server, not through a LifeOS data proxy.
- Core workflows must not require internet access. The software may access platform health APIs only through explicit device permissions, and sync selected data directly to the owner's server.
- Setup, updates, and recovery must be understandable to non-technical home-server owners. Exact packaging and remote-access safety remain implementation decisions.
- Backups on the home server are supported and never blocked by a missing second device. Setup should recommend a NAS or a second external drive as an independent target because it also protects against failure of the server's primary disk.
- Backups run daily, with a 30-day default retention configurable up to two years where storage permits. The recovery-point objective is at most 24 hours; the recovery-time objective is restoration within 24 hours, to be verified in a restore drill. Detailed policy is in [backup policy](../backup-policy.md); automation and measured restore validation are OME-173.

## Consequences

- Deployment documentation and future defaults must not assume Render or another hosted provider.
- Backup features must work with local storage and should make the difference between same-disk and independent backups clear without preventing setup.
- Health integrations require native-client permission, provenance, revocation, deduplication, and direct-to-server sync design.
- The project must document security and update responsibilities that were previously delegated to a hosting provider.

## Rejected alternatives

### LifeOS-hosted cloud as the default

Rejected because sending personal records to an operator-managed service conflicts with the product's local-data promise.

### Require an external backup target

Rejected because making a NAS or second disk a prerequisite would undermine straightforward onboarding. It remains the recommended safer configuration, not a hard requirement.
