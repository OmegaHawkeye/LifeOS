<?php

namespace App\Modules\Fitness\Http\Resources;

use App\Modules\Fitness\Models\FitnessProgressPhoto;
use Carbon\CarbonImmutable;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin FitnessProgressPhoto */
class FitnessProgressPhotoResource extends JsonResource
{
    /** @return array<string, mixed> */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'photo_date' => CarbonImmutable::parse((string) $this->getRawOriginal('photo_date'))->toDateString(),
            'angle' => $this->angle,
            'tags' => $this->tags,
            'notes' => $this->notes,
            'mime_type' => $this->mime_type,
            'file_size' => $this->file_size,
            'content_url' => route('api.v1.fitness.progress-photos.content', ['photo' => $this->getKey()]),
            'body_metric' => $this->whenLoaded('bodyMetric', fn (): ?array => $this->bodyMetric === null ? null : [
                'id' => $this->bodyMetric->getKey(),
                'metric_type' => $this->bodyMetric->metric_type,
                'value' => $this->bodyMetric->value,
                'unit' => $this->bodyMetric->unit,
                'measured_at' => $this->bodyMetric->measured_at,
            ]),
        ];
    }
}
