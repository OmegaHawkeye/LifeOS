# ADR 0001: Initial stack and modular architecture

- Status: Accepted
- Date: 2026-09-13
- Decision owners: Julian and the LifeOS project
- Related issues: OME-138, OME-139
- Supersedes: None

## Context

LifeOS is a private, hosted-first personal application for daily planning, finance, fitness, nutrition, health signals, and later external integrations. The MVP is web-first: one owner signs in, manually records finance and fitness data, plans meals, and uses a responsive daily dashboard. Bank synchronization, automated Apple Health access, native mobile applications, and multi-user behavior are not MVP requirements.

The architecture must therefore optimize for a useful web release without closing the path to an iPhone/iPad client, HealthKit, data imports, scheduled work, or durable background processing. It must make private-data ownership explicit and keep domain modules separable while the product is still evolving.

The current Linear milestone order groups work by capability rather than defining the MVP release sequence. In particular, OME-159 requires a useful dashboard before Apple Health, even though the Apple Health milestone appears before Dashboard. The implementation sequence for the first usable release is Foundation, the manual Finance/Fitness/Nutrition slices, and Dashboard MVP. Apple Health follows as MVP+1.

## Decision drivers

- Deliver the responsive PWA MVP before building native clients or synchronization.
- Give future web, iPhone, and iPad clients one stable application API.
- Support careful relational modeling, transactions, imports, queues, schedules, files, and audit trails.
- Keep the first deployment small enough for one maintainer to operate.
- Avoid coupling business rules to HTTP controllers, React components, or external providers.
- Make private records attributable to their owner and exportable from the start.
- Prefer mainstream, supported tools with clear upgrade paths.

## Decision

LifeOS will use a **Laravel API backend, a React web PWA, PostgreSQL, and a later React Native client** in a single repository. The backend is a modular monolith, not a collection of services. The web application and API are developed as separate applications but initially ship from one origin and one versioned release.

### Stack

| Concern | Choice |
| --- | --- |
| Backend | Laravel 13 on PHP 8.4 or a later Laravel-supported PHP release |
| API | JSON REST API under `/api/v1`, documented with OpenAPI 3.1 |
| Web | React, TypeScript in strict mode, Vite, and a web app manifest |
| Web data access | Generated TypeScript API types/client plus TanStack Query |
| Web routing | React Router |
| Styling | Tailwind CSS with repository-owned accessible components |
| Mobile | React Native when a native use case is approved; not scaffolded for the MVP |
| Database | PostgreSQL with Laravel migrations and Eloquent |
| Authentication | Laravel Sanctum |
| Validation | Laravel Form Requests at HTTP boundaries and domain validation in use cases/value objects |
| Background work | Laravel database queue and a worker process from the same application image |
| Scheduled work | Laravel Scheduler, triggered by the hosting platform |
| File storage | Laravel Filesystem; local adapter in development and private S3-compatible storage in production when file features arrive |
| Tests | PHPUnit for backend, Vitest and Testing Library for web, Playwright for critical browser workflows |
| Static analysis and style | PHPStan/Larastan and Laravel Pint; TypeScript, ESLint, and Prettier |
| Deployment | Docker on Render in Frankfurt, with Render Postgres in the same region |
| CI | GitHub Actions running install, formatting checks, lint/static analysis, tests, API-contract checks, and production builds |

OME-140 will pin exact dependency versions and lockfiles to the then-current stable releases. Major upgrades are deliberate changes with passing tests and migrations; dependencies do not float in production.

### Repository shape

```text
backend/                    Laravel application and all server-side modules
  app/Modules/
    Foundation/
    Finance/
    Fitness/
    Nutrition/
    Health/
    Dashboard/
  routes/
  database/migrations/
  tests/
frontend/                   React web PWA
  src/app/                  composition, routing, providers, and shell
  src/modules/              matching feature modules
  src/shared/               technical utilities and reusable UI only
  tests/
contracts/
  openapi.yaml              public client/server contract
docs/
  adr/
  product-brief.md
```

A future React Native application may be added under `mobile/`. OME-140 must not scaffold it because native delivery is outside the MVP.

In production, a multi-stage build compiles the React application and makes it available from the same origin as Laravel. This keeps Sanctum's cookie and CSRF model simple. The API and static web assets may be split into separate services later without changing the API contract.

