<?php

namespace App\Modules\Finance\Application;

use App\Modules\Finance\Models\FinanceCategory;
use Illuminate\Database\Eloquent\Collection;

class ManageFinanceCategories
{
    /**
     * @return Collection<int, FinanceCategory>
     */
    public function forOwner(int|string $ownerId): Collection
    {
        return FinanceCategory::query()
            ->where('owner_id', $ownerId)
            ->where('is_archived', false)
            ->orderBy('type')
            ->orderBy('name')
            ->get();
    }

    /**
     * @param  array{name: string, type: string, color?: string|null}  $attributes
     */
    public function create(int|string $ownerId, array $attributes): FinanceCategory
    {
        $category = new FinanceCategory($attributes);
        $category->owner_id = $ownerId;
        $category->save();

        return $category;
    }

    /**
     * @param  array{name?: string, color?: string|null}  $attributes
     */
    public function update(int|string $ownerId, int $categoryId, array $attributes): FinanceCategory
    {
        $category = FinanceCategory::query()
            ->where('owner_id', $ownerId)
            ->findOrFail($categoryId);
        $category->update($attributes);

        return $category->refresh();
    }
}
