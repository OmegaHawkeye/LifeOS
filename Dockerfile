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

RUN install-php-extensions intl pcntl pdo_pgsql zip

WORKDIR /app
COPY --from=backend /app ./
COPY --from=web /build/frontend/dist ./public
COPY Caddyfile /etc/frankenphp/Caddyfile

RUN mkdir -p storage/framework/cache storage/framework/sessions storage/framework/views storage/logs \
    && chown -R www-data:www-data storage bootstrap/cache

ENV APP_ENV=production \
    APP_DEBUG=false \
    SERVER_NAME=:8080

EXPOSE 8080
