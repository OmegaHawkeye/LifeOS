# OME-154 — Apple Health import architecture

**Decision:** Build the first Apple Health integration as an iOS/iPadOS companion app with a narrow, read-only HealthKit adapter. Keep the Laravel API and web/PWA as the storage, review, and dashboard layer. Use a file import fallback (Health export XML first, CSV only for explicitly supported sources) while the native adapter is being developed.

## Findings

| Path | iOS-native work | Web/PWA-only feasibility | Assessment |
| --- | --- | --- | --- |
| HealthKit | Required: HealthKit capability, native permission sheet, `HKHealthStore`, typed queries | Not possible in a browser/PWA; iPadOS 17+ has its own store | Best long-term experience and incremental sync, but requires an Apple platform target and App Store privacy work. |
| Shortcuts export | User configures and runs a Shortcut; no native app required | Web app can accept the generated file or payload | Useful bridge/prototype, but user-operated and not a dependable background sync contract. |
| Health XML export | No native app required; user exports from Health and uploads the archive | Fully compatible with a web upload endpoint and queued parser | Best MVP+1 fallback: user-controlled, auditable, and independent of Apple entitlements; large files require streaming and an import job. |
| CSV import | Depends on the exporting app/source | Fully compatible with web upload | Not a canonical Apple Health export format; support only documented source-specific CSV schemas. |
| Third-party bridge | Usually external account/app plus consent and provider-specific API | Web API integration is possible | Defer: adds vendor availability, credentials, privacy, and data residency risk without improving the first-party baseline. |

Apple describes HealthKit as a protected, permissioned store and requires an app to enable the HealthKit capability, verify availability, and request access for the specific types it reads or writes ([Setting up HealthKit](https://developer.apple.com/documentation/healthkit/setting-up-healthkit), [Authorizing access](https://developer.apple.com/documentation/HealthKit/authorizing-access-to-health-data)). A web/PWA cannot directly call those APIs. Apple also notes that iPadOS 17 and later has a HealthKit store, while earlier iPadOS versions cannot read or write one ([About HealthKit](https://developer.apple.com/documentation/healthkit/about-the-healthkit-framework?language=_8)).

Permissions are granular and can be changed outside the app. Apple intentionally does not reveal a simple “read denied” result; the app may see no samples, and the user can limit the earliest readable date ([Authorizing access](https://developer.apple.com/documentation/HealthKit/authorizing-access-to-health-data), [HKAuthorizationStatus](https://developer.apple.com/documentation/healthkit/hkauthorizationstatus)). The adapter must therefore treat permissions as a capability that can disappear, record the requested/readable types and earliest date, and make sync idempotent.

HealthKit data is sensitive. Apple requires clear health/fitness purpose, usage descriptions, a privacy policy, and no advertising, sale, or third-party disclosure without express permission ([Protecting user privacy](https://developer.apple.com/documentation/healthkit/protecting_user_privacy?changes=latest_min__8_3_7&language=objc), [HealthKit HIG](https://developer.apple.com/design/human-interface-guidelines/healthkit/)). The app should request read access just in time, read only the initial types, encrypt transport/storage, support deletion/export, and revoke future sync when the user disconnects.

## MVP+1 import path

1. **First deliverable:** web upload of an Apple Health export XML archive. Parse asynchronously, validate the archive and supported record types, deduplicate by source + external identifier (or a deterministic sample fingerprint), and show imported/skipped/error counts.
2. **Native follow-up:** iOS/iPadOS companion app using read-only HealthKit for steps, weight, sleep, workouts, and active energy. It sends normalized batches to the existing API; no write access is needed initially.
3. **Fallback:** keep the XML upload available for devices without the companion app and for recovery/backfill. Do not make Shortcuts or a third-party bridge a core dependency.

## Required follow-up tickets

- Model health samples, source metadata, sync runs, deduplication, and manual-vs-import conflict rules.
- Implement authenticated XML upload, streaming parsing, validation, idempotent import, and an import summary UI.
- Create the native HealthKit adapter with capability/Info.plist declarations, just-in-time authorization, typed queries, incremental anchors, and revocation handling.
- Add privacy controls: source disconnect, delete imported data, export, audit log, retention policy, and user-facing privacy copy.

## Non-goals

Clinical records, HealthKit write-back, automatic background sync, bank-style third-party bridges, and broad support for arbitrary CSV schemas are out of scope for MVP+1.
