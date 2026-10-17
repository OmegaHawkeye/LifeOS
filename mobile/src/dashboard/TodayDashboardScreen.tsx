import { useCallback, useEffect, useState } from "react";
import type { ReactNode } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  View,
  useColorScheme,
} from "react-native";
import { Button } from "@lifeos/ui/button";
import { AppIcon } from "@lifeos/ui/icons";
import type { LifeOSIconName } from "@lifeos/ui/icons";
import { SignalCard } from "@lifeos/ui/signal-card";
import { tokenColor } from "@lifeos/ui/tokens";
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

type ModuleTone = "finance" | "fitness" | "nutrition" | "health";

const quickActions: {
  label: string;
  destination: Destination;
  icon: LifeOSIconName;
  tone: ModuleTone;
  tile: string;
}[] = [
  {
    label: "Record a transaction",
    destination: "Finance",
    icon: "finance",
    tone: "finance",
    tile: "bg-finance-soft",
  },
  {
    label: "Start a workout",
    destination: "Fitness",
    icon: "fitness",
    tone: "fitness",
    tile: "bg-fitness-soft",
  },
  {
    label: "Plan a meal",
    destination: "Nutrition",
    icon: "nutrition",
    tone: "nutrition",
    tile: "bg-nutrition-soft",
  },
  {
    label: "Open Health",
    destination: "Health",
    icon: "health",
    tone: "health",
    tile: "bg-health-soft",
  },
];

export function TodayDashboardScreen({
  onNavigate,
  service,
}: TodayDashboardScreenProps) {
  const [state, setState] = useState<ScreenState>({ status: "loading" });

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
    <ScrollView
      className="flex-1"
      contentContainerClassName="mx-auto w-full max-w-content gap-6 px-4 pb-10 pt-6 tablet:gap-8 tablet:px-6 tablet:pt-8 desktop:px-8"
      testID="today-dashboard-scroll"
    >
      <PageHead />

      {state.status === "loading" ? (
        <View
          accessibilityLabel="Loading today's overview"
          className="min-h-[180px] items-center justify-center gap-3 rounded-md border border-line bg-surface p-6"
        >
          <ActivityIndicator colorClassName="accent-primary" size="large" />
          <Text className="text-body-s text-ink-muted">Loading your day…</Text>
        </View>
      ) : state.status === "error" ? (
        <View className="min-h-[180px] items-center justify-center gap-3 rounded-md border border-line bg-surface p-6">
          <Text className="text-center text-title-m text-ink">
            Today’s overview is unavailable
          </Text>
          <Text className="text-center text-body-s text-ink-muted">
            Check your connection to your LifeOS server and try again.
          </Text>
          <Button onPress={() => void loadSnapshot()}>Try again</Button>
        </View>
      ) : (
        <>
          <Section title="Quick add">
            <View className="flex-row flex-wrap gap-2">
              {quickActions.map((action) => (
                <QuickAction
                  action={action}
                  key={action.label}
                  onPress={() => onNavigate(action.destination)}
                />
              ))}
            </View>
          </Section>

          <Section title="Signals">
            <View className="flex-row flex-wrap gap-4">
              <SignalSlot>
                <FinanceCard
                  onOpen={() => onNavigate("Finance")}
                  snapshot={state.snapshot}
                />
              </SignalSlot>
              <SignalSlot>
                <FitnessCard
                  onOpen={() => onNavigate("Fitness")}
                  snapshot={state.snapshot}
                />
              </SignalSlot>
              <SignalSlot>
                <NutritionCard
                  onOpen={() => onNavigate("Nutrition")}
                  snapshot={state.snapshot}
                />
              </SignalSlot>
              <SignalSlot>
                <RoutinesCard snapshot={state.snapshot} />
              </SignalSlot>
            </View>
          </Section>
        </>
      )}
    </ScrollView>
  );
}

function PageHead() {
  const today = new Date();

  return (
    <View className="gap-1">
      <View className="flex-row items-center gap-2">
        <View className="size-2 rounded-full bg-marigold" />
        <Text className="text-body-s text-ink-muted">
          {formatLongDate(today)}
        </Text>
      </View>
      <Text
        accessibilityRole="header"
        className="text-display-m text-ink tablet:text-display-l"
      >
        Today
      </Text>
    </View>
  );
}

