#!/bin/bash
set -euo pipefail

app_directory="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd -P)"
umbrel_root="$(dirname "$app_directory")"
seed_file="${umbrel_root}/db/umbrel-seed/seed"

if [[ ! -s "$seed_file" && -s "${umbrel_root}/../db/umbrel-seed/seed" ]]; then
  seed_file="${umbrel_root}/../db/umbrel-seed/seed"
fi

if [[ ! -s "$seed_file" ]]; then
  printf '%s\n' "LifeOS could not find Umbrel's local app seed; refusing to start without stable encryption credentials." >&2
  exit 1
fi

umbrel_seed="$(<"$seed_file")"

derive_secret() {
  printf '%s' "$1" \
    | openssl dgst -sha256 -hmac "$umbrel_seed" -binary \
    | openssl base64 -A
}

export APP_LIFEOS_APP_KEY="$(derive_secret 'app-lifeos-lifeos-seed-APP_KEY')"
export APP_LIFEOS_DB_PASSWORD="$(derive_secret 'app-lifeos-lifeos-seed-DB_PASSWORD')"
