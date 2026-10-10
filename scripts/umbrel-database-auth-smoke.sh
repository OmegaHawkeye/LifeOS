#!/usr/bin/env bash

set -euo pipefail

readonly project_name="lifeos-umbrel-db-auth-smoke-${GITHUB_RUN_ID:-local}-$$"
readonly container_name="${project_name}-postgres"
readonly database_volume="${project_name}-postgres-data"
readonly postgres_image="postgres:18-alpine@sha256:77f585114c32fbca283dc835b0596f4e52b51b4c6662d7810b2f4084f60a1873"
readonly healthcheck='
db_host="$(hostname -i)"
if PGPASSWORD="$POSTGRES_PASSWORD" psql --no-password --host="$db_host" \
  --username="$POSTGRES_USER" --dbname="$POSTGRES_DB" \
  --command="SELECT 1" >/dev/null 2>&1; then
  exit 0
fi
if ! psql --no-password --username="$POSTGRES_USER" --dbname="$POSTGRES_DB" \
  --command="SELECT 1" >/dev/null 2>&1; then
  exit 1
fi
printf "%s\n%s\n" "$POSTGRES_PASSWORD" "$POSTGRES_PASSWORD" \
  | psql --no-password --username="$POSTGRES_USER" --dbname="$POSTGRES_DB" \
    --no-psqlrc --set=ON_ERROR_STOP=1 \
    --command="\password $POSTGRES_USER" >/dev/null 2>&1 \
  && PGPASSWORD="$POSTGRES_PASSWORD" psql --no-password --host="$db_host" \
    --username="$POSTGRES_USER" --dbname="$POSTGRES_DB" \
    --command="SELECT 1" >/dev/null 2>&1
'

cleanup() {
  docker rm -f "$container_name" >/dev/null 2>&1 || true
  docker volume rm "$database_volume" >/dev/null 2>&1 || true
}

trap cleanup EXIT

wait_for_healthy() {
  for _ in {1..60}; do
    local status
    status="$(docker inspect --format '{{.State.Health.Status}}' "$container_name" 2>/dev/null || true)"

    if [[ "$status" == "healthy" ]]; then
      return 0
    fi

    if [[ "$status" == "unhealthy" ]]; then
      docker logs "$container_name" >&2
      printf 'Postgres healthcheck failed.\n' >&2
      return 1
    fi

    sleep 1
  done

  docker logs "$container_name" >&2
  printf 'Timed out waiting for Postgres healthcheck.\n' >&2
  return 1
}

docker volume create "$database_volume" >/dev/null

docker run --detach \
  --name "$container_name" \
  --health-cmd "$healthcheck" \
  --health-interval 2s \
  --health-timeout 2s \
  --health-retries 5 \
  --health-start-period 1s \
  --env POSTGRES_DB=lifeos \
  --env POSTGRES_USER=lifeos \
  --env POSTGRES_PASSWORD=old-test-password \
  --mount "source=$database_volume,target=/var/lib/postgresql" \
  "$postgres_image" >/dev/null

wait_for_healthy

docker exec "$container_name" sh -ec '
  db_host="$(hostname -i)"
  PGPASSWORD="$POSTGRES_PASSWORD" psql --no-password \
    --host="$db_host" --username="$POSTGRES_USER" --dbname="$POSTGRES_DB" \
    --set=ON_ERROR_STOP=1 \
    --command="CREATE TABLE umbrel_auth_smoke (value integer); INSERT INTO umbrel_auth_smoke VALUES (42);" \
    >/dev/null
'

docker stop "$container_name" >/dev/null
docker rm "$container_name" >/dev/null

docker run --detach \
  --name "$container_name" \
  --health-cmd "$healthcheck" \
  --health-interval 2s \
  --health-timeout 2s \
  --health-retries 5 \
  --health-start-period 1s \
  --env POSTGRES_DB=lifeos \
  --env POSTGRES_USER=lifeos \
  --env POSTGRES_PASSWORD=new-test-password \
  --mount "source=$database_volume,target=/var/lib/postgresql" \
  "$postgres_image" >/dev/null

wait_for_healthy

docker exec "$container_name" sh -ec '
  db_host="$(hostname -i)"
  result="$(PGPASSWORD="$POSTGRES_PASSWORD" psql --no-password \
    --host="$db_host" --username="$POSTGRES_USER" --dbname="$POSTGRES_DB" \
    --tuples-only --no-align --command="SELECT value FROM umbrel_auth_smoke")"
  test "$result" = 42
'

printf 'Umbrel Postgres credential reconciliation preserved the database.\n'