### Backend module structure

Each backend module uses the same internal layers:

```text
Module/
  Domain/           entities, value objects, policies, and domain events
  Application/      commands, queries, use cases, and public module interfaces
  Infrastructure/   Eloquent persistence and external-provider adapters
  Http/             thin controllers, requests, and API resources
```

This is an organizational boundary inside one Laravel process. It does not require a third-party module framework or independent Composer package per module.

Rules:

1. Controllers authenticate, validate transport input, call one application use case, and transform its result. They do not contain domain workflows.
2. A module may import another module only through that module's documented `Application` interface or published event.
3. A module writes only its own tables. Cross-module changes are performed by calling the owning module.
4. Shared database access, Eloquent model imports, or internal class imports across modules are prohibited.
5. Events that leave a database transaction are recorded through an outbox before queued handling.
6. Queue jobs carry identifiers and minimal metadata, not complete sensitive records.
7. Import and webhook handlers are idempotent and retain source/run status without silently overwriting manual data.

### Frontend module structure

Each directory under `frontend/src/modules/` owns its screens, feature components, queries, mutations, and presentation mapping. It exposes a small public entry point; other feature modules must not import its internal files. The application shell composes routes and providers, while `frontend/src/shared/` contains only domain-neutral UI and technical utilities. Generated API types live outside feature modules and do not replace module-specific view models.

Dashboard composes the public query hooks and summary types of the other frontend modules. It does not reach into their caches, duplicate their mutation logic, or become a global store for domain data. Cross-cutting client state is limited to authenticated identity, settings needed by the shell, theme, and transient UI state.

### Module ownership

| Module | Owns | Publishes or consumes |
| --- | --- | --- |
| Foundation | Identity wrapper, owner profile, settings, generic goals, files, notification preferences/messages, audit events, outbox | User context, settings queries, goal summaries, file and notification services, audit writer |
| Finance | Accounts, categories, transactions, transfers, budgets, subscriptions, savings goals, assets, import metadata | Cash-flow and actionable finance summaries; consumes settings and notifications |
| Fitness | Body metrics, fitness targets, exercises, workout templates/sessions/sets, progress-photo associations | Body/workout trends and next-workout summaries; consumes settings, files, and Health queries |
| Nutrition | Ingredients, recipes, servings, meals, targets, meal plans, prep state, shopping lists | Daily/weekly nutrition summaries; consumes settings and notifications |
| Health | Health samples, sources, import/sync runs, provenance, deduplication, and conflict decisions | Normalized health queries and import results; consumes audit and file services |
| Dashboard | Dashboard preferences and composition rules only | Composes published read models from Foundation, Finance, Fitness, Nutrition, and Health |

Dashboard never becomes the source of truth for another module's facts. It may cache derived read models only when measurement proves that live composition is insufficient.

### Shared concepts

- **Users:** Sanctum/Laravel identity mechanics live in Foundation infrastructure. All personal domain records carry an `owner_id`, even while the product has one owner.
- **Goals:** Foundation owns generic lifecycle and dashboard visibility. Finance savings goals, fitness targets, and nutrition targets remain in their domain modules and may expose a generic goal summary.
- **Files:** Foundation owns storage metadata, authorization, retention, export, and deletion. Feature modules own the association and meaning of a file.
- **Notifications:** Foundation owns channels, preferences, delivery attempts, and quiet defaults. Modules request notification intent; they do not send directly.
- **Settings:** Foundation owns timezone, locale, currency, units, theme, and privacy defaults. Modules may add domain-specific preferences behind their own interface.
- **Audit events:** Foundation provides an append-only audit writer for security-relevant and destructive actions. Audit records contain safe metadata and references, not copied sensitive payloads.
- **API identity:** The authenticated owner/device context is established once at the boundary and passed explicitly to application use cases.

### API and authentication

- The web PWA uses Sanctum's stateful cookie authentication and CSRF protection from the same origin.
- Open self-registration is disabled. The initial owner is provisioned through an explicit deployment command.
- OME-141 must add rate limiting, secure cookie settings, session revocation, recovery behavior, and a second factor before real sensitive data is used.
- A later React Native client uses revocable, device-named Sanctum tokens stored in the platform secure keychain. Token abilities are least-privilege and server authorization still checks record ownership.
- `/api/v1` is the contract for both first-party clients. Breaking changes require a new version or a coordinated backward-compatible migration.
- `contracts/openapi.yaml` is committed. Generated TypeScript types must be reproducible and checked for drift in CI.

