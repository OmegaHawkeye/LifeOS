<?php

namespace App\Modules\Fitness\Http\Resources;

use App\Modules\Fitness\Models\FitnessMonthlyReview;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin FitnessMonthlyReview */
class FitnessMonthlyReviewResource extends JsonResource
{
    /** @param array{is_due: bool, photo_count: int, latest_photo_date: string|null} $summary */
    public function __construct(FitnessMonthlyReview $resource, private readonly array $summary)
    {
        parent::__construct($resource);
    }

    /** @return array<string, mixed> */
    public function toArray(Request $request): array
    {
        return [
            'month' => substr($this->review_month, 0, 7),
            'reviewed_at' => $this->reviewed_at,
            'notes' => $this->notes,
            ...$this->summary,
        ];
    }
}
