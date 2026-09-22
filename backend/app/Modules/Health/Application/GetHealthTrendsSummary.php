<?php

namespace App\Modules\Health\Application;

use App\Modules\Health\Models\HealthSample;
use Carbon\CarbonImmutable;
use Illuminate\Support\Collection;

class GetHealthTrendsSummary
{
    private const WORKOUT_UNIT_TO_MINUTES = [
        'minute' => 1,
        'minutes' => 1,
        'min' => 1,
        'hour' => 60,
        'hours' => 60,
        'hr' => 60,
        'h' => 60,
        'second' => 1 / 60,
        'seconds' => 1 / 60,
        'sec' => 1 / 60,
        's' => 1 / 60,
    ];

    /**
     * @param  '7d'|'30d'|'90d'|'ytd'  $range
     * @return array{
     *     range: '7d'|'30d'|'90d'|'ytd',
     *     from: string,
     *     to: string,
     *     trends: list<array{
     *         sample_type: string,
     *         unit: string,
     *         total: string,
     *         latest_value: string,
     *         change: string,
     *         direction: 'up'|'down'|'steady',
     *         points: list<array{date: string, value: string}>,
     *         source_counts: array{manual: int, imported: int, sources: list<array{id: int, name: string, kind: string, count: int}>}
     *     }>
     * }
     */
    public function forOwner(int|string $ownerId, string $range = '30d'): array
    {
        $today = CarbonImmutable::now(config('app.timezone'))->startOfDay();
        $from = match ($range) {
            '7d' => $today->subDays(6),
            '30d' => $today->subDays(29),
            '90d' => $today->subDays(89),
            'ytd' => $today->startOfYear(),
        };
        $samples = HealthSample::query()
            ->with('source:id,name,kind')
            ->where('owner_id', $ownerId)
            ->whereBetween('recorded_at', [$from, $today->endOfDay()])
            ->whereIn('sample_type', ['steps', 'sleep', 'workouts', 'calories', 'weight'])
            ->orderBy('recorded_at')
            ->orderBy('id')
            ->get();

        return [
            'range' => $range,
            'from' => $from->toDateString(),
            'to' => $today->toDateString(),
            'trends' => $this->trends($samples),
        ];
    }

    /**
     * @param  Collection<int, HealthSample>  $samples
     * @return list<array{
     *     sample_type: string,
     *     unit: string,
     *     total: string,
     *     latest_value: string,
     *     change: string,
     *     direction: 'up'|'down'|'steady',
     *     points: list<array{date: string, value: string}>,
     *     source_counts: array{manual: int, imported: int, sources: list<array{id: int, name: string, kind: string, count: int}>}
     * }>
     */
    private function trends(Collection $samples): array
    {
        $groups = [];
        foreach ($samples as $sample) {
            $value = $this->normalizedValue($sample);
            if ($value === null) {
                continue;
            }
            $unit = $this->normalizedUnit($sample);
            $key = $sample->sample_type.'|'.$unit;
            $date = CarbonImmutable::parse($sample->recorded_at)->toDateString();
            $groups[$key] ??= [
                'sample_type' => $sample->sample_type,
                'unit' => $unit,
                'summative' => $sample->sample_type !== 'weight',
                'days' => [],
                'manual' => 0,
                'imported' => 0,
                'sources' => [],
            ];

            if ($sample->sample_type === 'weight') {
                $current = $groups[$key]['days'][$date] ?? null;
                if ($current === null || CarbonImmutable::parse($sample->recorded_at)->greaterThan($current['recorded_at'])) {
                    $groups[$key]['days'][$date] = [
                        'value' => $value,
                        'recorded_at' => CarbonImmutable::parse($sample->recorded_at),
                    ];
                }
            } else {
                $groups[$key]['days'][$date] = ($groups[$key]['days'][$date] ?? 0.0) + $value;
            }

            $sourceId = (int) $sample->source_id;
            if ($sample->is_manual) {
                $groups[$key]['manual']++;
            } else {
                $groups[$key]['imported']++;
            }
            $groups[$key]['sources'][$sourceId] ??= [
                'id' => $sourceId,
                'name' => $sample->source->name,
                'kind' => $sample->source->kind,
                'count' => 0,
            ];
            $groups[$key]['sources'][$sourceId]['count']++;
        }

        $trends = [];
        foreach ($groups as $group) {
            $points = [];
            foreach ($group['days'] as $date => $day) {
                $value = $group['summative'] ? $day : $day['value'];
                $points[] = ['date' => $date, 'value' => $this->format($value)];
            }
            $values = array_map(static fn (array $point): float => (float) $point['value'], $points);
            $firstValue = $values[0];
            $latestValue = $values[array_key_last($values)];
            $change = $latestValue - $firstValue;
            $direction = abs($change) < 0.00005 ? 'steady' : ($change < 0 ? 'down' : 'up');
            $sources = array_values($group['sources']);
            usort($sources, static fn (array $left, array $right): int => $left['name'] <=> $right['name']);

            $trends[] = [
                'sample_type' => $group['sample_type'],
                'unit' => $group['unit'],
                'total' => $this->format($group['summative'] ? array_sum($values) : $latestValue),
                'latest_value' => $this->format($latestValue),
                'change' => $this->format($change),
                'direction' => $direction,
                'points' => $points,
                'source_counts' => [
                    'manual' => $group['manual'],
                    'imported' => $group['imported'],
                    'sources' => $sources,
                ],
            ];
        }
        usort($trends, static fn (array $left, array $right): int => [$left['sample_type'], $left['unit']] <=> [$right['sample_type'], $right['unit']]);

        return $trends;
    }

    private function normalizedUnit(HealthSample $sample): string
    {
        if ($sample->sample_type === 'sleep') {
            return 'hour';
        }
        if ($sample->sample_type === 'workouts' && array_key_exists(strtolower($sample->unit), self::WORKOUT_UNIT_TO_MINUTES)) {
            return 'min';
        }

        return $sample->unit;
    }

    private function normalizedValue(HealthSample $sample): ?float
    {
        $value = (float) $sample->value;
        if ($sample->sample_type === 'sleep') {
            $sourceUnit = strtolower($sample->unit);
            if (in_array($sourceUnit, ['hour', 'hours', 'hr', 'h'], true)) {
                return $value;
            }
            if (in_array($sourceUnit, ['minute', 'minutes', 'min'], true)) {
                return $value / 60;
            }
            if ($sourceUnit === 'stage') {
                $metadata = json_decode((string) $sample->getRawOriginal('metadata'), true);
                $stage = is_array($metadata) && is_string($metadata['sleep_stage'] ?? null)
                    ? $metadata['sleep_stage']
                    : '';
                if (! str_contains($stage, 'Asleep')
                    && ! str_contains($stage, 'Core')
                    && ! str_contains($stage, 'Deep')
                    && ! str_contains($stage, 'REM')) {
                    return null;
                }
                if ($sample->ended_at === null) {
                    return null;
                }

                return CarbonImmutable::parse($sample->recorded_at)->diffInSeconds(CarbonImmutable::parse($sample->ended_at)) / 3600;
            }

            return null;
        }
        if ($sample->sample_type === 'workouts') {
            $sourceUnit = strtolower($sample->unit);

            return $value * (self::WORKOUT_UNIT_TO_MINUTES[$sourceUnit] ?? 1);
        }

        return $value;
    }

    private function format(float $value): string
    {
        return number_format($value, 4, '.', '');
    }
}
