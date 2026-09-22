# LifeOS

LifeOS is a free, open-source personal dashboard designed to run on your home server, with a web PWA for computers and wall tablets. Personal data stays on infrastructure you control. The current stack and product model are documented in [ADR 0002](docs/adr/0002-self-hosted-home-server.md); [ADR 0001](docs/adr/0001-initial-stack-and-modular-architecture.md) records the superseded hosted-first decision.

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

### iPhone and iPad app

```bash
cp mobile/.env.example mobile/.env
pnpm --dir mobile ios
```

The simulator uses the default `http://localhost:8000/api/v1` API address. For a physical device on the development Mac's Wi-Fi, start the API on the LAN with `LIFEOS_DEV_HOST=0.0.0.0 pnpm dev`, then set `EXPO_PUBLIC_LIFEOS_API_URL` in `mobile/.env` to the Mac's LAN address, for example `http://192.168.1.20:8000/api/v1`. Keep the phone and Mac on the same network and allow LifeOS local-network access when prompted. The home-server Compose setup defaults to port `8080`. The native app stores its access and refresh credentials in the platform secure store; it does not use browser storage.

Run the mobile tests with `pnpm --dir mobile test` and its TypeScript check with `pnpm --dir mobile typecheck`.

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

## Changelog

`CHANGELOG.de.md` and `CHANGELOG.en.md` are the German and English changelogs. Use one `# MAJOR.MINOR.PATCH` heading per release and up to four concise bullets per version; both files must have matching versions and entry counts. Linear references belong in commits, not changelog entries. Run `pnpm changelog:check` to validate them; the check is included in `pnpm check`.

## Repository shape

```text
backend/     Laravel API modular monolith
contracts/   Client-neutral OpenAPI contract
docs/        Product and architecture decisions
frontend/    React, TypeScript, Vite and Tailwind PWA
mobile/      React Native (Expo) iPhone/iPad app
scripts/     Cross-project workflow and architecture checks
```

Domain code lives below each application's `Modules` directory. Cross-module calls must use a target module's public application interface; `pnpm lint` enforces that boundary.

## Current deployment status

An initial Docker Compose setup for a home server is available in `compose.home-server.yaml`; it runs LifeOS, PostgreSQL, and Laravel's scheduler locally. The old `render.yaml` hosted deployment blueprint is retained as historical scaffolding and is not the supported product deployment target. Do not use it for personal LifeOS data.

### Home-server setup

1. Copy `.env.example` to `.env`. Set `HOME_SERVER_POSTGRES_PASSWORD` to a unique password and `APP_URL` to the address used by your devices. Set `APP_KEY` to `base64:` followed by the output of `openssl rand -base64 32`; keep this key in a password manager because it is required to decrypt protected app data after a restore.
2. Optionally set `LIFEOS_BACKUP_HOST_PATH` to a mounted NAS or second drive. The default `./backups` directory is allowed, but it shares the server's disk. Do not forward the HTTP port to the public internet.
3. Start the local stack with `docker compose -f compose.home-server.yaml up -d --build`.
4. Create the single owner with `docker compose -f compose.home-server.yaml exec lifeos php artisan lifeos:owner`.
5. Create and securely store the separately displayed backup recovery key with `docker compose -f compose.home-server.yaml exec lifeos php artisan lifeos:backup:key`. Keep both this key and `APP_KEY` outside the server and backup drive.

Backups run daily at 02:00 in the configured timezone. Check them with `docker compose -f compose.home-server.yaml exec lifeos php artisan lifeos:backup:status`. Restore is intentionally destructive and requires an explicit `--force`; follow the recovery steps in [the backup policy](docs/backup-policy.md).
