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
        $imported = $skipped = $failed = 0;
        $errors = [];
        $map = ['HKQuantityTypeIdentifierStepCount' => ['steps', 'count'], 'HKQuantityTypeIdentifierBodyMass' => ['weight', 'kg'], 'HKQuantityTypeIdentifierHeartRate' => ['heart_rate', 'count'], 'HKQuantityTypeIdentifierActiveEnergyBurned' => ['calories', 'kcal'], 'HKWorkoutTypeIdentifier' => ['workouts', 'count'], 'HKCategoryTypeIdentifierSleepAnalysis' => ['sleep', 'hour']];
        $records = [];
        foreach ($xml->Record as $record) {
            $records[] = $record;
        }
        foreach ($xml->Workout as $workout) {
            $records[] = $workout;
        }
        foreach ($records as $record) {
            $type = (string) $record['type'];
            if ($record->getName() === 'Workout') {
                $type = 'HKWorkoutTypeIdentifier';
                $record['value'] = (string) ($record['duration'] ?: '1');
                $record['unit'] = (string) ($record['durationUnit'] ?: 'min');
            }
            $matched = collect($map)->first(fn (array $value, string $key): bool => str_starts_with($type, $key));
            if ($matched === null || ! isset($record['startDate'], $record['value'])) {
                $skipped++;

                continue;
            }
            try {
                $rawValue = (string) $record['value'];
                $isSleepStage = $matched[0] === 'sleep' && ! is_numeric($rawValue);
                if (! $isSleepStage && ! is_numeric($rawValue)) {
                    $failed++;
                    $errors[] = ['record_type' => $type, 'message' => 'The sample value is not numeric.'];

                    continue;
                }
                $result = $this->health->ingest($ownerId, ['source_id' => $source->id, 'sync_run_id' => $run->id, 'external_id' => hash('sha256', implode('|', [$type, (string) $record['startDate'], (string) $record['endDate'], $rawValue, (string) $record['unit'], (string) $record['sourceName']])), 'sample_type' => $matched[0], 'value' => $isSleepStage ? '1' : $rawValue, 'unit' => $isSleepStage ? 'stage' : (string) ($record['unit'] ?: $matched[1]), 'recorded_at' => Carbon::parse((string) $record['startDate']), 'ended_at' => isset($record['endDate']) ? Carbon::parse((string) $record['endDate']) : null, 'metadata' => ['source_name' => (string) $record['sourceName'], 'source_version' => (string) $record['sourceVersion'], 'sleep_stage' => $isSleepStage ? $rawValue : null]]);
                $result['idempotent'] ? $skipped++ : $imported++;
            } catch (\Throwable $exception) {
                $failed++;
                $errors[] = ['record_type' => $type, 'message' => 'The record could not be imported.'];
            }
        }
        $status = $failed > 0 ? ($imported > 0 ? 'partial_success' : 'failure') : ($skipped > 0 ? 'partial_success' : 'success');

        return $this->health->finishRun($ownerId, $run->id, ['status' => $status, 'imported_count' => $imported, 'skipped_count' => $skipped, 'failed_count' => $failed, 'error_summary' => $errors]);
    }
}
