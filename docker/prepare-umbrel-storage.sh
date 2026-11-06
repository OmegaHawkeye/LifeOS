#!/bin/sh
set -eu

storage_root=/app/storage

mkdir -p \
  "$storage_root/app/private" \
  "$storage_root/framework/cache" \
  "$storage_root/framework/sessions" \
  "$storage_root/framework/views" \
  "$storage_root/logs" \
  /backups

permissions_marker="$storage_root/.lifeos-permissions-v1"

if [ ! -f "$permissions_marker" ]; then
  chown -R 1000:1000 "$storage_root"
  find "$storage_root" -type d -exec chmod u+rwx {} +
  touch "$permissions_marker"
fi

chown 1000:1000 \
  "$storage_root" \
  "$storage_root/app" \
  "$storage_root/app/private" \
  "$storage_root/framework" \
  "$storage_root/framework/cache" \
  "$storage_root/framework/sessions" \
  "$storage_root/framework/views" \
  "$storage_root/logs" \
  /backups \
  "$permissions_marker"

chmod u+rwx \
  "$storage_root" \
  "$storage_root/app" \
  "$storage_root/app/private" \
  "$storage_root/framework" \
  "$storage_root/framework/cache" \
  "$storage_root/framework/sessions" \
  "$storage_root/framework/views" \
  "$storage_root/logs" \
  /backups
