<?php

namespace App\Modules\Finance\Http\Controllers;

use App\Modules\Finance\Application\ManageFinanceSavingsGoals;
use App\Modules\Finance\Http\Requests\StoreFinanceSavingsGoalRequest;
use App\Modules\Finance\Http\Requests\UpdateFinanceSavingsGoalRequest;
use App\Modules\Finance\Http\Resources\FinanceSavingsGoalResource;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Symfony\Component\HttpFoundation\Response;

class FinanceSavingsGoalController
{
    public function __construct(private readonly ManageFinanceSavingsGoals $goals) {}

    public function index(Request $request): AnonymousResourceCollection
    {
        return FinanceSavingsGoalResource::collection(
            $this->goals->forOwner($request->user()->getAuthIdentifier()),
        );
    }

    public function store(StoreFinanceSavingsGoalRequest $request): Response
    {
        $goal = $this->goals->create($request->user()->getAuthIdentifier(), $request->validated());

        return (new FinanceSavingsGoalResource($goal))->response()->setStatusCode(Response::HTTP_CREATED);
    }

    public function update(UpdateFinanceSavingsGoalRequest $request, int $goal): FinanceSavingsGoalResource
    {
        return new FinanceSavingsGoalResource(
            $this->goals->update($request->user()->getAuthIdentifier(), $goal, $request->validated()),
        );
    }

    public function destroy(Request $request, int $goal): Response
    {
        $this->goals->delete($request->user()->getAuthIdentifier(), $goal);

        return response()->noContent();
    }
}
