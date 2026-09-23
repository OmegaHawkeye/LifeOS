import { useCallback, useEffect, useState } from "react";
import type { ReactNode } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { SummaryCard } from "@lifeos/ui";
import type { FitnessSnapshot } from "./mobileFitnessService";
import type { MobileFitnessService } from "./mobileFitnessService";

type MetricType = "weight" | "body_fat" | "waist" | "chest";
type FitnessScreenProps = {
  service: Pick<
    MobileFitnessService,
    "loadFitnessSnapshot" | "recordMetric" | "createGoal"
  >;
};

type ScreenState =
  | { status: "loading" }
  | { status: "ready"; snapshot: FitnessSnapshot }
  | { status: "error" };

const metricLabels: Record<MetricType, string> = {
  weight: "Weight",
  body_fat: "Body fat",
  waist: "Waist",
  chest: "Chest",
};

export function FitnessScreen({ service }: FitnessScreenProps) {
  const [state, setState] = useState<ScreenState>({ status: "loading" });
  const [metricType, setMetricType] = useState<MetricType>("weight");
  const [value, setValue] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState("");
  const [goalTarget, setGoalTarget] = useState("");
  const [goalDate, setGoalDate] = useState("");
  const [saving, setSaving] = useState(false);
  const [savingGoal, setSavingGoal] = useState(false);
  const [saveError, setSaveError] = useState(false);

  const reload = useCallback(async () => {
    setState({ status: "loading" });

    try {
      setState({
        status: "ready",
        snapshot: await service.loadFitnessSnapshot(),
      });
    } catch {
      setState({ status: "error" });
    }
  }, [service]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const measurementSystem =
    state.status === "ready" ? state.snapshot.measurementSystem : "metric";
  const unit = metricUnit(metricType, measurementSystem);

  const saveMetric = async () => {
    const parsedValue = Number(value.trim().replace(",", "."));

    if (
      !Number.isFinite(parsedValue) ||
      parsedValue <= 0 ||
      !isCalendarDate(date)
    ) {
      setSaveError(true);
      return;
    }

    setSaving(true);
    setSaveError(false);

    try {
      await service.recordMetric({
        metric_type: metricType,
        value: parsedValue,
        unit,
        measured_at: `${date}T12:00:00Z`,
        notes: notes.trim() || null,
      });
      setValue("");
      setNotes("");
      await reload();
    } catch {
      setSaveError(true);
    } finally {
      setSaving(false);
    }
  };

  const saveGoal = async () => {
    const parsedTarget = Number(goalTarget.trim().replace(",", "."));
    if (!Number.isFinite(parsedTarget) || parsedTarget <= 0 || (goalDate && !isCalendarDate(goalDate))) {
      setSaveError(true);
      return;
    }

    setSavingGoal(true);
    setSaveError(false);
    try {
      await service.createGoal({
        metric_type: metricType,
        target_value: parsedTarget,
        unit,
        target_date: goalDate || null,
      });
      setGoalTarget("");
      setGoalDate("");
      await reload();
    } catch {
      setSaveError(true);
    } finally {
      setSavingGoal(false);
    }
  };

  return (
    <ScrollView
      className="flex-1"
      contentContainerClassName="mx-auto w-full max-w-[1120px] gap-3 px-5 pb-12 pt-8 md:px-9 md:pt-10"
    >
      <Text className="text-sm font-semibold text-lifeos-accent-dark">
        Progress you can feel
      </Text>
      <Text className="text-[38px] font-bold tracking-[-0.7px] text-lifeos-primary">
        Fitness
      </Text>
      <Text className="mb-3 text-[15px] leading-[22px] text-lifeos-muted">
        Your training and body progress, stored on your LifeOS server.
      </Text>

      {state.status === "loading" ? (
        <View
          accessibilityLabel="Loading fitness overview"
          className="min-h-[180px] items-center justify-center gap-3 rounded-[21px] border border-lifeos-border bg-lifeos-surface p-6"
        >
          <ActivityIndicator size="large" />
          <Text className="text-sm text-lifeos-muted">
            Loading your fitness data…
          </Text>
        </View>
      ) : state.status === "error" ? (
        <View className="min-h-[180px] items-center justify-center gap-3 rounded-[21px] border border-lifeos-border bg-lifeos-surface p-6">
          <Text className="text-center text-lg font-bold text-lifeos-primary">
            Fitness data is unavailable
          </Text>
          <Text className="text-center text-sm leading-[21px] text-lifeos-muted">
            Check your connection to your LifeOS server and try again.
          </Text>
          <ActionButton label="Try again" onPress={() => void reload()} />
        </View>
      ) : (
        <>
          <View
            className="flex-row flex-wrap gap-3"
            testID="fitness-summary-cards"
          >
            <View
              className="w-full sm:w-[48%] md:w-[48%] xl:w-[23%]"
              testID="fitness-summary-card"
            >
              <SummaryCard
                title="This week"
                detail={weeklyWorkoutDetail(
                  state.snapshot.dashboard.weekly_workouts,
                )}
              />
            </View>
            <View
              className="w-full sm:w-[48%] md:w-[48%] xl:w-[23%]"
              testID="fitness-summary-card"
            >
              <SummaryCard
                title="Next workout"
                detail={
                  state.snapshot.dashboard.next_workout?.name ??
                  "Nothing scheduled yet."
                }
              />
            </View>
            <View
              className="w-full sm:w-[48%] md:w-[48%] xl:w-[23%]"
              testID="fitness-summary-card"
            >
              <SummaryCard
                title="Latest body progress"
                detail={latestMetricDetail(state.snapshot)}
              />
            </View>
            <View
              className="w-full sm:w-[48%] md:w-[48%] xl:w-[23%]"
              testID="fitness-summary-card"
            >
              <SummaryCard
                title="Recent training"
                detail={latestSessionDetail(state.snapshot)}
              />
            </View>
          </View>

          <View className="mt-2 rounded-[21px] border border-lifeos-border bg-lifeos-surface p-5 md:p-7">
            <Text className="text-xl font-bold text-lifeos-primary">
              Record a body metric
            </Text>
            <Text className="mt-2 text-sm leading-[21px] text-lifeos-muted">
              Add a measurement to keep your progress history up to date.
            </Text>

            <View className="mt-5 gap-4">
              <View className="flex-row flex-wrap gap-3">
                {(Object.keys(metricLabels) as MetricType[]).map((type) => (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityState={{ selected: metricType === type }}
                    key={type}
                    onPress={() => setMetricType(type)}
                    className={`min-h-11 justify-center rounded-xl border px-4 ${metricType === type ? "border-lifeos-accent-dark bg-lifeos-accent/25" : "border-lifeos-border bg-lifeos-background"}`}
                  >
                    <Text className="text-sm font-semibold text-lifeos-primary">
                      {metricLabels[type]}
                    </Text>
                  </Pressable>
                ))}
              </View>

              <View className="flex-row flex-wrap gap-3">
                <Field label="Value" className="min-w-[140px] flex-1">
                  <TextInput
                    accessibilityLabel="Metric value"
                    className="min-h-12 rounded-xl border border-lifeos-border bg-lifeos-background px-4 text-base text-lifeos-primary"
                    keyboardType="decimal-pad"
                    onChangeText={setValue}
                    placeholder="0.0"
                    value={value}
                  />
                </Field>
                <Field label="Unit" className="w-24">
                  <View className="min-h-12 justify-center rounded-xl border border-lifeos-border bg-lifeos-background px-4">
                    <Text
                      accessibilityLabel="Metric unit"
                      className="text-base text-lifeos-primary"
                    >
                      {unit}
                    </Text>
                  </View>
                </Field>
                <Field label="Date" className="min-w-[160px] flex-1">
                  <TextInput
                    accessibilityLabel="Metric date"
                    className="min-h-12 rounded-xl border border-lifeos-border bg-lifeos-background px-4 text-base text-lifeos-primary"
                    onChangeText={setDate}
                    placeholder="YYYY-MM-DD"
                    value={date}
                  />
                </Field>
              </View>

              <Field label="Notes">
                <TextInput
                  accessibilityLabel="Metric notes"
                  className="min-h-12 rounded-xl border border-lifeos-border bg-lifeos-background px-4 py-3 text-base text-lifeos-primary"
                  onChangeText={setNotes}
                  placeholder="Optional"
                  value={notes}
                />
              </Field>

              {saveError ? (
                <Text
                  accessibilityRole="alert"
                  className="text-sm text-red-700"
                >
                  Your metric could not be saved. Check the value and try again.
                </Text>
              ) : null}
              <ActionButton
                disabled={saving || state.status !== "ready"}
                label={saving ? "Saving…" : "Save measurement"}
                onPress={() => void saveMetric()}
              />
            </View>
          </View>

          <View className="rounded-[21px] border border-lifeos-border bg-lifeos-surface p-5 md:p-7">
            <Text className="text-xl font-bold text-lifeos-primary">
              Set a fitness goal
            </Text>
            <Text className="mt-2 text-sm leading-[21px] text-lifeos-muted">
              Track a target alongside your body measurements.
            </Text>
            <View className="mt-5 gap-4">
              <Field label={`Target (${unit})`}>
                <TextInput
                  accessibilityLabel="Goal target"
                  className="min-h-12 rounded-xl border border-lifeos-border bg-lifeos-background px-4 text-base text-lifeos-primary"
                  keyboardType="decimal-pad"
                  onChangeText={setGoalTarget}
                  placeholder="Target value"
                  value={goalTarget}
                />
              </Field>
              <Field label="Target date">
                <TextInput
                  accessibilityLabel="Goal target date"
                  className="min-h-12 rounded-xl border border-lifeos-border bg-lifeos-background px-4 text-base text-lifeos-primary"
                  onChangeText={setGoalDate}
                  placeholder="YYYY-MM-DD (optional)"
                  value={goalDate}
                />
              </Field>
              <ActionButton
                disabled={savingGoal || goalTarget.trim().length === 0}
                label={savingGoal ? "Saving…" : "Save fitness goal"}
                onPress={() => void saveGoal()}
              />
            </View>
          </View>
        </>
      )}
    </ScrollView>
  );
}

function Field({
  children,
  className = "w-full",
  label,
}: {
  children: ReactNode;
  className?: string;
  label: string;
}) {
  return (
    <View className={`gap-2 ${className}`}>
      <Text className="text-sm font-semibold text-lifeos-primary">{label}</Text>
      {children}
    </View>
  );
}

function ActionButton({
  disabled = false,
  label,
  onPress,
}: {
  disabled?: boolean;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      className={`min-h-12 items-center justify-center rounded-xl px-5 ${disabled ? "bg-lifeos-border" : "bg-lifeos-accent active:opacity-70"}`}
      disabled={disabled}
      onPress={onPress}
    >
      <Text className="text-sm font-bold text-lifeos-accent-ink">{label}</Text>
    </Pressable>
  );
}

function latestMetricDetail(snapshot: FitnessSnapshot): string {
  const latest = snapshot.metrics[0];
  return latest
    ? `${metricLabels[latest.metric_type as MetricType] ?? latest.metric_type}: ${latest.value} ${latest.unit} · ${metricDateLabel(latest.measured_at)}`
    : "No body metrics yet. Record your first measurement below.";
}

function weeklyWorkoutDetail(
  summary: FitnessSnapshot["dashboard"]["weekly_workouts"],
): string {
  const { completed, planned, streak_days: streakDays } = summary;

  if (completed === 0 && planned === 0) {
    return "No workouts completed this week.";
  }

  if (planned > 0) {
    return `${completed} of ${planned} workouts completed · ${streakDays}-day streak`;
  }

  return `${completed} ${completed === 1 ? "workout" : "workouts"} completed this week · ${streakDays}-day streak`;
}

function latestSessionDetail(snapshot: FitnessSnapshot): string {
  const session = snapshot.sessions.find((item) => item.status === "completed");
  return session
    ? `${session.name} · ${session.exercises.length} ${session.exercises.length === 1 ? "exercise" : "exercises"}`
    : "No completed workouts yet. Your training history will appear here.";
}

function metricDateLabel(value: string): string {
  return new Intl.DateTimeFormat(undefined, {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
    year: "numeric",
  }).format(new Date(value));
}

function metricUnit(
  type: MetricType,
  measurementSystem: "metric" | "imperial",
): string {
  if (type === "body_fat") return "%";
  if (type === "weight") return measurementSystem === "imperial" ? "lb" : "kg";
  return measurementSystem === "imperial" ? "in" : "cm";
}

function isCalendarDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return (
    Number.isFinite(parsed.getTime()) &&
    parsed.toISOString().slice(0, 10) === value
  );
}
