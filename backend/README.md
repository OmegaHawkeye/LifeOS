# LifeOS API

The backend is a Laravel API-only modular monolith. PostgreSQL is the production and local-development database; Sanctum provides first-party SPA sessions and future mobile bearer tokens.

Use the repository root commands for setup and normal development. Backend-only checks are available through Composer:

```bash
composer test
composer analyse
composer pint:test
```
