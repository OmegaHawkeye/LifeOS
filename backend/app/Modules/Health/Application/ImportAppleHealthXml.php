<?php

namespace App\Modules\Health\Application;

use App\Modules\Health\Models\HealthSyncRun;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Carbon;
use Illuminate\Validation\ValidationException;

class ImportAppleHealthXml
{
    public function __construct(private readonly ManageHealthData $health) {}

    public function import(int|string $ownerId, UploadedFile $file): HealthSyncRun
    {
        $xml = @simplexml_load_file($file->getRealPath());
        if ($xml === false || $xml->getName() !== 'HealthData') {
            throw ValidationException::withMessages(['file' => 'The file is not a valid Apple Health XML export.']);
        }

        $source = $this->health->source($ownerId, ['key' => 'apple_health_xml', 'name' => 'Apple Health XML export', 'kind' => 'file']);
        $run = $this->health->startRun($ownerId, ['source_id' => $source->id]);
        $imported = 0;
        $skipped = 0;
        $failed = 0;
        $map = ['HKQuantityTypeIdentifierStepCount' => ['steps', 'count'], 'HKQuantityTypeIdentifierBodyMass' => ['weight', 'kg'], 'HKQuantityTypeIdentifierHeartRate' => ['heart_rate', 'count'], 'HKQuantityTypeIdentifierActiveEnergyBurned' => ['calories', 'kcal'], 'HKWorkoutTypeIdentifier' => ['workouts', 'count'], 'HKCategoryTypeIdentifierSleepAnalysis' => ['sleep', 'hour']];
        foreach ($xml->Record as $record) {
            $type = (string) $record['type'];
            $matched = collect($map)->first(fn (array $value, string $key): bool => str_starts_with($type, $key));
            if ($matched === null || ! isset($record['startDate'], $record['value'])) {
                $skipped++;

                continue;
            }
            try {
                $result = $this->health->ingest($ownerId, ['source_id' => $source->id, 'sync_run_id' => $run->id, 'external_id' => hash('sha256', implode('|', [(string) $record['type'], (string) $record['startDate'], (string) $record['endDate'], (string) $record['value'], (string) $record['unit'], (string) $record['sourceName']])), 'sample_type' => $matched[0], 'value' => (string) $record['value'], 'unit' => (string) ($record['unit'] ?: $matched[1]), 'recorded_at' => Carbon::parse((string) $record['startDate']), 'ended_at' => isset($record['endDate']) ? Carbon::parse((string) $record['endDate']) : null, 'metadata' => ['source_name' => (string) $record['sourceName'], 'source_version' => (string) $record['sourceVersion']]]);
                $result['idempotent'] ? $skipped++ : $imported++;
            } catch (\Throwable) {
                $failed++;
            }
        }
        $status = $failed > 0 ? ($imported > 0 ? 'partial_success' : 'failure') : ($skipped > 0 ? 'partial_success' : 'success');

        return $this->health->finishRun($ownerId, $run->id, ['status' => $status, 'imported_count' => $imported, 'skipped_count' => $skipped, 'failed_count' => $failed]);
    }
}
