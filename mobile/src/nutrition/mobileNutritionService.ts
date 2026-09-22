import type { MobileAuthService } from "../auth/mobileAuthService";

type ApiEnvelope<T> = { data: T };

export type NutritionDashboard = {
  week_start: string;
  week_end: string;
  target: NutritionValues;
  today: {
    date: string;
    plan: {
      id: number;
      recipe_name: string;
      meal_slot: string;
      status: string;
      calories: string | null;
      protein_grams: string | null;
      carbohydrate_grams: string | null;
      fat_grams: string | null;
    }[];
    eaten_meals: {
      id: number;
      name: string;
      meal_type: string;
      calories: string | null;
      protein_grams: string | null;
      carbohydrate_grams: string | null;
      fat_grams: string | null;
    }[];
    planned_meal_count: number;
    eaten_meal_count: number;
    planned: NutritionValues;
    eaten: NutritionValues;
  };
};

export type NutritionValues = {
  calories: string | null;
  protein_grams: string | null;
  carbohydrate_grams: string | null;
  fat_grams: string | null;
};

export type LogNutritionMeal = {
  name: string;
  meal_type: "breakfast" | "lunch" | "dinner" | "snack" | "other";
  eaten_at: string;
  servings: number;
  calories: number | null;
  protein_grams: number | null;
  carbohydrate_grams: number | null;
  fat_grams: number | null;
};

export type UpdateNutritionTarget = {
  calories: number | null;
  protein_grams: number | null;
  carbohydrate_grams: number | null;
  fat_grams: number | null;
  notes?: string | null;
};

type MobileNutritionServiceOptions = {
  api: Pick<MobileAuthService, "request">;
  now?: () => Date;
};

export class MobileNutritionService {
  private readonly api: Pick<MobileAuthService, "request">;
  private readonly now: () => Date;

  constructor(options: MobileNutritionServiceOptions) {
    this.api = options.api;
    this.now = options.now ?? (() => new Date());
  }

  async loadDashboard(): Promise<NutritionDashboard> {
    const weekStart = weekStartDate(this.now());
    const response = await this.api.request<ApiEnvelope<NutritionDashboard>>(
      `/nutrition/dashboard?week_start=${weekStart}`,
    );
    return response.data;
  }

  async logMeal(meal: LogNutritionMeal): Promise<void> {
    await this.api.request<ApiEnvelope<unknown>>("/nutrition/meals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(meal),
    });
  }

  async updateTarget(target: UpdateNutritionTarget): Promise<void> {
    await this.api.request<ApiEnvelope<unknown>>("/nutrition/target", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(target),
    });
  }
}

function weekStartDate(date: Date): string {
  const start = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  start.setDate(start.getDate() - ((start.getDay() + 6) % 7));
  const year = start.getFullYear();
  const month = String(start.getMonth() + 1).padStart(2, "0");
  const day = String(start.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
