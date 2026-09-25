import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import type {
  LogNutritionMeal,
  MobileNutritionService,
  NutritionDashboard,
  UpdateNutritionTarget,
} from "./mobileNutritionService";

type NutritionScreenProps = {
  service: Pick<
    MobileNutritionService,
    "loadDashboard" | "logMeal" | "updateTarget"
  >;
};

type ScreenState =
  | { status: "loading" }
  | { status: "ready"; dashboard: NutritionDashboard }
  | { status: "error" };

const mealTypes = ["breakfast", "lunch", "dinner", "snack", "other"] as const;

export function NutritionScreen({ service }: NutritionScreenProps) {
  const [state, setState] = useState<ScreenState>({ status: "loading" });
  const [mealType, setMealType] =
    useState<LogNutritionMeal["meal_type"]>("lunch");
  const [name, setName] = useState("");
  const [calories, setCalories] = useState("");
  const [protein, setProtein] = useState("");
  const [targetDraft, setTargetDraft] = useState<NutritionDashboard["target"]>({
    calories: null,
    protein_grams: null,
    carbohydrate_grams: null,
    fat_grams: null,
  });
  const [saving, setSaving] = useState(false);
  const [savingTarget, setSavingTarget] = useState(false);
  const [formError, setFormError] = useState(false);

  const reload = useCallback(async () => {
    setState({ status: "loading" });
    try {
      const dashboard = await service.loadDashboard();
      setTargetDraft(dashboard.target);
      setState({ status: "ready", dashboard });
    } catch {
      setState({ status: "error" });
    }
  }, [service]);

  useEffect(() => {
    void reload();
  }, [reload]);

  async function saveMeal() {
    const parsedCalories = optionalNonNegativeNumber(calories);
    const parsedProtein = optionalNonNegativeNumber(protein);
    if (
      name.trim().length === 0 ||
      parsedCalories === false ||
      parsedProtein === false
    ) {
      setFormError(true);
      return;
    }

    setSaving(true);
    setFormError(false);
    try {
      const now = new Date();
      await service.logMeal({
        name: name.trim(),
        meal_type: mealType,
        eaten_at: now.toISOString(),
        servings: 1,
        calories: parsedCalories,
        protein_grams: parsedProtein,
        carbohydrate_grams: null,
        fat_grams: null,
      });
      setName("");
      setCalories("");
      setProtein("");
      await reload();
    } catch {
      setFormError(true);
    } finally {
      setSaving(false);
    }
  }

  async function saveTarget() {
    const parsedTarget = {
      calories: optionalNonNegativeNumber(targetDraft.calories ?? ""),
      protein_grams: optionalNonNegativeNumber(targetDraft.protein_grams ?? ""),
      carbohydrate_grams: optionalNonNegativeNumber(
        targetDraft.carbohydrate_grams ?? "",
      ),
      fat_grams: optionalNonNegativeNumber(targetDraft.fat_grams ?? ""),
    };
    if (Object.values(parsedTarget).some((value) => value === false)) {
      setFormError(true);
      return;
    }

    setSavingTarget(true);
    setFormError(false);
    try {
      await service.updateTarget(parsedTarget as UpdateNutritionTarget);
      await reload();
    } catch {
      setFormError(true);
    } finally {
      setSavingTarget(false);
    }
  }

  return (
    <ScrollView contentContainerClassName="mx-auto w-full max-w-[1120px] gap-3 px-5 pb-12 pt-8 md:px-9 md:pt-10">
      <Text className="text-sm font-semibold text-lifeos-accent-dark">
        Eat with intention
      </Text>
      <Text className="text-[38px] font-bold tracking-[-0.7px] text-lifeos-primary">
        Nutrition
      </Text>
      <Text className="mb-2 text-[15px] leading-[22px] text-lifeos-muted">
        Your meals and goals, stored on your LifeOS server.
      </Text>

      {state.status === "loading" ? (
        <View
          accessibilityLabel="Loading nutrition data"
          className="min-h-[180px] items-center justify-center gap-3 rounded-[21px] border border-lifeos-border bg-lifeos-surface p-6"
        >
          <ActivityIndicator size="large" />
          <Text className="text-sm text-lifeos-muted">
            Loading your nutrition…
          </Text>
        </View>
      ) : state.status === "error" ? (
        <View className="min-h-[180px] items-center justify-center gap-3 rounded-[21px] border border-lifeos-border bg-lifeos-surface p-6">
          <Text className="text-center text-lg font-bold text-lifeos-primary">
            Nutrition data is unavailable
          </Text>
          <Text className="text-center text-sm leading-[21px] text-lifeos-muted">
            Check your connection to your LifeOS server and try again.
          </Text>
          <NutritionButton label="Try again" onPress={() => void reload()} />
        </View>
      ) : (
        <>
          <View className="rounded-[21px] border border-lifeos-border bg-lifeos-surface p-5 md:p-7">
            <Text className="text-lg font-bold text-lifeos-primary">
              Today · {state.dashboard.today.date}
            </Text>
            <Text className="mt-1 text-sm text-lifeos-muted">
              {state.dashboard.today.planned_meal_count} planned ·{" "}
              {state.dashboard.today.eaten_meal_count} logged
            </Text>
            {Object.values(state.dashboard.target).every(
              (value) => value === null,
            ) ? (
              <Text className="mt-3 text-sm text-lifeos-muted">
                No daily nutrition targets are set yet. You can set them in the
                web app.
              </Text>
            ) : null}
            <View className="mt-4 flex-row flex-wrap gap-3">
              {nutrients.map(({ key, label, unit }) => (
                <View
                  key={key}
                  className="min-w-[130px] flex-1 rounded-2xl bg-lifeos-background p-4"
                >
                  <Text className="text-xs text-lifeos-muted">{label}</Text>
                  <Text className="mt-1 text-lg font-bold text-lifeos-primary">
                    {display(state.dashboard.today.eaten[key])} /{" "}
                    {display(state.dashboard.target[key])} {unit}
                  </Text>
                  <Text className="mt-1 text-xs text-lifeos-muted">
                    logged / target
                  </Text>
                </View>
              ))}
            </View>
          </View>

          <View className="gap-3 rounded-[21px] border border-lifeos-border bg-lifeos-surface p-5 md:p-7">
            <Text className="text-lg font-bold text-lifeos-primary">
              Daily nutrition target
            </Text>
            <Text className="text-sm leading-[21px] text-lifeos-muted">
              Set the targets used on this device and the web dashboard.
            </Text>
            <View className="flex-row flex-wrap gap-3">
              {targetFields.map(({ key, label, unit, placeholder }) => (
                <MealNutrientField
                  key={key}
                  accessibilityLabel={`Daily ${label.toLowerCase()} target`}
                  hint={unit}
                  label={label}
                  onChangeText={(value) =>
                    setTargetDraft((current) => ({
                      ...current,
                      [key]: value.trim() === "" ? null : value,
                    }))
                  }
                  placeholder={placeholder}
                  value={targetDraft[key] ?? ""}
                />
              ))}
            </View>
            <NutritionButton
              disabled={savingTarget}
              label={savingTarget ? "Saving…" : "Save daily target"}
              onPress={() => void saveTarget()}
            />
          </View>

          <View className="gap-3 rounded-[21px] border border-lifeos-border bg-lifeos-surface p-5 md:p-7">
            <Text className="text-lg font-bold text-lifeos-primary">
              Today's plan
            </Text>
            {state.dashboard.today.plan.length === 0 ? (
              <Text className="text-sm text-lifeos-muted">
                Nothing planned for today yet.
              </Text>
            ) : (
              state.dashboard.today.plan.map((meal) => (
                <View
                  key={meal.id}
                  className="flex-row flex-wrap items-center justify-between gap-2 border-t border-lifeos-border py-3"
                >
                  <View className="min-w-0 flex-1">
                    <Text
                      numberOfLines={1}
                      className="font-semibold text-lifeos-primary"
                    >
                      {meal.recipe_name}
                    </Text>
                    <Text className="mt-1 text-sm capitalize text-lifeos-muted">
                      {meal.meal_slot}
                    </Text>
                  </View>
                  <Text className="text-sm capitalize text-lifeos-muted">
                    {meal.status}
                  </Text>
                </View>
              ))
            )}
            <Text className="mt-2 text-lg font-bold text-lifeos-primary">
              Logged meals
            </Text>
            {state.dashboard.today.eaten_meals.length === 0 ? (
              <Text className="text-sm text-lifeos-muted">
                No meals logged today.
              </Text>
            ) : (
              state.dashboard.today.eaten_meals.map((meal) => (
                <View
                  key={meal.id}
                  className="flex-row items-center justify-between gap-3 border-t border-lifeos-border py-3"
                >
                  <View className="min-w-0 flex-1">
                    <Text
                      numberOfLines={1}
                      className="font-semibold text-lifeos-primary"
                    >
                      {meal.name}
                    </Text>
                    <Text className="mt-1 text-sm capitalize text-lifeos-muted">
                      {meal.meal_type}
                    </Text>
                  </View>
                  <Text className="text-sm text-lifeos-muted">
                    {display(meal.calories)} kcal
                  </Text>
                </View>
              ))
            )}
          </View>

          <View className="gap-3 rounded-[21px] border border-lifeos-border bg-lifeos-surface p-5 md:p-7">
            <Text className="text-lg font-bold text-lifeos-primary">
              Log a meal
            </Text>
            <View className="flex-row flex-wrap gap-2">
              {mealTypes.map((value) => (
                <NutritionButton
                  key={value}
                  label={capitalize(value)}
                  selected={mealType === value}
                  onPress={() => setMealType(value)}
                />
              ))}
            </View>
            <TextInput
              accessibilityLabel="Meal name"
              className="min-h-12 rounded-xl border border-lifeos-border bg-lifeos-background px-4 text-lifeos-primary"
              maxLength={160}
              onChangeText={setName}
              placeholder="What did you eat?"
              placeholderTextColor="#758078"
              value={name}
            />
            <View className="flex-row flex-wrap gap-3">
              <MealNutrientField
                accessibilityLabel="Meal calories"
                hint="Optional · kcal"
                label="Calories"
                onChangeText={setCalories}
                placeholder="e.g. 450"
                value={calories}
              />
              <MealNutrientField
                accessibilityLabel="Meal protein"
                hint="Optional · g"
                label="Protein"
                onChangeText={setProtein}
                placeholder="e.g. 25"
                value={protein}
              />
            </View>
            <NutritionButton
              disabled={saving || name.trim().length === 0}
              label={saving ? "Saving…" : "Save meal"}
              onPress={() => void saveMeal()}
            />
          </View>
        </>
      )}

      {formError ? (
        <Text
          accessibilityRole="alert"
          className="rounded-xl bg-red-50 p-4 text-sm text-red-800"
        >
          Check the meal name and nutrition values, then try again.
        </Text>
      ) : null}
    </ScrollView>
  );
}

