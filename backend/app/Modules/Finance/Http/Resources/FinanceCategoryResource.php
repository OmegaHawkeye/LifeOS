<?php

namespace App\Modules\Finance\Http\Resources;

use App\Modules\Finance\Models\FinanceCategory;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class FinanceCategoryResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        /** @var FinanceCategory $category */
        $category = $this->resource;

        return [
            'id' => $category->id,
            'name' => $category->name,
            'type' => $category->type,
            'color' => $category->color,
            'is_archived' => $category->is_archived,
        ];
    }
}
