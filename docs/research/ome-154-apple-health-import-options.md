# OME-154: Apple Health import options

- Date: 2026-09-15
- Scope: Apple-owned APIs and support documentation, plus one representative third-party bridge’s own documentation
- Recommendation: ship user-initiated Apple Health XML upload as the first MVP+1 path; follow with a small native iOS companion using HealthKit

## Executive conclusion

The existing web PWA cannot directly read Apple Health. Apple describes HealthKit as an on-device framework accessed by an app through `HKHealthStore`; setup requires an Xcode HealthKit capability, device availability check, and per-type read/share authorization. [Apple, “Setting up HealthKit”](https://developer.apple.com/documentation/healthkit/setting-up-healthkit) [Apple, `HKHealthStore`](https://developer.apple.com/documentation/healthkit/hkhealthstore)

For the web-first product, the lowest-risk import is: the owner exports all Health data from the iPhone Health app, then uploads the resulting XML archive to `POST /api/v1/health/imports`. Apple documents this export as a built-in iPhone/iPad flow and identifies XML as the inter-app sharing format. [Apple Support, “Share your data in Health on iPhone”](https://support.apple.com/guide/iphone/share-your-health-data-iph5ede58c3d/26/ios) [Apple Support, “Share health data in Health on iPad”](https://support.apple.com/guide/ipad/share-health-data-ipade9e6b160/26/ipados)

This is an occasional, full-export workflow rather than synchronization. A later native companion should use narrowly scoped HealthKit read permissions and anchored/observer queries; Apple documents background delivery, but it requires a background-delivery entitlement and device testing. [Apple, “Executing Observer Queries”](https://developer.apple.com/documentation/healthkit/executing-observer-queries) [Apple, `enableBackgroundDelivery`](https://developer.apple.com/documentation/healthkit/hkhealthstore/enablebackgrounddelivery%28for%3Afrequency%3Awithcompletion%3A%29)

## Option comparison

| Option | What it can do | Client/platform requirement | Product fit | Main risks / work |
| --- | --- | --- | --- | --- |
| Native HealthKit | Read selected HealthKit object types, query samples, and later observe changes. Apple separates read and write permissions and allows the user to grant or deny each type. [Apple, “Authorizing access to health data”](https://developer.apple.com/documentation/healthkit/authorizing-access-to-health-data) [Apple, `requestAuthorization`](https://developer.apple.com/documentation/healthkit/hkhealthstore/requestauthorization%28toshare%3Aread%3A%29) | Native iOS/iPadOS/watchOS app, Xcode entitlement, Info.plist usage strings, physical Apple device for meaningful background testing. [Apple, “Setting up HealthKit”](https://developer.apple.com/documentation/healthkit/setting-up-healthkit) | Best long-term sync and incremental provenance; not deliverable by the current PWA alone | Requires a native target, App Store/signing/review work, permission UX, sync state, retries, and revocation handling |
| Shortcuts | User-composed automations can chain actions and interact with apps/content; Apple documents web API actions and custom App Intents exposed to Shortcuts. [Apple, Shortcuts User Guide](https://support.apple.com/guide/shortcuts/welcome/ios) [Apple, `AppIntent`](https://developer.apple.com/documentation/appintents/appintent) | iPhone/iPad Shortcuts app; a shortcut must be configured and run by the owner. A server endpoint can be the destination of a web-API action, but a reliable Health-specific payload contract must be validated on target iOS versions | Useful as an opt-in automation experiment after XML import; not a dependable first ingestion contract | User setup and action availability vary; no server-side polling of Health; format, pagination, and background execution need device validation |
| Apple Health XML export | Exports all Health and fitness data from Health in XML through the Health app’s “Export All Health Data” flow. [Apple Support, “Share your data in Health on iPhone”](https://support.apple.com/guide/iphone/share-your-health-data-iph5ede58c3d/26/ios) | Any client capable of receiving an owner-selected file; upload can be implemented in the existing PWA | Best MVP+1: no native app, Apple-owned export, reproducible import runs, easy manual consent | Full/large archive, user-initiated and non-continuous; parser must tolerate schema/version variation and avoid treating raw XML as the domain model |
| CSV import | A generic file-ingestion shape that could accept CSV produced by a separate exporter | Web PWA is sufficient, but Apple’s documented Health export flow above is XML, not CSV | Good later escape hatch for selected metrics or other providers; not the canonical Apple Health path | No Apple-documented Health CSV export contract; columns/units/source semantics depend on exporter. Require explicit schema version and mapping rather than “guessing” |
| Third-party bridge (e.g. Terra) | Terra documents Apple Health as mobile-only, with its iOS SDK reading on-device Health data and delivering normalized payloads/webhooks to a backend; it says Apple Health has no web API. [Terra, “Overview”](https://docs.tryterra.co/health-and-fitness-api/getting-started) [Terra, “Apple Health API Integration”](https://tryterra.co/integrations/apple-health) | Native iOS/React Native/Flutter client using the vendor SDK plus vendor account/backend | Potential acceleration when multi-provider support justifies it; not a web-only shortcut | Vendor cost, account/data-processing dependency, SDK permissions/release coupling, contract/privacy review, and still a native client for Apple Health |

## iOS-native versus web/PWA boundary

HealthKit access is an app capability, not an HTTP API. Apple’s framework documentation says apps communicate with the HealthKit store with the user’s permission, and setup requires enabling the HealthKit capability and creating an `HKHealthStore`. [Apple, HealthKit overview](https://developer.apple.com/documentation/healthkit) [Apple, “Setting up HealthKit”](https://developer.apple.com/documentation/healthkit/setting-up-healthkit)

Therefore:

1. The existing React PWA/Laravel deployment can implement XML upload, validation, import-run tracking, normalization, deduplication, provenance, and trend queries.
2. A direct HealthKit connector needs a native iOS/iPadOS application (or a native-capable cross-platform shell). It cannot be implemented solely in the browser or Laravel worker.
3. A bridge such as Terra does not remove this boundary: its own docs classify Apple Health as mobile-only and require its Mobile SDK to read the on-device store. [Terra, “Overview”](https://docs.tryterra.co/health-and-fitness-api/getting-started)

## Consent, privacy, storage, and revocation requirements

For native HealthKit, ask only for the data types needed by a stated feature, separate read from write, and explain the use in the permission strings. Apple says users control each type independently, may grant a limited recent window or full history, and can change permissions later in Settings or Health. [Apple, “Authorizing access to health data”](https://developer.apple.com/documentation/healthkit/authorizing-access-to-health-data) [Apple, “Protecting user privacy”](https://developer.apple.com/documentation/healthkit/protecting-user-privacy)

The app must treat a denied read permission as “no readable data,” not as proof that the store contains no samples: Apple explicitly says the app is not aware when the user denies read access. [Apple, “Protecting user privacy”](https://developer.apple.com/documentation/healthkit/protecting-user-privacy)

Apple’s HealthKit privacy guidance requires clear disclosure, a privacy policy, and prohibits using HealthKit data for advertising; disclosure to third parties is restricted and requires express permission (and a health/fitness service purpose). [Apple, “Protecting user privacy”](https://developer.apple.com/documentation/healthkit/protecting-user-privacy) Apple’s App Review Guidelines additionally require privacy-policy disclosure of collection, uses, sharing, retention/deletion, consent revocation, and deletion requests. [Apple, App Review Guidelines, 5.1](https://developer.apple.com/app-store/review/guidelines/#privacy)

For XML/CSV uploads, the same product controls should apply even though the source is a file rather than the HealthKit API:

- Show exactly what is being imported, why, and which categories are retained.
- Keep the original upload private and attach it to an immutable import run; do not expose it through the PWA service worker or public object URLs.
- Record source, export/import time, parser/schema version, counts, errors, and a content hash for idempotency.
- Offer deletion of the source file, imported samples, and the import-run metadata, with an audit event that does not copy health payloads.
- Make “disconnect/revoke” explicit. Native disconnect disables background delivery and stops reads; Apple documents `disableBackgroundDelivery` and the ability for users to change permissions outside the app. [Apple, `disableBackgroundDelivery`](https://developer.apple.com/documentation/healthkit/hkhealthstore/disablebackgrounddelivery%28for%3Awithcompletion%3A%29) For file imports, revoke means no further processing plus deletion/retention handling for already-ingested data.

## Recommended delivery sequence

### MVP+1: XML upload

Implement the file path first because it fits the accepted web-first architecture and provides real Health data without inventing a native client. Treat XML as an adapter input, not the domain model. Normalize only an initial, useful allowlist (for example steps, active energy, workouts, body mass, sleep, and heart rate if present), preserve source metadata, and make repeat uploads idempotent.

### Follow-up: native HealthKit companion

Add a minimal iOS companion when continuous or low-friction sync is valuable. Start read-only and with a small set of types. Request authorization only at the moment the user enables a specific sync feature; persist the granted scope and sync cursor on-device/server-side without assuming permission remains unchanged. Use anchored queries for incremental changes and observer queries/background delivery where justified. Apple notes that observer handlers signal that a change occurred and another query (such as an anchored query) is needed to retrieve changes. [Apple, `HKObserverQuery`](https://developer.apple.com/documentation/healthkit/hkobserverquery) Background delivery is bounded by a requested frequency and requires the entitlement on iOS 15+/watchOS 8+. [Apple, `enableBackgroundDelivery`](https://developer.apple.com/documentation/healthkit/hkhealthstore/enablebackgrounddelivery%28for%3Afrequency%3Awithcompletion%3A%29)

### Defer: Shortcuts and third-party bridge

Prototype a Shortcuts action only after the canonical import schema exists; it may be a convenient owner-controlled “send today’s selected metrics” workflow, but it needs device/version validation. Consider Terra (or another bridge) only after quantifying the value of multiple wearable providers or continuous delivery against vendor cost and data-processing terms. Terra’s docs confirm the technical shape but also confirm the native mobile dependency for Apple Health. [Terra, “Overview”](https://docs.tryterra.co/health-and-fitness-api/getting-started)

## Proposed follow-up implementation tickets

- **OME-154a — Health import contract:** define `health_imports`, upload limits, status machine, provenance fields, retention/deletion semantics, and `POST /api/v1/health/imports` OpenAPI contract.
- **OME-154b — Apple Health XML parser spike:** fixture-based parser for a representative export; detect archive/XML versions, stream large files, collect warnings, and reject malformed/unsupported input safely.
- **OME-154c — Normalization and idempotency:** map the initial allowlist into Health samples with units/time zones/source metadata; use stable source identifiers/content hashes and never silently overwrite manual records.
- **OME-154d — PWA upload and consent UX:** owner-only file picker, preflight summary, explicit confirmation, progress/result/error UI, and import/delete controls; ensure sensitive responses are not cached by the service worker.
- **OME-154e — Privacy/export/delete verification:** test authorization scope, deletion propagation, audit redaction, private file access, and account export behavior.
- **OME-154f — Native HealthKit feasibility spike (follow-up):** create a non-production iOS target, verify entitlements/usage descriptions, read-only authorization for the initial types, anchored query cursor persistence, and upload authentication to the existing API.
- **OME-154g — HealthKit incremental sync:** implement anchored changes plus deletion handling, observer/background delivery, retry/idempotency, device disconnect/revocation state, and physical-device test coverage.
- **OME-154h — Shortcuts spike (optional):** validate a user-owned shortcut that emits a deliberately small, versioned JSON payload to the API; document supported iOS versions and limitations.
- **OME-154i — Bridge evaluation (optional):** compare Terra and alternatives on supported types, data residency/processing, pricing, webhook guarantees, SDK maintenance, and termination/export plan before adoption.

## Decision record

Adopt **XML upload for the first Apple Health import** and keep the Health module’s import boundary provider-neutral so a future native HealthKit adapter can feed the same application service. Do not make CSV the Apple-specific canonical format, and do not commit to a bridge until native/mobile scope and vendor governance are approved.