### PWA behavior

The web client includes a standards-based manifest and a narrowly scoped service worker. Versioned static assets may be cached for installability and resilient startup. Authenticated API requests use network-first behavior and sensitive API responses are not persisted by the service worker. The MVP has no offline mutations, background synchronization, or conflict resolution; when the network is unavailable, write actions fail visibly and preserve the user's unsent form state only in memory.

### External integrations

External systems connect through adapters owned by the relevant module:

```text
external source
  -> authenticated upload, OAuth callback, or webhook
  -> module import boundary
  -> immutable import/sync run
  -> queued validation and normalization
  -> idempotent domain write
  -> published summary for Dashboard
```

Provider payloads do not become the domain model. Adapters map them into normalized commands while retaining only the provenance needed to diagnose, deduplicate, revoke, or re-import.

#### Apple Health

The initial architecture does not assume that the web app or Laravel can access HealthKit. HealthKit access occurs on an Apple device and requires an entitled application plus explicit permission per data type.

OME-154 will compare native HealthKit, Shortcuts, Apple Health export, CSV, and third-party bridges and select the first MVP+1 import path. Every option enters the same Health application service:

```text
Apple export upload OR later native HealthKit bridge
  -> POST /api/v1/health/imports
  -> Health import run and queued batch processing
  -> validate, deduplicate, normalize, and record provenance
  -> health samples and reusable trend queries
```

If native HealthKit is selected, a React Native iPhone/iPad client uses a native Swift/HealthKit bridge. It reads only authorized sample types, maintains an incremental cursor/anchor, and sends bounded encrypted batches. Laravel owns authentication, ingestion, retries, conflict handling, audit, and downstream queries. Manual Fitness data is never silently replaced.

#### Other integrations

- Bank data uses manual CSV first; a future PSD2/Open Banking adapter uses provider OAuth, scoped tokens, webhooks, and the same import-run pattern.
- Calendar and reminders use an adapter for a selected OAuth/CalDAV/ICS source only after a concrete workflow requires it.
- Nutrition catalogs and barcode providers remain optional adapters; cached values retain provider and retrieval metadata.
- Email or web push is requested through Foundation notifications and delivered by queued channel adapters.

### Background jobs and scheduling

The MVP uses PostgreSQL-backed Laravel queues to avoid operating Redis before it is justified. The web and worker processes run the same versioned application image. Jobs define retry/backoff behavior, timeouts, idempotency keys, and observable failure states.

Laravel Scheduler triggers recurring review/reminder work and maintenance. Render invokes the scheduler; business schedules use the owner's stored timezone and are converted explicitly rather than relying on server local time.

Redis and Horizon are an allowed later migration when queue volume, latency, or observability demonstrates a need. They are not bootstrap dependencies.

### Private data and operations

- PostgreSQL and application services run in the same Frankfurt region and communicate through private networking where available.
- Database credentials and provider tokens are server-only secrets. The browser never connects directly to PostgreSQL or third-party private APIs.
- Authorization is enforced in application use cases, not only hidden navigation or route middleware.
- Production logs, traces, queue payloads, analytics, and error reports exclude personal values by default.
- Sensitive transport uses TLS. Production storage and backups use provider encryption controls.
- A paid PostgreSQL plan with point-in-time recovery is required before storing real personal data.
- Nightly encrypted logical backups must be copied to an independent EU-hosted target before the system is considered the sole source of truth.
- Export and deletion are use cases with authorization and audit, not direct database scripts.
- File objects are private by default and accessed only through short-lived authorized responses.

## Considered alternatives

### Next.js full-stack modular monolith

This offered the fastest one-language web MVP and good PWA support. It was rejected because a durable client-neutral API, native clients, imports, queues, schedules, and operational data workflows are credible long-term requirements. Laravel provides these backend capabilities as a more cohesive default. The additional PHP/TypeScript boundary is accepted deliberately.

### Laravel with Inertia and React

This would reduce initial API and client-state work. It was rejected as the primary interface because the web app would not continuously exercise the same API intended for future native clients. React remains independently deployable and consumes `/api/v1` from the first slice.

