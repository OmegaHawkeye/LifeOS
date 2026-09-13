# LifeOS

LifeOS is a private, owner-first personal operating system. This repository contains the Laravel API and the React web PWA defined in [ADR 0001](docs/adr/0001-initial-stack-and-modular-architecture.md).

## Prerequisites

- PHP 8.4 or newer and Composer 2
- Node.js 24 or newer and pnpm 11
- A running Docker-compatible runtime with Docker Compose

Laravel Herd is optional. The documented workflow only relies on the tools above, so every checkout uses the same PostgreSQL service and project commands.

On macOS, Docker Desktop works as-is. With the lighter Homebrew/Colima setup used here, start the runtime with `colima start` before running the setup command.

## First setup

```bash
pnpm setup
```

The setup command creates local `.env` files from the committed examples, installs dependencies, starts PostgreSQL, generates the Laravel application key, runs migrations, and generates the TypeScript API schema. The example database credentials are local-development defaults, not secrets.

## Run locally

```bash
pnpm dev
```

- Web PWA: http://localhost:5173
- API readiness: http://localhost:8000/api/v1/readiness

Stop both development servers with `Ctrl+C`. Stop PostgreSQL separately with `docker compose down`; its named volume keeps local data.

## Quality commands

```bash
pnpm format
pnpm lint
pnpm test
pnpm build
pnpm check
```

`pnpm check` is the complete pre-commit check. It verifies formatting, static analysis, module boundaries, OpenAPI drift, backend and frontend tests, and the production web build.

When `contracts/openapi.yaml` changes, run `pnpm contract:generate` and commit the generated `frontend/src/api/schema.d.ts`. `pnpm contract:check` fails if those files drift apart.

## Repository shape

```text
backend/     Laravel API modular monolith
contracts/   Client-neutral OpenAPI contract
docs/        Product and architecture decisions
frontend/    React, TypeScript, Vite and Tailwind PWA
scripts/     Cross-project workflow and architecture checks
```

Domain code lives below each application's `Modules` directory. Cross-module calls must use a target module's public application interface; `pnpm lint` enforces that boundary.

## Deployment blueprint

`Dockerfile` builds the React PWA and Laravel API into one FrankenPHP image. `render.yaml` describes the future Frankfurt web, worker, scheduler, and private PostgreSQL resources, but does not provision them.

Before applying the blueprint, generate a production key with `php backend/artisan key:generate --show`. Render prompts for `APP_KEY` on all three services; enter that same generated value each time. Set the web service's `APP_URL` to its final HTTPS origin. Do not deploy personal data until the PostgreSQL backup and point-in-time-recovery policy has been reviewed.
