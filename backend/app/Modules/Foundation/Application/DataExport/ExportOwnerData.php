<?php

namespace App\Modules\Foundation\Application\DataExport;

use App\Models\User;
use App\Modules\Finance\Application\ExportFinanceData;
use App\Modules\Fitness\Application\ExportFitnessData;
use App\Modules\Foundation\Application\Settings\ManageOwnerSettings;
use App\Modules\Health\Application\ExportHealthData;
use App\Modules\Nutrition\Application\ExportNutritionData;
use App\Modules\Review\Application\ExportWeeklyReviews;
use App\Modules\Routines\Application\ExportRoutineData;
use Illuminate\Support\Arr;

class ExportOwnerData
{
    public function __construct(
        private readonly ManageOwnerSettings $settings,
        private readonly ExportFinanceData $finance,
        private readonly ExportFitnessData $fitness,
        private readonly ExportHealthData $health,
        private readonly ExportNutritionData $nutrition,
        private readonly ExportRoutineData $routines,
        private readonly ExportWeeklyReviews $reviews,
    ) {}

    /**
     * @return array{
     *     data: array<string, mixed>,
     *     files: array<string, string>
     * }
     */
    public function forOwner(User $owner): array
    {
        $fitness = $this->fitness->forOwner($owner->getAuthIdentifier());
        $data = [
            'schema_version' => 1,
            'exported_at' => now()->utc()->toISOString(),
            'owner' => Arr::only($owner->getAttributes(), [
                'id', 'name', 'email', 'email_verified_at', 'created_at', 'updated_at',
            ]),
            'settings' => $this->settings->forOwner($owner)->toArray(),
            'finance' => $this->finance->forOwner($owner->getAuthIdentifier()),
            'fitness' => $fitness['data'],
            'health' => $this->health->forOwner($owner->getAuthIdentifier()),
            'nutrition' => $this->nutrition->forOwner($owner->getAuthIdentifier()),
            'routines' => $this->routines->forOwner($owner->getAuthIdentifier()),
            'weekly_reviews' => $this->reviews->forOwner($owner->getAuthIdentifier()),
        ];

        return [
            'data' => $this->withoutCredentialFields($data),
            'files' => $fitness['files'],
        ];
    }

    /** @param array<string, mixed> $data
     * @return array<string, mixed>
     */
    private function withoutCredentialFields(array $data): array
    {
        $safeData = [];
        foreach ($data as $key => $value) {
            if (preg_match('/password|secret|token|credential|authorization|api[_-]?key|private[_-]?key/i', (string) $key) === 1) {
                continue;
            }

            $safeData[$key] = is_array($value) ? $this->withoutCredentialFields($value) : $value;
        }

        return $safeData;
    }
}
