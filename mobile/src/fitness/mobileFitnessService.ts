import {
  MobileApiError,
  type MobileAuthService,
} from "../auth/mobileAuthService";

type ApiEnvelope<T> = { data: T };

export type FitnessMetric = {
  id: number;
  metric_type: string;
  value: string;
  unit: string;
  measured_at: string;
  notes: string | null;
};

export type FitnessWorkoutSession = {
  id: number;
  name: string;
  status: "in_progress" | "completed";
  started_at: string;
  completed_at: string | null;
  duration_minutes: number | null;
  exercises: { id: number; exercise_name: string; sets: unknown[] }[];
};

export type FitnessDashboard = {
  active_goals: {
    id: number;
    metric_type: string;
    target_value: string;
    unit: string;
    target_date: string | null;
  }[];
  measurement_trends: {
    metric_type: string;
    unit: string;
    latest_value: string;
    change: string;
    direction: "up" | "down" | "steady";
    points: { date: string; value: string }[];
  }[];
  weekly_workouts: {
    planned: number;
    completed: number;
    missed: number;
    streak_days: number;
  };
  personal_records: {
    exercise_id: number;
    exercise_name: string;
    weight: string;
    weight_unit: "kg" | "lb";
    reps: number | null;
    achieved_at: string | null;
  }[];
  next_workout: {
    id: number;
    name: string;
    scheduled_for: string | null;
    scheduled_days: number[];
  } | null;
};

export type FitnessSnapshot = {
  dashboard: FitnessDashboard;
  metrics: FitnessMetric[];
  sessions: FitnessWorkoutSession[];
  measurementSystem: "metric" | "imperial";
};

export type CreateFitnessMetric = {
  metric_type: string;
  value: number;
  unit: string;
  measured_at: string;
  notes: string | null;
};

type MobileFitnessServiceOptions = {
  api: Pick<MobileAuthService, "request">;
};

export class MobileFitnessService {
  private readonly api: Pick<MobileAuthService, "request">;

  constructor(options: MobileFitnessServiceOptions) {
    this.api = options.api;
  }

  async loadFitnessSnapshot(): Promise<FitnessSnapshot> {
    const [dashboard, metrics, sessions, settings] = await Promise.all([
      this.api.request<ApiEnvelope<FitnessDashboard>>("/fitness/dashboard"),
      this.api.request<ApiEnvelope<FitnessMetric[]>>(
        "/fitness/body-metrics?days=90",
      ),
      this.api.request<ApiEnvelope<FitnessWorkoutSession[]>>(
        "/fitness/workout-sessions",
      ),
      this.api
        .request<ApiEnvelope<{ measurement_system: string }>>("/settings")
        .catch((error: unknown) => {
          if (error instanceof MobileApiError && error.status === 401) {
            throw error;
          }

          return null;
        }),
    ]);

    return {
      dashboard: dashboard.data,
      metrics: metrics.data,
      sessions: sessions.data,
      measurementSystem:
        settings?.data.measurement_system === "imperial"
          ? "imperial"
          : "metric",
    };
  }

  async recordMetric(metric: CreateFitnessMetric): Promise<void> {
    await this.api.request("/fitness/body-metrics", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(metric),
    });
  }
}
