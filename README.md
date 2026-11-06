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

### Local HTTPS for passkey testing

Passkeys require a secure origin. For a Mac and iPhone on the same Wi-Fi,
use the Mac's Bonjour hostname and a locally trusted certificate:

```bash
brew install mkcert caddy
mkcert -install
mkdir -p .local-https
DEV_HOST="$(scutil --get LocalHostName).local"
mkcert -cert-file ".local-https/${DEV_HOST}.pem" \
  -key-file ".local-https/${DEV_HOST}-key.pem" "${DEV_HOST}"
```

Replace `lifeos.local` and the matching certificate filenames in
`Caddyfile.dev` with `${DEV_HOST}`. Start `pnpm dev` in one
terminal and `pnpm dev:https` in another. Set `APP_URL`, `FRONTEND_URL`,
`LIFEOS_PASSKEY_WEB_URL`, and `LIFEOS_PASSKEY_WEB_ORIGIN` to the HTTPS URL,
and include the hostname and port in `SANCTUM_STATEFUL_DOMAINS`. For the
same-origin proxy, set `VITE_API_BASE_URL=` in `frontend/.env.local`.

Install and trust the mkcert root CA on the iPhone. Find it with
`mkcert -CAROOT`, transfer `rootCA.pem`, install the profile, then enable
full trust under Settings → General → About → Certificate Trust Settings.
Open `https://<mac-hostname>.local:8443` on the iPhone to verify access.

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

## Home-server deployment

The supported Docker Compose setup in `compose.home-server.yaml` runs a versioned LifeOS image, PostgreSQL, and Laravel's scheduler on your server. Publishing a stable SemVer GitHub release builds an `amd64`/`arm64` image in GitHub Container Registry; the release workflow serializes publishing and refuses to reuse an existing version tag. Treat version tags as write-once; package maintainers can still change them directly in the registry. CI smoke-tests a clean install and upgrades from the latest published image (or the base revision before the first image release) before changes merge. The running app stores personal data only in the server's PostgreSQL database and storage volume. Updates contact the registry to download the version you select; LifeOS adds no telemetry or hosted-service dependency. The old `render.yaml` is historical scaffolding and is not a supported deployment target.

### Home-server setup

For installing from the umbrelOS App Store without using a terminal, see the
[Umbrel installation guide](docs/umbrel.md).

1. Download the release's `compose.home-server.yaml` and `.env.example` to a folder on your server, then copy `.env.example` to `.env`. Set `LIFEOS_VERSION` to the release you want, `HOME_SERVER_POSTGRES_PASSWORD` to a unique password, and `APP_URL` to the address used by your devices. Set `APP_KEY` to `base64:` followed by the output of `openssl rand -base64 32`; keep this key in a password manager because it is required to decrypt protected app data after a restore.
2. Optionally set `LIFEOS_BACKUP_HOST_PATH` to a mounted NAS or second drive. The default `./backups` directory is allowed, but it shares the server's disk. Do not forward the HTTP port to the public internet.
3. Start the selected release with `docker compose -f compose.home-server.yaml up -d --wait`. Compose pulls the published image; it does not build LifeOS from source.
4. Open `APP_URL` in a browser and follow the first-run owner and authenticator setup.
5. Create and securely store the backup recovery key with `docker compose -f compose.home-server.yaml exec lifeos php artisan lifeos:backup:key`. Keep this key and `APP_KEY` outside the server and backup drive.

Backups run daily at 02:00 in the configured timezone. Check them in Settings or with `docker compose -f compose.home-server.yaml exec lifeos php artisan lifeos:backup:status`. Restore is intentionally destructive and requires an explicit `--force`; follow the recovery steps in [the backup policy](docs/backup-policy.md).

### Updating and recovering

1. Confirm the latest successful backup in Settings. For a manual backup, run `docker compose -f compose.home-server.yaml exec lifeos php artisan lifeos:backup:run` and confirm it succeeded before continuing.
2. Change `LIFEOS_VERSION` in `.env` to the exact release you want to install.
3. Apply it with `docker compose -f compose.home-server.yaml pull && docker compose -f compose.home-server.yaml up -d --wait`.
4. Confirm the app opens and the backup status is healthy. If the new image does not start, inspect `docker compose -f compose.home-server.yaml logs lifeos` and restore the prior `LIFEOS_VERSION` before restarting.

Never run `docker compose down -v` during an update; it deletes persistent database and app-storage volumes. A previous image can only safely use the upgraded database if its migrations are backward-compatible. If not, restore the database and storage from the same pre-update backup using the original `APP_KEY` and backup recovery key. See [the backup policy](docs/backup-policy.md).
