FROM node:24-bookworm-slim AS web

WORKDIR /build/frontend
RUN npm install --global pnpm@11.18.0
COPY frontend/package.json frontend/pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile
COPY frontend/ ./
RUN pnpm build

FROM composer:2 AS backend

WORKDIR /app
COPY backend/ ./
RUN composer install \
    --no-dev \
    --no-interaction \
    --no-progress \
    --prefer-dist \
    --optimize-autoloader

FROM dunglas/frankenphp:1.12.7-php8.4-bookworm

RUN apt-get update \
    && apt-get install -y --no-install-recommends ca-certificates curl \
    && install -d /usr/share/keyrings \
    && curl -fsSLo /usr/share/keyrings/postgresql.asc https://www.postgresql.org/media/keys/ACCC4CF8.asc \
    && printf 'deb [signed-by=/usr/share/keyrings/postgresql.asc] https://apt.postgresql.org/pub/repos/apt bookworm-pgdg main\n' > /etc/apt/sources.list.d/pgdg.list \
    && apt-get update \
    && apt-get install -y --no-install-recommends postgresql-client-18 \
    && pg_dump --version | grep -F '18.' \
    && pg_restore --version | grep -F '18.' \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

RUN install-php-extensions intl pcntl pdo_pgsql zip

WORKDIR /app
COPY --from=backend /app ./
COPY --from=web /build/frontend/dist ./public
COPY Caddyfile /etc/frankenphp/Caddyfile
COPY docker/home-server-entrypoint.sh /usr/local/bin/lifeos-entrypoint

RUN mkdir -p storage/framework/cache storage/framework/sessions storage/framework/views storage/logs \
    && chmod +x /usr/local/bin/lifeos-entrypoint \
    && chown -R www-data:www-data storage bootstrap/cache

ENV APP_ENV=production \
    APP_DEBUG=false \
    SERVER_NAME=:8080

EXPOSE 8080

ENTRYPOINT ["/usr/local/bin/lifeos-entrypoint"]
