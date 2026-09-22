import {
  MobileApiError,
  type MobileAuthService,
} from "../auth/mobileAuthService";

type ApiEnvelope<T> = { data: T };

type FinanceOverview = {
  totals: { currency: string; net_cashflow: string }[];
};

type FitnessDashboard = {
  weekly_workouts: { planned: number; completed: number; streak_days: number };
  next_workout: { name: string; scheduled_for: string | null } | null;
};

type NutritionDashboard = {
  today: { planned_meal_count: number; eaten_meal_count: number };
};

type RoutineOverview = {
  routines: {
    id: number;
    title: string;
    status: string;
    is_scheduled_today: boolean;
  }[];
};

type OwnerDashboardSettings = {
  mask_sensitive_data_by_default: boolean;
  timezone: string;
};

export type TodaySnapshot = {
  finance: FinanceOverview | null;
  fitness: FitnessDashboard | null;
  nutrition: NutritionDashboard | null;
  routines: RoutineOverview | null;
  maskSensitiveData: boolean;
};

type MobileDashboardServiceOptions = {
  api: Pick<MobileAuthService, "request">;
  now?: () => Date;
};

export class MobileDashboardService {
  private readonly api: Pick<MobileAuthService, "request">;
  private readonly now: () => Date;

  constructor(options: MobileDashboardServiceOptions) {
    this.api = options.api;
    this.now = options.now ?? (() => new Date());
  }

  async loadTodaySnapshot(): Promise<TodaySnapshot> {
    const now = this.now();
    const settings =
      await this.loadOptional<OwnerDashboardSettings>("/settings");
    const timezone = settings?.data.timezone ?? deviceTimeZone();
    const month = calendarMonth(now, timezone);
    const weekStart = calendarWeekStart(now, timezone);
    const [finance, fitness, nutrition, routines] = await Promise.all([
      this.loadOptional<FinanceOverview>(`/finance/overview?month=${month}`),
      this.loadOptional<FitnessDashboard>("/fitness/dashboard"),
      this.loadOptional<NutritionDashboard>(
        `/nutrition/dashboard?week_start=${weekStart}`,
      ),
      this.loadOptional<RoutineOverview>("/routines"),
    ]);

    return {
      finance: finance?.data ?? null,
      fitness: fitness?.data ?? null,
      nutrition: nutrition?.data ?? null,
      routines: routines?.data ?? null,
      maskSensitiveData: settings?.data.mask_sensitive_data_by_default ?? true,
    };
  }

  private async loadOptional<T>(path: string): Promise<ApiEnvelope<T> | null> {
    try {
      return await this.api.request<ApiEnvelope<T>>(path);
    } catch (error) {
      if (error instanceof MobileApiError && error.status === 401) {
        throw error;
      }

      return null;
    }
  }
}

function calendarMonth(date: Date, timezone: string): string {
  const parts = calendarDateParts(date, timezone);

  return `${parts.year}-${parts.month}`;
}

function calendarWeekStart(date: Date, timezone: string): string {
  const parts = calendarDateParts(date, timezone);
  const calendarDate = new Date(
    Date.UTC(Number(parts.year), Number(parts.month) - 1, Number(parts.day)),
  );
  calendarDate.setUTCDate(
    calendarDate.getUTCDate() - ((calendarDate.getUTCDay() + 6) % 7),
  );

  return calendarDate.toISOString().slice(0, 10);
}

function calendarDateParts(
  date: Date,
  timezone: string,
): Record<string, string> {
  return Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", {
      day: "2-digit",
      month: "2-digit",
      timeZone: timezone,
      year: "numeric",
    })
      .formatToParts(date)
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, part.value]),
  );
}

function deviceTimeZone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
}
