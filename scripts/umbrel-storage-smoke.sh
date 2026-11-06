#!/usr/bin/env bash

set -euo pipefail

if [[ $# -ne 1 ]]; then
  printf 'Usage: %s <candidate-image-tag>\n' "$0" >&2
  exit 2
fi

readonly image="ghcr.io/omegahawkeye/lifeos:$1"
readonly project_name="lifeos-umbrel-storage-smoke-${GITHUB_RUN_ID:-local}-$$"
readonly storage_volume="${project_name}-storage"
readonly backup_volume="${project_name}-backups"

cleanup() {
  docker volume rm "$storage_volume" "$backup_volume" >/dev/null 2>&1 || true
}

trap cleanup EXIT

docker volume create "$storage_volume" >/dev/null
docker volume create "$backup_volume" >/dev/null

docker run --rm --user 0:0 \
  --mount "source=$storage_volume,target=/app/storage" \
  --mount "source=$backup_volume,target=/backups" \
  --entrypoint /bin/sh "$image" -ec '
    mkdir -p /app/storage/app/private
    printf old > /app/storage/app/private/old-root-owned-file
    chmod 600 /app/storage/app/private/old-root-owned-file
  '

docker run --rm --user 0:0 \
  --mount "source=$storage_volume,target=/app/storage" \
  --mount "source=$backup_volume,target=/backups" \
  --entrypoint /usr/local/bin/lifeos-prepare-umbrel-storage "$image"

docker run --rm --user 1000:1000 \
  --mount "source=$storage_volume,target=/app/storage" \
  --mount "source=$backup_volume,target=/backups" \
  --entrypoint /bin/sh "$image" -ec '
    printf fixed >> /app/storage/app/private/old-root-owned-file
    printf log > /app/storage/logs/runtime.log
    printf view > /app/storage/framework/views/runtime.php
    printf backup > /backups/runtime.zip
    test -f /app/storage/.lifeos-permissions-v1
  '

printf 'Umbrel storage permissions passed for %s.\n' "$image"
