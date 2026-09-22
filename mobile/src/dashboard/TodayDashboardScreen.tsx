import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { SummaryCard } from "@lifeos/ui";
import type {
  MobileDashboardService,
  TodaySnapshot,
} from "./mobileDashboardService";

type Destination = "Finance" | "Fitness" | "Nutrition" | "Health";
type TodayDashboardScreenProps = {
  service: Pick<MobileDashboardService, "loadTodaySnapshot">;
  onNavigate: (destination: Destination) => void;
};

type ScreenState =
  | { status: "loading" }
  | { status: "ready"; snapshot: TodaySnapshot }
  | { status: "error" };

export function TodayDashboardScreen({
  onNavigate,
  service,
}: TodayDashboardScreenProps) {
  const { width } = useWindowDimensions();
  const [state, setState] = useState<ScreenState>({ status: "loading" });
  const isTablet = width >= 760;

  const loadSnapshot = useCallback(async () => {
    setState({ status: "loading" });

    try {
      setState({
        status: "ready",
        snapshot: await service.loadTodaySnapshot(),
      });
    } catch {
      setState({ status: "error" });
    }
  }, [service]);

  useEffect(() => {
    void loadSnapshot();
  }, [loadSnapshot]);

  return (
    <ScrollView contentContainerClassName="mx-auto w-full max-w-[1120px] gap-2 px-[30px] pb-11 pt-11">
      <Text className="mt-[18px] text-sm font-semibold text-lifeos-accent-dark">
        Your day, in context
      </Text>
      <Text className="text-[38px] font-bold tracking-[-0.7px] text-lifeos-primary">
        Today
      </Text>
      <Text className="mb-3 mt-0.5 text-[15px] leading-[22px] text-lifeos-muted">
        A calm starting point for the decisions and actions that matter today.
      </Text>

      {state.status === "loading" ? (
        <View
          accessibilityLabel="Loading today's overview"
          className="mt-3 min-h-[180px] items-center justify-center gap-3 rounded-[21px] border border-lifeos-border bg-lifeos-surface p-6"
        >
          <ActivityIndicator
            colorClassName="accent-lifeos-accent-dark"
            size="large"
          />
          <Text className="text-sm text-lifeos-muted">Loading your day…</Text>
        </View>
      ) : state.status === "error" ? (
        <View className="mt-3 min-h-[180px] items-center justify-center gap-3 rounded-[21px] border border-lifeos-border bg-lifeos-surface p-6">
          <Text className="text-center text-lg font-bold text-lifeos-primary">
            Today’s overview is unavailable
          </Text>
          <Text className="text-center text-sm leading-[21px] text-lifeos-muted">
            Check your connection to your LifeOS server and try again.
          </Text>
          <Pressable
            accessibilityRole="button"
            className="mt-1 min-h-11 justify-center rounded-xl bg-lifeos-accent px-4 active:opacity-70"
            onPress={() => void loadSnapshot()}
          >
            <Text className="text-sm font-bold text-lifeos-accent-ink">
              Try again
            </Text>
          </Pressable>
        </View>
      ) : (
        <>
          <View className="mt-2 flex-row flex-wrap gap-2.5">
            <QuickAction
              label="Record a transaction"
              onPress={() => onNavigate("Finance")}
            />
            <QuickAction
              label="Start a workout"
              onPress={() => onNavigate("Fitness")}
            />
            <QuickAction
              label="Plan a meal"
              onPress={() => onNavigate("Nutrition")}
            />
            <QuickAction
              label="Open Health"
              onPress={() => onNavigate("Health")}
            />
          </View>

          <View
            className={`mt-3 gap-3 ${isTablet ? "md:flex-row md:flex-wrap" : ""}`}
          >
            <FinanceCard snapshot={state.snapshot} />
            <FitnessCard snapshot={state.snapshot} />
            <NutritionCard snapshot={state.snapshot} />
            <RoutinesCard snapshot={state.snapshot} />
          </View>
        </>
      )}
    </ScrollView>
  );
}

function QuickAction({
  label,
  onPress,
}: {
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      className="min-h-12 justify-center rounded-[14px] bg-lifeos-accent px-4 active:opacity-70"
      onPress={onPress}
    >
      <Text className="text-sm font-bold text-lifeos-accent-ink">{label}</Text>
    </Pressable>
  );
}

function FinanceCard({ snapshot }: { snapshot: TodaySnapshot }) {
  const total = snapshot.finance?.totals[0];
  let detail: string;

  if (snapshot.finance === null) {
    detail =
      "Finance summary is unavailable. Your other summaries are still available.";
  } else if (total === undefined) {
    detail = "Record your first transaction to see this month's cashflow.";
  } else if (snapshot.maskSensitiveData) {
    detail = "Sensitive values are hidden by your settings.";
  } else {
    detail = `${formatMoney(total.net_cashflow, total.currency)} net cashflow this month.`;
  }

  return <SummaryCard title="Finance" detail={detail} />;
}

function FitnessCard({ snapshot }: { snapshot: TodaySnapshot }) {
  const fitness = snapshot.fitness;
  let detail: string;

  if (fitness === null) {
    detail =
      "Fitness summary is unavailable. Your other summaries are still available.";
  } else if (fitness.next_workout !== null) {
    detail = fitness.next_workout.name;
  } else if (fitness.weekly_workouts.planned > 0) {
    detail = `${fitness.weekly_workouts.completed} of ${fitness.weekly_workouts.planned} planned workouts completed this week.`;
  } else {
    detail = "Log a workout to start your weekly view.";
  }

  return <SummaryCard title="Fitness" detail={detail} />;
}

function NutritionCard({ snapshot }: { snapshot: TodaySnapshot }) {
  const today = snapshot.nutrition?.today;
  const detail =
    today === undefined
      ? snapshot.nutrition === null
        ? "Nutrition summary is unavailable. Your other summaries are still available."
        : "Plan or log a meal to see today's nutrition."
      : today.planned_meal_count + today.eaten_meal_count === 0
        ? "Plan or log a meal to see today's nutrition."
        : `${today.eaten_meal_count} logged · ${today.planned_meal_count} planned today`;

  return <SummaryCard title="Nutrition" detail={detail} />;
}

function RoutinesCard({ snapshot }: { snapshot: TodaySnapshot }) {
  const routines = snapshot.routines?.routines;
  const dueRoutines =
    routines?.filter(
      (routine) => routine.is_scheduled_today && routine.status !== "completed",
    ) ?? [];
  const detail =
    routines === undefined
      ? "Your routines could not be loaded. Other summaries remain available."
      : dueRoutines.length === 0
        ? "No routines due today. Add one when you're ready."
        : dueRoutines.map((routine) => routine.title).join(" · ");

  return <SummaryCard title="Today’s routines" detail={detail} />;
}

function formatMoney(amount: string, currency: string): string {
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    }).format(Number(amount));
  } catch {
    return `${amount} ${currency}`;
  }
}
