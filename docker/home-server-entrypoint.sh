#!/bin/sh
set -eu

php artisan migrate --force
exec frankenphp run --config /etc/frankenphp/Caddyfile
