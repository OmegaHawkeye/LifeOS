<?php

return [
    'passkey_web_url' => env('LIFEOS_PASSKEY_WEB_URL', env('FRONTEND_URL', env('APP_URL', 'http://localhost:8080'))),
    'mobile_access_token_minutes' => (int) env('LIFEOS_MOBILE_ACCESS_TOKEN_MINUTES', 15),
    'mobile_refresh_token_days' => (int) env('LIFEOS_MOBILE_REFRESH_TOKEN_DAYS', 30),
    'backups' => [
        'directory' => env('LIFEOS_BACKUP_DIRECTORY', storage_path('app/backups')),
        'retention_days' => (int) env('LIFEOS_BACKUP_RETENTION_DAYS', 30),
        'key_path' => env('LIFEOS_BACKUP_KEY_PATH', storage_path('app/private/backup-recovery.key')),
        'status_path' => env('LIFEOS_BACKUP_STATUS_PATH', storage_path('app/private/backup-status.json')),
        'pg_dump_path' => env('LIFEOS_PG_DUMP_PATH', 'pg_dump'),
        'pg_restore_path' => env('LIFEOS_PG_RESTORE_PATH', 'pg_restore'),
    ],
];
