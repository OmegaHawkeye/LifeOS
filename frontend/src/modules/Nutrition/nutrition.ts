import { apiClient } from "@/api/client";
import type { paths } from "@/api/schema";

export type NutritionTarget =
  paths["/nutrition/target"]["get"]["responses"][200]["content"]["application/json"]["data"];
export type NutritionDashboard =
  paths["/nutrition/dashboard"]["get"]["responses"][200]["content"]["application/json"]["data"];
export type NutritionTargetUpdate =
  paths["/nutrition/target"]["patch"]["requestBody"]["content"]["application/json"];
export type NutritionRecipe =
  paths["/nutrition/recipes"]["get"]["responses"][200]["content"]["application/json"]["data"][number];
export type NutritionRecipeCreate =
  paths["/nutrition/recipes"]["post"]["requestBody"]["content"]["application/json"];
export type NutritionMeal =
  paths["/nutrition/meals"]["get"]["responses"][200]["content"]["application/json"]["data"][number];
export type NutritionMealCreate =
  paths["/nutrition/meals"]["post"]["requestBody"]["content"]["application/json"];
export type NutritionPlanItem =
  paths["/nutrition/plans"]["get"]["responses"][200]["content"]["application/json"]["data"][number];
export type NutritionPlanItemCreate =
  paths["/nutrition/plans"]["post"]["requestBody"]["content"]["application/json"];
export type NutritionPlanItemUpdate =
  paths["/nutrition/plans/{item}"]["patch"]["requestBody"]["content"]["application/json"];
export type NutritionWeekCopy =
  paths["/nutrition/plans/copy"]["post"]["requestBody"]["content"]["application/json"];
export type NutritionShoppingList =
  paths["/nutrition/shopping-lists"]["get"]["responses"][200]["content"]["application/json"]["data"][number];
export type NutritionShoppingListGenerate =
  paths["/nutrition/shopping-lists/generate"]["post"]["requestBody"]["content"]["application/json"];
export type NutritionShoppingItem = NutritionShoppingList["items"][number];
export type NutritionShoppingItemCreate =
  paths["/nutrition/shopping-lists/{list}/items"]["post"]["requestBody"]["content"]["application/json"];
export type NutritionShoppingItemUpdate =
  paths["/nutrition/shopping-lists/{list}/items/{item}"]["patch"]["requestBody"]["content"]["application/json"];

export async function getNutritionTarget(): Promise<NutritionTarget> {
  const { data, response } = await apiClient.GET("/nutrition/target");
  if (!response.ok || !data)
    throw new Error("Could not load nutrition target.");
  return data.data;
}

export async function getNutritionDashboard(
  weekStart: string,
): Promise<NutritionDashboard> {
  const { data, response } = await apiClient.GET("/nutrition/dashboard", {
    params: { query: { week_start: weekStart } },
  });
  if (!response.ok || !data) {
    throw new Error("Could not load nutrition dashboard.");
  }
  return data.data;
}

export async function updateNutritionTarget(
  target: NutritionTargetUpdate,
): Promise<NutritionTarget> {
  const { data, response } = await apiClient.PATCH("/nutrition/target", {
    body: target,
  });
  if (!response.ok || !data)
    throw new Error("Could not save nutrition target.");
  return data.data;
}

export async function getNutritionRecipes(): Promise<NutritionRecipe[]> {
  const { data, response } = await apiClient.GET("/nutrition/recipes");
  if (!response.ok || !data) throw new Error("Could not load recipes.");
  return data.data;
}

export async function createNutritionRecipe(
  recipe: NutritionRecipeCreate,
): Promise<NutritionRecipe> {
  const { data, response } = await apiClient.POST("/nutrition/recipes", {
    body: recipe,
  });
  if (!response.ok || !data) throw new Error("Could not save recipe.");
  return data.data;
}

export async function getNutritionMeals(
  date: string,
): Promise<NutritionMeal[]> {
  const { data, response } = await apiClient.GET("/nutrition/meals", {
    params: { query: { date } },
  });
  if (!response.ok || !data) throw new Error("Could not load meals.");
  return data.data;
}

export async function createNutritionMeal(
  meal: NutritionMealCreate,
): Promise<NutritionMeal> {
  const { data, response } = await apiClient.POST("/nutrition/meals", {
    body: meal,
  });
  if (!response.ok || !data) throw new Error("Could not log meal.");
  return data.data;
}

export async function getNutritionPlanItems(
  weekStart: string,
): Promise<NutritionPlanItem[]> {
  const { data, response } = await apiClient.GET("/nutrition/plans", {
    params: { query: { week_start: weekStart } },
  });
  if (!response.ok || !data) throw new Error("Could not load meal plan.");
  return data.data;
}

export async function createNutritionPlanItem(
  item: NutritionPlanItemCreate,
): Promise<NutritionPlanItem> {
  const { data, response } = await apiClient.POST("/nutrition/plans", {
    body: item,
  });
  if (!response.ok || !data) throw new Error("Could not add planned meal.");
  return data.data;
}

export async function updateNutritionPlanItem(
  id: number,
  item: NutritionPlanItemUpdate,
): Promise<NutritionPlanItem> {
  const { data, response } = await apiClient.PATCH("/nutrition/plans/{item}", {
    params: { path: { item: id } },
    body: item,
  });
  if (!response.ok || !data) throw new Error("Could not update planned meal.");
  return data.data;
}

export async function copyNutritionWeek(
  weeks: NutritionWeekCopy,
): Promise<NutritionPlanItem[]> {
  const { data, response } = await apiClient.POST("/nutrition/plans/copy", {
    body: weeks,
  });
  if (!response.ok || !data) throw new Error("Could not copy meal plan.");
  return data.data;
}

export async function getNutritionShoppingLists(): Promise<
  NutritionShoppingList[]
> {
  const { data, response } = await apiClient.GET("/nutrition/shopping-lists");
  if (!response.ok || !data) throw new Error("Could not load shopping lists.");
  return data.data;
}

export async function generateNutritionShoppingList(
  request: NutritionShoppingListGenerate,
): Promise<NutritionShoppingList> {
  const { data, response } = await apiClient.POST(
    "/nutrition/shopping-lists/generate",
    { body: request },
  );
  if (!response.ok || !data)
    throw new Error("Could not generate shopping list.");
  return data.data;
}

export async function addNutritionShoppingItem(
  listId: number,
  item: NutritionShoppingItemCreate,
): Promise<NutritionShoppingItem> {
  const { data, response } = await apiClient.POST(
    "/nutrition/shopping-lists/{list}/items",
    { params: { path: { list: listId } }, body: item },
  );
  if (!response.ok || !data) throw new Error("Could not add shopping item.");
  return data.data;
}

export async function updateNutritionShoppingItem(
  listId: number,
  itemId: number,
  item: NutritionShoppingItemUpdate,
): Promise<NutritionShoppingItem> {
  const { data, response } = await apiClient.PATCH(
    "/nutrition/shopping-lists/{list}/items/{item}",
    { params: { path: { list: listId, item: itemId } }, body: item },
  );
  if (!response.ok || !data) throw new Error("Could not update shopping item.");
  return data.data;
}

export async function deleteNutritionShoppingItem(
  listId: number,
  itemId: number,
): Promise<void> {
  const { response } = await apiClient.DELETE(
    "/nutrition/shopping-lists/{list}/items/{item}",
    { params: { path: { list: listId, item: itemId } } },
  );
  if (!response.ok) throw new Error("Could not remove shopping item.");
}
