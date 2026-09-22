import {
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react-native";
import type {
  FitnessSnapshot,
  MobileFitnessService,
} from "./mobileFitnessService";
import { FitnessScreen } from "./FitnessScreen";

const emptySnapshot: FitnessSnapshot = {
  dashboard: {
    active_goals: [],
    measurement_trends: [],
    weekly_workouts: { planned: 0, completed: 0, missed: 0, streak_days: 0 },
    personal_records: [],
    next_workout: null,
  },
  metrics: [],
  sessions: [],
  measurementSystem: "metric",
};

function fitnessService(
  overrides: Partial<MobileFitnessService> = {},
): MobileFitnessService {
  return {
    loadFitnessSnapshot: jest.fn().mockResolvedValue(emptySnapshot),
    recordMetric: jest.fn().mockResolvedValue(undefined),
    ...overrides,
  } as unknown as MobileFitnessService;
}

describe("native Fitness screen", () => {
  test("shows saved activity and submits a body measurement, then reloads it", async () => {
    const savedSnapshot: FitnessSnapshot = {
      ...emptySnapshot,
      metrics: [
        {
          id: 1,
          metric_type: "weight",
          value: "72.4",
          unit: "kg",
          measured_at: "2026-09-21T12:00:00Z",
          notes: null,
        },
      ],
      sessions: [
        {
          id: 2,
          name: "Upper body",
          status: "completed",
          started_at: "2026-09-20T10:00:00Z",
          completed_at: "2026-09-20T10:45:00Z",
          duration_minutes: 45,
          exercises: [{ id: 3, exercise_name: "Bench press", sets: [] }],
        },
      ],
    };
    const service = fitnessService({
      loadFitnessSnapshot: jest
        .fn()
        .mockResolvedValueOnce(emptySnapshot)
        .mockResolvedValueOnce(savedSnapshot),
    });

    await render(<FitnessScreen service={service} />);

    expect(
      await screen.findByText(
        "No completed workouts yet. Your training history will appear here.",
      ),
    ).toBeTruthy();
    await fireEvent.changeText(screen.getByLabelText("Metric value"), "72.4");
    await fireEvent.press(
      screen.getByRole("button", { name: "Save measurement" }),
    );

    await waitFor(() =>
      expect(service.recordMetric).toHaveBeenCalledWith({
        metric_type: "weight",
        value: 72.4,
        unit: "kg",
        measured_at: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T12:00:00Z$/),
        notes: null,
      }),
    );
    expect(await screen.findByText(/Upper body · 1 exercise$/)).toBeTruthy();
    expect(screen.getByText(/Weight: 72.4 kg ·/)).toBeTruthy();
    expect(screen.queryByText(/2026-09-21/)).toBeNull();
    expect(
      screen.getByTestId("fitness-summary-cards").props.className,
    ).toContain("flex-row flex-wrap");
    expect(screen.getAllByTestId("fitness-summary-card")).toHaveLength(4);
    for (const card of screen.getAllByTestId("fitness-summary-card")) {
      expect(card.props.className).toContain("w-full sm:w-[48%] md:w-[48%]");
    }
    expect(service.loadFitnessSnapshot).toHaveBeenCalledTimes(2);
  });

  test("provides a useful empty state when no activity exists", async () => {
    await render(<FitnessScreen service={fitnessService()} />);

    expect(
      await screen.findByText("No workouts completed this week."),
    ).toBeTruthy();
    expect(screen.getByText("Nothing scheduled yet.")).toBeTruthy();
    expect(
      await screen.findByText(
        "No body metrics yet. Record your first measurement below.",
      ),
    ).toBeTruthy();
    expect(
      screen.getByText(
        "No completed workouts yet. Your training history will appear here.",
      ),
    ).toBeTruthy();
  });

  test("offers retry after a failed load", async () => {
    const service = fitnessService({
      loadFitnessSnapshot: jest
        .fn()
        .mockRejectedValueOnce(new Error("Offline"))
        .mockResolvedValueOnce(emptySnapshot),
    });

    await render(<FitnessScreen service={service} />);
    await fireEvent.press(
      await screen.findByRole("button", { name: "Try again" }),
    );

    expect(await screen.findByText("Record a body metric")).toBeTruthy();
    expect(service.loadFitnessSnapshot).toHaveBeenCalledTimes(2);
  });
});