function Section({ children, title }: { children: ReactNode; title: string }) {
  return (
    <View className="gap-3">
      <Text
        accessibilityRole="header"
        className="text-overline uppercase text-ink-muted"
      >
        {title}
      </Text>
      {children}
    </View>
  );
}

function SignalSlot({ children }: { children: ReactNode }) {
  return (
    <View className="min-w-0 grow basis-full tablet:basis-[45%]">
      {children}
    </View>
  );
}

function QuickAction({
  action,
  onPress,
}: {
  action: (typeof quickActions)[number];
  onPress: () => void;
}) {
  const scheme = useColorScheme() === "dark" ? "dark" : "light";

  return (
    <Pressable
      accessibilityRole="button"
      className="min-h-target-touch grow basis-[45%] flex-row items-center gap-3 rounded-sm border border-line bg-surface px-3 py-2 active:bg-surface-sunken tablet:basis-[22%]"
      onPress={onPress}
    >
      <View
        className={`size-8 items-center justify-center rounded-sm ${action.tile}`}
      >
        <AppIcon
          color={tokenColor(action.tone, scheme)}
          name={action.icon}
          size={18}
        />
      </View>
      <Text className="flex-1 text-label text-ink">{action.label}</Text>
    </Pressable>
  );
}

function FinanceCard({
  onOpen,
  snapshot,
}: {
  onOpen: () => void;
  snapshot: TodaySnapshot;
}) {
  const total = snapshot.finance?.totals[0];
  let detail: string;
  let value: string | undefined;

  if (snapshot.finance === null) {
    detail =
      "Finance summary is unavailable. Your other summaries are still available.";
  } else if (total === undefined) {
    detail = "Record your first transaction to see this month's cashflow.";
  } else if (snapshot.maskSensitiveData) {
    detail = "Sensitive values are hidden by your settings.";
  } else {
    value = formatMoney(total.net_cashflow, total.currency);
    detail = "Net cashflow this month";
  }

  return (
    <SignalCard
      action="Open finance"
      detail={detail}
      eyebrow={formatMonth(new Date())}
      module="finance"
      onAction={onOpen}
      title="Cash flow"
      value={value}
    />
  );
}

function FitnessCard({
  onOpen,
  snapshot,
}: {
  onOpen: () => void;
  snapshot: TodaySnapshot;
}) {
  const fitness = snapshot.fitness;
  const week = fitness?.weekly_workouts;
  let detail: string | undefined;

  if (fitness === null) {
    detail =
      "Fitness summary is unavailable. Your other summaries are still available.";
  } else if (
    fitness.next_workout === null &&
    fitness.weekly_workouts.planned === 0
  ) {
    detail = "Log a workout to start your weekly view.";
  }

  return (
    <SignalCard
      action={fitness?.next_workout ? "Start" : "Open fitness"}
      detail={detail}
      module="fitness"
      next={
        week && week.planned > 0
          ? `${week.completed} of ${week.planned} planned workouts completed this week.`
          : undefined
      }
      onAction={onOpen}
      title="Next workout"
      value={fitness?.next_workout?.name}
    />
  );
}

function NutritionCard({
  onOpen,
  snapshot,
}: {
  onOpen: () => void;
  snapshot: TodaySnapshot;
}) {
  const today = snapshot.nutrition?.today;
  const detail =
    today === undefined
      ? snapshot.nutrition === null
        ? "Nutrition summary is unavailable. Your other summaries are still available."
        : "Plan or log a meal to see today's nutrition."
      : today.planned_meal_count + today.eaten_meal_count === 0
        ? "Plan or log a meal to see today's nutrition."
        : `${today.eaten_meal_count} logged · ${today.planned_meal_count} planned today`;

  return (
    <SignalCard
      action="Open plan"
      detail={detail}
      module="nutrition"
      onAction={onOpen}
      title="Meals today"
    />
  );
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

  return (
    <SignalCard detail={detail} module="routines" title="Today’s routines" />
  );
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

function formatLongDate(date: Date): string {
  return new Intl.DateTimeFormat(undefined, {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(date);
}

function formatMonth(date: Date): string {
  return new Intl.DateTimeFormat(undefined, { month: "long" }).format(date);
}
