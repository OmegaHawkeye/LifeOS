import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { Button } from "@lifeos/ui/button";
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
    <ScrollView
      className="flex-1"
      contentContainerClassName="mx-auto w-full max-w-content gap-3 px-4 pb-10 pt-6 tablet:px-6 tablet:pt-8 desktop:px-8"
    >
      <Text className="text-overline uppercase text-ink-muted">
        Eat with intention
      </Text>
      <Text
        accessibilityRole="header"
        className="text-display-m text-ink tablet:text-display-l"
      >
        Nutrition
      </Text>
      <Text className="mb-2 text-body text-ink-muted">
        Your meals and goals, stored on your LifeOS server.
      </Text>

      {state.status === "loading" ? (
        <View
          accessibilityLabel="Loading nutrition data"
          className="min-h-[180px] items-center justify-center gap-3 rounded-md border border-line bg-surface p-6"
        >
          <ActivityIndicator size="large" />
          <Text className="text-body-s text-ink-muted">
            Loading your nutrition…
          </Text>
        </View>
      ) : state.status === "error" ? (
        <View className="min-h-[180px] items-center justify-center gap-3 rounded-md border border-line bg-surface p-6">
          <Text className="text-center text-title-m font-semibold text-ink">
            Nutrition data is unavailable
          </Text>
          <Text className="text-center text-body-s text-ink-muted">
            Check your connection to your LifeOS server and try again.
          </Text>
          <NutritionButton label="Try again" onPress={() => void reload()} />
        </View>
      ) : (
        <>
          <View className="rounded-md border border-line bg-surface p-5 tablet:p-6">
            <Text className="text-title-m font-semibold text-ink">
              Today · {state.dashboard.today.date}
            </Text>
            <Text className="mt-1 text-body-s text-ink-muted">
              {state.dashboard.today.planned_meal_count} planned ·{" "}
              {state.dashboard.today.eaten_meal_count} logged
            </Text>
            {Object.values(state.dashboard.target).every(
              (value) => value === null,
            ) ? (
              <Text className="mt-3 text-body-s text-ink-muted">
                No daily nutrition targets are set yet. You can set them in the
                web app.
              </Text>
            ) : null}
            <View className="mt-4 flex-row flex-wrap gap-3">
              {nutrients.map(({ key, label, unit }) => (
                <View
                  key={key}
                  className="min-w-[130px] flex-1 rounded-md bg-canvas p-4"
                >
                  <Text className="text-caption text-ink-muted">{label}</Text>
                  <Text className="mt-1 text-title-m font-semibold text-ink">
                    {display(state.dashboard.today.eaten[key])} /{" "}
                    {display(state.dashboard.target[key])} {unit}
                  </Text>
                  <Text className="mt-1 text-caption text-ink-muted">
                    logged / target
                  </Text>
                </View>
              ))}
            </View>
          </View>

          <View className="gap-3 rounded-md border border-line bg-surface p-5 tablet:p-6">
            <Text className="text-title-m font-semibold text-ink">
              Daily nutrition target
            </Text>
            <Text className="text-body-s text-ink-muted">
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
              loading={savingTarget}
              label={savingTarget ? "Saving…" : "Save daily target"}
              onPress={() => void saveTarget()}
            />
          </View>

          <View className="gap-3 rounded-md border border-line bg-surface p-5 tablet:p-6">
            <Text className="text-title-m font-semibold text-ink">
              Today's plan
            </Text>
            {state.dashboard.today.plan.length === 0 ? (
              <Text className="text-body-s text-ink-muted">
                Nothing planned for today yet.
              </Text>
            ) : (
              state.dashboard.today.plan.map((meal) => (
                <View
                  key={meal.id}
                  className="flex-row flex-wrap items-center justify-between gap-2 border-t border-line py-3"
                >
                  <View className="min-w-0 flex-1">
                    <Text numberOfLines={1} className="font-semibold text-ink">
                      {meal.recipe_name}
                    </Text>
                    <Text className="mt-1 text-body-s capitalize text-ink-muted">
                      {meal.meal_slot}
                    </Text>
                  </View>
                  <Text className="text-body-s capitalize text-ink-muted">
                    {meal.status}
                  </Text>
                </View>
              ))
            )}
            <Text className="mt-2 text-title-m font-semibold text-ink">
              Logged meals
            </Text>
            {state.dashboard.today.eaten_meals.length === 0 ? (
              <Text className="text-body-s text-ink-muted">
                No meals logged today.
              </Text>
            ) : (
              state.dashboard.today.eaten_meals.map((meal) => (
                <View
                  key={meal.id}
                  className="flex-row items-center justify-between gap-3 border-t border-line py-3"
                >
                  <View className="min-w-0 flex-1">
                    <Text numberOfLines={1} className="font-semibold text-ink">
                      {meal.name}
                    </Text>
                    <Text className="mt-1 text-body-s capitalize text-ink-muted">
                      {meal.meal_type}
                    </Text>
                  </View>
                  <Text className="text-body-s text-ink-muted">
                    {display(meal.calories)} kcal
                  </Text>
                </View>
              ))
            )}
          </View>

          <View className="gap-3 rounded-md border border-line bg-surface p-5 tablet:p-6">
            <Text className="text-title-m font-semibold text-ink">
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
              className="min-h-12 rounded-sm border border-line bg-canvas px-4 text-ink"
              maxLength={160}
              onChangeText={setName}
              placeholder="What did you eat?"
              placeholderTextColorClassName="accent-ink-muted"
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
              disabled={
                saving ||
                name.trim().length === 0 ||
                optionalNonNegativeNumber(calories) === false ||
                optionalNonNegativeNumber(protein) === false
              }
              loading={saving}
              label={saving ? "Saving…" : "Save meal"}
              onPress={() => void saveMeal()}
            />
          </View>
        </>
      )}

      {formError ? (
        <Text
          accessibilityRole="alert"
          className="rounded-sm bg-danger-soft p-4 text-body-s text-danger"
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
        <Text className="text-body-s font-semibold text-ink">{label}</Text>
        <Text className="text-body-s font-medium text-ink-muted">{hint}</Text>
      </View>
      <TextInput
        accessibilityLabel={accessibilityLabel}
        className="min-h-12 min-w-0 rounded-sm border border-line bg-canvas px-4 text-ink"
        keyboardType="decimal-pad"
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColorClassName="accent-ink-muted"
        value={value}
      />
    </View>
  );
}

function NutritionButton({
  disabled = false,
  label,
  onPress,
  loading = false,
  selected = false,
}: {
  disabled?: boolean;
  label: string;
  loading?: boolean;
  onPress: () => void;
  selected?: boolean;
}) {
  return (
    <Button
      className="flex-1"
      disabled={disabled}
      loading={loading}
      onPress={onPress}
      selected={selected}
      variant={selected ? "primary" : "secondary"}
    >
      {label}
    </Button>
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
