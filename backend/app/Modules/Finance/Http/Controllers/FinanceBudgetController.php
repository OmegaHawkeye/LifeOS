<?php

namespace App\Modules\Finance\Http\Controllers;

use App\Modules\Finance\Application\ManageFinanceBudgets;
use App\Modules\Finance\Http\Requests\ListFinanceBudgetsRequest;
use App\Modules\Finance\Http\Requests\StoreFinanceBudgetRequest;
use App\Modules\Finance\Http\Requests\UpdateFinanceBudgetRequest;
use App\Modules\Finance\Http\Resources\FinanceBudgetResource;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Symfony\Component\HttpFoundation\Response;

class FinanceBudgetController
{
    public function __construct(private readonly ManageFinanceBudgets $budgets) {}

    public function index(ListFinanceBudgetsRequest $request): AnonymousResourceCollection
    {
        $month = $request->validated('month') ?? now()->format('Y-m');

        return FinanceBudgetResource::collection(
            $this->budgets->forOwner($request->user()->getAuthIdentifier(), $month),
        );
    }

    public function store(StoreFinanceBudgetRequest $request): JsonResponse
    {
        $ownerId = $request->user()->getAuthIdentifier();
        $budget = $this->budgets->create($ownerId, $request->validated());
        $summary = $this->budgets->forOwner($ownerId, substr((string) $budget->month, 0, 7))
            ->first(fn ($item): bool => (int) $item->getKey() === (int) $budget->getKey());

        return (new FinanceBudgetResource($summary))
            ->response()
            ->setStatusCode(Response::HTTP_CREATED);
    }

    public function update(UpdateFinanceBudgetRequest $request, int $budget): FinanceBudgetResource
    {
        $ownerId = $request->user()->getAuthIdentifier();
        $updatedBudget = $this->budgets->update($ownerId, $budget, $request->validated());
        $summary = $this->budgets->forOwner($ownerId, substr((string) $updatedBudget->month, 0, 7))
            ->first(fn ($item): bool => (int) $item->getKey() === (int) $updatedBudget->getKey());

        return new FinanceBudgetResource($summary);
    }

    public function destroy(Request $request, int $budget): Response
    {
        $this->budgets->delete($request->user()->getAuthIdentifier(), $budget);

        return response()->noContent();
    }
}
