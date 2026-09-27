#!/usr/bin/env bash

set -euo pipefail

if [[ $# -ne 2 ]]; then
  printf 'Usage: %s <base-image-tag> <candidate-image-tag>\n' "$0" >&2
  exit 2
fi

readonly base_version="$1"
readonly candidate_version="$2"
readonly repository_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
readonly temporary_directory="$(mktemp -d)"
readonly project_name="lifeos-smoke-${GITHUB_RUN_ID:-local}-$$"
readonly compose_file="$repository_root/compose.home-server.yaml"
readonly cookie_file="$temporary_directory/cookies.txt"
readonly backup_directory="$temporary_directory/backups"
readonly port="${LIFEOS_SMOKE_PORT:-18080}"
environment_file="$temporary_directory/.env"

compose() {
  docker compose \
    --project-name "$project_name" \
    --env-file "$environment_file" \
    --file "$compose_file" \
    "$@"
}

write_environment() {
  local version="$1"

  printf '%s\n' \
    'APP_KEY=base64:AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=' \
    "APP_URL=http://127.0.0.1:$port" \
    "LIFEOS_PORT=$port" \
    "LIFEOS_VERSION=$version" \
    'HOME_SERVER_POSTGRES_PASSWORD=smoke-test-only-not-a-secret' \
    "LIFEOS_BACKUP_HOST_PATH=$backup_directory" \
    "SANCTUM_STATEFUL_DOMAINS=localhost,localhost:$port,127.0.0.1,127.0.0.1:$port" \
    > "$environment_file"
}

cleanup() {
  local exit_code=$?

  if [[ $exit_code -ne 0 ]]; then
    compose logs || true
  fi

  compose down --volumes --remove-orphans || true
  rm -rf "$temporary_directory"
  exit "$exit_code"
}

check_stack() {
  compose up --detach --wait
  compose exec --no-TTY lifeos curl --fail --silent --show-error \
    http://127.0.0.1:8080/api/v1/readiness
  local migration_status

  migration_status="$(compose exec --no-TTY lifeos php artisan migrate:status --no-interaction --no-ansi)"
  printf '%s\n' "$migration_status"
  if [[ "$migration_status" == *Pending* ]]; then
    printf 'The application still has pending database migrations.\n' >&2
    exit 1
  fi
}

trap cleanup EXIT
mkdir -p "$backup_directory"

write_environment "$base_version"
check_stack

app_url="http://127.0.0.1:$port"
setup_status="$(curl --fail --silent --show-error "$app_url/api/v1/setup/status")"
if [[ "$setup_status" != *'"required":true'* ]]; then
  printf 'A clean install did not report that initial owner setup is required.\n' >&2
  exit 1
fi

curl --fail --silent --show-error \
  --cookie-jar "$cookie_file" \
  "$app_url/sanctum/csrf-cookie" >/dev/null
raw_xsrf_token="$(awk '$6 == "XSRF-TOKEN" { print $7 }' "$cookie_file")"
if [[ -z "$raw_xsrf_token" ]]; then
  printf 'Could not obtain a CSRF cookie for the first-run setup smoke test.\n' >&2
  exit 1
fi
xsrf_token="$(node -e 'process.stdout.write(decodeURIComponent(process.argv[1]))' "$raw_xsrf_token")"

curl --fail --silent --show-error \
  --cookie "$cookie_file" \
  --cookie-jar "$cookie_file" \
  --header 'Accept: application/json' \
  --header "Origin: $app_url" \
  --header "Referer: $app_url/setup" \
  --header "X-XSRF-TOKEN: $xsrf_token" \
  --header 'Content-Type: application/json' \
  --data '{"name":"Smoke Test Owner","email":"smoke@example.test","password":"a safe smoke test password","password_confirmation":"a safe smoke test password"}' \
  "$app_url/api/v1/setup/owner" >/dev/null

setup_status="$(curl --fail --silent --show-error "$app_url/api/v1/setup/status")"
if [[ "$setup_status" != *'"required":false'* ]]; then
  printf 'First-run setup remained available after creating the smoke-test owner.\n' >&2
  exit 1
fi

compose exec --no-TTY lifeos php -r \
  'file_put_contents("/app/storage/app/compose-upgrade-marker", "preserved")'

write_environment "$candidate_version"
check_stack

setup_status="$(curl --fail --silent --show-error "$app_url/api/v1/setup/status")"
if [[ "$setup_status" != *'"required":false'* ]]; then
  printf 'Owner data did not persist after the Compose upgrade.\n' >&2
  exit 1
fi

storage_marker="$(compose exec --no-TTY lifeos php -r \
  'echo file_get_contents("/app/storage/app/compose-upgrade-marker")')"
if [[ "$storage_marker" != 'preserved' ]]; then
  printf 'Application storage did not persist after the Compose upgrade.\n' >&2
  exit 1
fi

printf 'Clean install and upgrade smoke test passed (%s -> %s).\n' \
  "$base_version" "$candidate_version"
