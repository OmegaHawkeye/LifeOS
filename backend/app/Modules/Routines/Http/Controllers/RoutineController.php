<?php

namespace App\Modules\Routines\Http\Controllers;

use App\Modules\Foundation\Application\Settings\ManageOwnerSettings;
use App\Modules\Routines\Http\Requests\StoreRoutineRequest;
use App\Modules\Routines\Http\Requests\UpdateRoutineRequest;
use App\Modules\Routines\Http\Resources\RoutineActionResource;
use App\Modules\Routines\Http\Resources\RoutineCompletionResource;
use App\Modules\Routines\Http\Resources\RoutineDefinitionResource;
use App\Modules\Routines\Http\Resources\RoutineOverviewResource;
use App\Modules\Routines\Http\Resources\RoutineResource;
use App\Modules\Routines\Models\Routine;
use App\Modules\Routines\Models\RoutineLog;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Symfony\Component\HttpFoundation\Response;

class RoutineController
{
    public function __construct(private readonly ManageOwnerSettings $settings) {}

    public function index(Request $request): JsonResponse
    {
        $owner = $request->user();
        $timezone = $this->settings->forOwner($owner)->timezone;
        $today = Carbon::now($timezone)->startOfDay();
        $now = Carbon::now($timezone);
        $routines = Routine::query()->where('owner_id', $owner->getAuthIdentifier())->where('is_active', true)->orderBy('created_at')->get();
        $logs = RoutineLog::query()->where('owner_id', $owner->getAuthIdentifier())->whereDate('occurrence_on', $today->toDateString())->get()->keyBy('routine_id');
        $notificationsEnabled = $this->settings->forOwner($owner)->notifications_enabled;

        $items = [];
        foreach ($routines as $routine) {
            $days = $routine->frequency === 'daily' ? [1, 2, 3, 4, 5, 6, 7] : ($routine->days_of_week ?? []);
            $scheduledToday = in_array($today->dayOfWeekIso, $days, true);
            $log = $logs->get($routine->id);
            $snoozedUntil = $log?->snoozed_until;
            $snoozed = $snoozedUntil !== null && $snoozedUntil->isFuture();
            $status = $log?->completed_at !== null ? 'completed' : ($snoozed ? 'snoozed' : ($scheduledToday ? 'due' : 'not_scheduled'));
            $reminderActive = $notificationsEnabled
                && $scheduledToday
                && $status === 'due'
                && $routine->reminder_time !== null
                && $now->format('H:i:s') >= $routine->reminder_time;

            $routine->setAttribute('is_scheduled_today', $scheduledToday);
            $routine->setAttribute('status', $status);
            $routine->setAttribute('reminder_active', $reminderActive);
            $routine->setAttribute('snoozed_until', $snoozedUntil?->toIso8601String());
            $items[] = RoutineResource::make($routine)->resolve($request);
        }

        $recentCompletions = [];
        $recentLogs = RoutineLog::query()
            ->with('routine:id,title,domain')
            ->where('owner_id', $owner->getAuthIdentifier())
            ->whereNotNull('completed_at')
            ->where('completed_at', '>=', $today->copy()->subDays(29))
            ->orderByDesc('completed_at')
            ->limit(30)
            ->get();
        foreach ($recentLogs as $log) {
            $recentCompletions[] = RoutineCompletionResource::make([
                'routine_id' => $log->routine_id,
                'title' => $log->routine?->title,
                'domain' => $log->routine?->domain,
                'completed_at' => $log->completed_at?->toIso8601String(),
            ])->resolve($request);
        }

        return (new RoutineOverviewResource([
            'notifications_enabled' => $notificationsEnabled,
            'routines' => $items,
            'recent_completions' => $recentCompletions,
        ]))->response();
    }

    public function store(StoreRoutineRequest $request): JsonResponse
    {
        $attributes = $request->validated();
        if ($attributes['frequency'] === 'daily') {
            $attributes['days_of_week'] = null;
        } else {
            $attributes['days_of_week'] = array_values(array_unique($attributes['days_of_week']));
        }

        $routine = Routine::query()->create([
            ...$attributes,
            'owner_id' => $request->user()->getAuthIdentifier(),
        ]);

        return (new RoutineDefinitionResource($routine))->response()->setStatusCode(Response::HTTP_CREATED);
    }

    public function update(UpdateRoutineRequest $request, int $routine): RoutineDefinitionResource
    {
        $routineModel = $this->ownedRoutine($request, $routine);
        $attributes = $request->validated();
        if (($attributes['frequency'] ?? null) === 'daily') {
            $attributes['days_of_week'] = null;
        } elseif (isset($attributes['days_of_week'])) {
            $attributes['days_of_week'] = array_values(array_unique($attributes['days_of_week']));
        }
        $routineModel->update($attributes);

        return new RoutineDefinitionResource($routineModel->refresh());
    }

    public function snooze(Request $request, int $routine): RoutineActionResource
    {
        $validated = $request->validate(['minutes' => ['required', 'integer', 'in:15,60,180']]);
        $routineModel = $this->ownedRoutine($request, $routine);
        $timezone = $this->settings->forOwner($request->user())->timezone;
        $now = Carbon::now($timezone);
        abort_unless($this->scheduled($routineModel, $now), Response::HTTP_UNPROCESSABLE_ENTITY, 'This routine is not scheduled today.');

        $log = $this->todayLog($request, $routineModel, $now);
        abort_if($log->completed_at !== null, Response::HTTP_UNPROCESSABLE_ENTITY, 'This routine is already complete.');
        $log->snoozed_until = $now->copy()->addMinutes($validated['minutes'])->toImmutable();
        $log->save();

        return new RoutineActionResource(['status' => 'snoozed', 'snoozed_until' => $log->snoozed_until->toIso8601String()]);
    }

    public function complete(Request $request, int $routine): RoutineActionResource
    {
        $routineModel = $this->ownedRoutine($request, $routine);
        $timezone = $this->settings->forOwner($request->user())->timezone;
        $now = Carbon::now($timezone);
        abort_unless($this->scheduled($routineModel, $now), Response::HTTP_UNPROCESSABLE_ENTITY, 'This routine is not scheduled today.');

        $log = $this->todayLog($request, $routineModel, $now);
        if ($log->completed_at === null) {
            $log->completed_at = $now->toImmutable();
            $log->snoozed_until = null;
            $log->save();
        }

        return new RoutineActionResource(['status' => 'completed', 'completed_at' => $log->completed_at->toIso8601String()]);
    }

    private function ownedRoutine(Request $request, int $routineId): Routine
    {
        return Routine::query()->where('owner_id', $request->user()->getAuthIdentifier())->findOrFail($routineId);
    }

    private function scheduled(Routine $routine, Carbon $date): bool
    {
        $days = $routine->frequency === 'daily' ? [1, 2, 3, 4, 5, 6, 7] : ($routine->days_of_week ?? []);

        return $routine->is_active && in_array($date->dayOfWeekIso, $days, true);
    }

    private function todayLog(Request $request, Routine $routine, Carbon $now): RoutineLog
    {
        return RoutineLog::query()->firstOrCreate([
            'owner_id' => $request->user()->getAuthIdentifier(),
            'routine_id' => $routine->id,
            'occurrence_on' => $now->toDateString(),
        ]);
    }
}
