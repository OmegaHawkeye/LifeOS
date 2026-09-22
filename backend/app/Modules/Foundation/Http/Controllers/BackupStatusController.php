<?php

namespace App\Modules\Foundation\Http\Controllers;

use Illuminate\Http\JsonResponse;

class BackupStatusController
{
    public function show(): JsonResponse
    {
        $path = (string) config('lifeos.backups.status_path');
        $storedStatus = is_file($path) ? json_decode((string) file_get_contents($path), true) : null;
        $status = is_array($storedStatus) && in_array($storedStatus['state'] ?? null, ['ok', 'failed'], true)
            ? $storedStatus['state']
            : 'never';

        return response()->json([
            'data' => [
                'status' => $status,
                'last_attempt_at' => is_array($storedStatus) && is_string($storedStatus['last_attempt_at'] ?? null)
                    ? $storedStatus['last_attempt_at']
                    : null,
                'last_successful_backup_at' => is_array($storedStatus) && is_string($storedStatus['last_successful_backup_at'] ?? null)
                    ? $storedStatus['last_successful_backup_at']
                    : null,
                'retention_days' => (int) config('lifeos.backups.retention_days'),
                'scheduled_time' => '02:00',
            ],
        ])->header('Cache-Control', 'private, no-store');
    }
}
