<?php

namespace App\Modules\Finance\Http\Resources;

use App\Modules\Finance\Models\FinanceBudget;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class FinanceBudgetResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        /** @var FinanceBudget $budget */
        $budget = $this->resource;

        return [
            'id' => $budget->id,
            'category_id' => $budget->category_id,
            'category_name' => $budget->getAttribute('category_name'),
            'month' => substr((string) $budget->month, 0, 7),
            'currency' => $budget->currency,
            'target_amount' => $budget->target_amount,
            'spent' => $this->decimal($budget->getAttribute('spent')),
            'remaining' => $this->decimal($budget->getAttribute('remaining')),
            'is_over_budget' => (bool) $budget->getAttribute('is_over_budget'),
        ];
    }

    private function decimal(mixed $amount): string
    {
        [$whole, $fraction] = array_pad(explode('.', (string) $amount, 2), 2, '');

        return $whole.'.'.str_pad(substr($fraction, 0, 4), 4, '0');
    }
}