### Laravel API with Vue web

Vue is technically suitable. React was selected because React Native is the likely native client and the two clients can share TypeScript API code, validation helpers, query conventions, design tokens, and developer knowledge. Cross-platform component sharing is optional, not a goal.

### Native-first or local-first application

This conflicts with the approved hosted-first, web-first MVP and introduces offline storage, synchronization, conflict resolution, and Apple platform delivery before the manual workflows are proven.

### Microservices by domain

Independent services would enforce boundaries physically but add deployments, distributed transactions, tracing, and operational overhead for one owner and maintainer. The modular monolith gives explicit ownership without those costs and preserves extraction points if scale ever demands them.

### Backend-as-a-Service as the domain layer

A BaaS could accelerate authentication and CRUD but would place authorization and evolving cross-module rules close to provider-specific data APIs. Managed infrastructure may still be used, but LifeOS domain behavior remains in application-owned Laravel code and portable PostgreSQL schemas.

## Consequences

### Positive

- Web and future mobile clients share one explicit API.
- Laravel supplies mature primitives for data-heavy modules, imports, queues, schedules, notifications, and files.
- React fits the PWA now and reduces the conceptual gap to React Native later.
- A single database and deployable codebase keep operations understandable.
- Module ownership, provenance, audit, and export constraints exist before sensitive data accumulates.

### Costs and risks

- The repository uses both PHP/Composer and TypeScript/pnpm.
- API contracts and generated client types add discipline and build steps.
- The browser and server cannot share domain types directly; OpenAPI and behavioral tests must prevent drift.
- Serving two client technologies does not make UI code universally reusable.
- Laravel module boundaries rely on conventions and architecture tests because they are not separate processes.

## Bootstrap contract for OME-140

OME-140 can proceed without another stack decision. It must:

1. Create `backend/` with Laravel 13, PHP 8.4+, PostgreSQL configuration, Sanctum, queue tables, PHPUnit, Pint, and PHPStan/Larastan.
2. Create `frontend/` with React, strict TypeScript, Vite, React Router, TanStack Query, Tailwind CSS, Vitest, Testing Library, Playwright, ESLint, and Prettier.
3. Add the six backend and frontend module directories, with boundary documentation and no speculative domain implementation.
4. Add `contracts/openapi.yaml` with API metadata, authentication schemes, error shape, and a minimal authenticated owner-profile contract; expose infrastructure readiness separately.
5. Generate the TypeScript API types reproducibly and fail CI when generated output drifts.
6. Provide Docker-based local PostgreSQL, typed environment examples, and documented install/run/test/build commands for both applications.
7. Produce a production Docker build that compiles the web app and serves it with the Laravel application from one origin.
8. Add CI for backend and frontend format checks, static analysis/linting, tests, contract generation, and builds.
9. Add a Render blueprint or equivalent documented configuration for a Frankfurt web service, worker, scheduler trigger, and PostgreSQL without provisioning production resources yet.
10. Commit no secrets, production data, private paths, or real personal fixtures.
11. Add an automated boundary check that rejects imports of another backend or frontend module's internal files.

## Deferred decisions

These are deliberately delegated and do not reopen the initial stack:

- OME-141: detailed owner provisioning, second factor, session recovery, and navigation design.
- OME-142/146/150: domain-specific data types and invariants.
- OME-148: exact production object-storage provider and sensitive-media retention.
- OME-154: first Apple Health import mechanism and whether/when to create the React Native app.
- Future integration tickets: bank, calendar, nutrition-provider, and notification vendors.

## References

- [LifeOS product brief](../product-brief.md)
- [Laravel as an API backend](https://laravel.com/framework/docs)
- [Laravel Sanctum](https://laravel.com/docs/13.x/sanctum)
- [Laravel queues](https://laravel.com/docs/13.x/queues)
- [Laravel task scheduling](https://laravel.com/docs/13.x/scheduling)
- [Apple HealthKit](https://developer.apple.com/documentation/healthkit)
- [Apple HealthKit authorization](https://developer.apple.com/documentation/healthkit/authorizing-access-to-health-data)
- [Render regions](https://render.com/docs/regions)
- [Render Postgres backups](https://render.com/docs/postgresql-backups)
