<?php

namespace App\Modules\Nutrition\Http\Controllers;

use App\Modules\Nutrition\Application\BuildNutritionDashboard;
use App\Modules\Nutrition\Application\ManageNutritionLibrary;
use App\Modules\Nutrition\Application\ManageNutritionPlans;
use App\Modules\Nutrition\Application\ManageNutritionShoppingLists;
use App\Modules\Nutrition\Application\ManageNutritionTargets;
use App\Modules\Nutrition\Http\Requests\CopyNutritionWeekRequest;
use App\Modules\Nutrition\Http\Requests\GenerateNutritionShoppingListRequest;
use App\Modules\Nutrition\Http\Requests\NutritionPlanWeekRequest;
use App\Modules\Nutrition\Http\Requests\StoreNutritionMealRequest;
use App\Modules\Nutrition\Http\Requests\StoreNutritionPlanItemRequest;
use App\Modules\Nutrition\Http\Requests\StoreNutritionRecipeRequest;
use App\Modules\Nutrition\Http\Requests\StoreNutritionShoppingItemRequest;
use App\Modules\Nutrition\Http\Requests\UpdateNutritionPlanItemRequest;
use App\Modules\Nutrition\Http\Requests\UpdateNutritionRecipeRequest;
use App\Modules\Nutrition\Http\Requests\UpdateNutritionShoppingItemRequest;
use App\Modules\Nutrition\Http\Requests\UpdateNutritionTargetRequest;
use App\Modules\Nutrition\Http\Resources\NutritionMealResource;
use App\Modules\Nutrition\Http\Resources\NutritionPlanItemResource;
use App\Modules\Nutrition\Http\Resources\NutritionRecipeResource;
use App\Modules\Nutrition\Http\Resources\NutritionShoppingItemResource;
use App\Modules\Nutrition\Http\Resources\NutritionShoppingListResource;
use App\Modules\Nutrition\Http\Resources\NutritionTargetResource;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Symfony\Component\HttpFoundation\Response;

class NutritionController
{
    public function __construct(
        private readonly ManageNutritionLibrary $library,
        private readonly ManageNutritionPlans $plans,
        private readonly ManageNutritionShoppingLists $shoppingLists,
        private readonly ManageNutritionTargets $targets,
        private readonly BuildNutritionDashboard $dashboard,
    ) {}

    public function recipes(Request $request): AnonymousResourceCollection
    {
        return NutritionRecipeResource::collection($this->library->recipes($request->user()->getAuthIdentifier()));
    }

    public function storeRecipe(StoreNutritionRecipeRequest $request): Response
    {
        $recipe = $this->library->createRecipe($request->user()->getAuthIdentifier(), $request->validated());

        return (new NutritionRecipeResource($recipe))->response()->setStatusCode(201);
    }

    public function updateRecipe(UpdateNutritionRecipeRequest $request, int $recipe): NutritionRecipeResource
    {
        return new NutritionRecipeResource($this->library->updateRecipe($request->user()->getAuthIdentifier(), $recipe, $request->validated()));
    }

    public function meals(Request $request): AnonymousResourceCollection
    {
        $data = $request->validate(['date' => ['sometimes', 'date_format:Y-m-d']]);

        return NutritionMealResource::collection($this->library->meals($request->user()->getAuthIdentifier(), $data['date'] ?? null));
    }

    public function storeMeal(StoreNutritionMealRequest $request): Response
    {
        $meal = $this->library->logMeal($request->user()->getAuthIdentifier(), $request->validated());

        return (new NutritionMealResource($meal))->response()->setStatusCode(201);
    }

    public function target(Request $request): Response
    {
        return (new NutritionTargetResource($this->targets->forOwner($request->user()->getAuthIdentifier())))
            ->response()
            ->setStatusCode(200);
    }

    public function updateTarget(UpdateNutritionTargetRequest $request): Response
    {
        return (new NutritionTargetResource($this->targets->update($request->user()->getAuthIdentifier(), $request->validated())))
            ->response()
            ->setStatusCode(200);
    }

    public function plans(NutritionPlanWeekRequest $request): AnonymousResourceCollection
    {
        return NutritionPlanItemResource::collection($this->plans->forWeek(
            $request->user()->getAuthIdentifier(),
            $request->validated('week_start'),
        ));
    }

    public function dashboard(NutritionPlanWeekRequest $request): Response
    {
        return response()->json([
            'data' => $this->dashboard->forWeek(
                $request->user()->getAuthIdentifier(),
                $request->validated('week_start'),
            ),
        ]);
    }

    public function storePlanItem(StoreNutritionPlanItemRequest $request): Response
    {
        $item = $this->plans->create($request->user()->getAuthIdentifier(), $request->validated());

        return (new NutritionPlanItemResource($item))->response()->setStatusCode(201);
    }

    public function updatePlanItem(UpdateNutritionPlanItemRequest $request, int $item): NutritionPlanItemResource
    {
        return new NutritionPlanItemResource($this->plans->update(
            $request->user()->getAuthIdentifier(),
            $item,
            $request->validated(),
        ));
    }

    public function copyWeek(CopyNutritionWeekRequest $request): Response
    {
        return NutritionPlanItemResource::collection($this->plans->copyWeek(
            $request->user()->getAuthIdentifier(),
            $request->validated('source_week_start'),
            $request->validated('target_week_start'),
        ))->response()->setStatusCode(201);
    }

    public function shoppingLists(Request $request): AnonymousResourceCollection
    {
        return NutritionShoppingListResource::collection($this->shoppingLists->lists($request->user()->getAuthIdentifier()));
    }

    public function generateShoppingList(GenerateNutritionShoppingListRequest $request): Response
    {
        $list = $this->shoppingLists->generate($request->user()->getAuthIdentifier(), $request->validated());

        return (new NutritionShoppingListResource($list))->response()->setStatusCode(201);
    }

    public function storeShoppingItem(StoreNutritionShoppingItemRequest $request, int $list): Response
    {
        $item = $this->shoppingLists->addManualItem($request->user()->getAuthIdentifier(), $list, $request->validated());

        return (new NutritionShoppingItemResource($item))->response()->setStatusCode(201);
    }

    public function updateShoppingItem(UpdateNutritionShoppingItemRequest $request, int $list, int $item): NutritionShoppingItemResource
    {
        return new NutritionShoppingItemResource($this->shoppingLists->updateItem(
            $request->user()->getAuthIdentifier(),
            $list,
            $item,
            $request->validated(),
        ));
    }

    public function destroyShoppingItem(Request $request, int $list, int $item): Response
    {
        $this->shoppingLists->removeItem($request->user()->getAuthIdentifier(), $list, $item);

        return response()->noContent();
    }
}