const nutrients = [
  { key: "calories", label: "Calories", unit: "kcal" },
  { key: "protein_grams", label: "Protein", unit: "g" },
  { key: "carbohydrate_grams", label: "Carbs", unit: "g" },
  { key: "fat_grams", label: "Fat", unit: "g" },
] as const;

const targetFields = [
  { key: "calories", label: "Calories", unit: "kcal", placeholder: "2000" },
  { key: "protein_grams", label: "Protein", unit: "g", placeholder: "120" },
  { key: "carbohydrate_grams", label: "Carbs", unit: "g", placeholder: "240" },
  { key: "fat_grams", label: "Fat", unit: "g", placeholder: "65" },
] as const;

function MealNutrientField({
  accessibilityLabel,
  hint,
  label,
  onChangeText,
  placeholder,
  value,
}: {
  accessibilityLabel: string;
  hint: string;
  label: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  value: string;
}) {
  return (
    <View className="min-w-[140px] flex-1 gap-1.5">
      <View className="flex-row flex-wrap items-baseline justify-between gap-x-2">
        <Text className="text-sm font-semibold text-lifeos-primary">
          {label}
        </Text>
        <Text className="text-sm font-medium text-lifeos-muted">{hint}</Text>
      </View>
      <TextInput
        accessibilityLabel={accessibilityLabel}
        className="min-h-12 min-w-0 rounded-xl border border-lifeos-border bg-lifeos-background px-4 text-lifeos-primary"
        keyboardType="decimal-pad"
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#758078"
        value={value}
      />
    </View>
  );
}

function NutritionButton({
  disabled = false,
  label,
  onPress,
  selected = false,
}: {
  disabled?: boolean;
  label: string;
  onPress: () => void;
  selected?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled, selected }}
      className={`min-h-11 justify-center rounded-xl px-4 ${selected ? "bg-lifeos-accent" : "border border-lifeos-border bg-lifeos-surface"} ${disabled ? "opacity-50" : "active:opacity-70"}`}
      disabled={disabled}
      onPress={onPress}
    >
      <Text
        className={`text-sm font-semibold ${selected ? "text-lifeos-accent-ink" : "text-lifeos-primary"}`}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function optionalNonNegativeNumber(value: string): number | null | false {
  if (!value.trim()) return null;
  const parsed = Number(value.trim().replace(",", "."));
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : false;
}

function display(value: string | null): string {
  return value === null
    ? "—"
    : Number(value).toLocaleString(undefined, { maximumFractionDigits: 1 });
}

function capitalize(value: string): string {
  return `${value[0]?.toUpperCase() ?? ""}${value.slice(1)}`;
}
