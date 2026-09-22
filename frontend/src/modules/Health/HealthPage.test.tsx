// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { HealthPage } from "./HealthPage";
import { getHealthTrendsSummary } from "./health";
import type { HealthTrendsSummary } from "./health";

vi.mock("./health", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./health")>();
  return { ...actual, getHealthTrendsSummary: vi.fn() };
});

describe("HealthPage", () => {
  afterEach(cleanup);

  beforeEach(() => {
    vi.mocked(getHealthTrendsSummary).mockResolvedValue(summary());
  });

  it("shows measured trends and keeps source detail available without crowding the cards", async () => {
    render(<HealthPage />);

    expect(await screen.findByText("10,000 steps")).toBeVisible();
    expect(screen.getByText("Up 2,000 steps")).toBeVisible();
    expect(screen.getByText("Manual 1 · Imported 2")).toBeVisible();
    const details = screen.getAllByText("Sources")[0];
    await userEvent.setup().click(details);
    expect(
      await screen.findByText("Apple Health XML · 2 samples"),
    ).toBeVisible();
    expect(screen.getByText("7.5 hours")).toBeVisible();
  });

  it("requests each selected range and shows calm empty states", async () => {
    vi.mocked(getHealthTrendsSummary).mockResolvedValue({
      ...summary(),
      trends: [],
    });
    const user = userEvent.setup();
    render(<HealthPage />);

    expect(
      await screen.findAllByText(/Nothing recorded in this range/),
    ).toHaveLength(5);
    await user.selectOptions(screen.getByLabelText("Time range"), "ytd");

    await waitFor(() =>
      expect(getHealthTrendsSummary).toHaveBeenLastCalledWith("ytd"),
    );
    expect(
      screen.getAllByText(/Manual entries and connected health imports/),
    ).toHaveLength(5);
  });
});

function summary(): HealthTrendsSummary {
  return {
    range: "30d",
    from: "2026-08-22",
    to: "2026-09-20",
    trends: [
      {
        sample_type: "steps",
        unit: "count",
        total: "10000.0000",
        latest_value: "6000.0000",
        change: "2000.0000",
        direction: "up",
        points: [
          { date: "2026-09-19", value: "4000.0000" },
          { date: "2026-09-20", value: "6000.0000" },
        ],
        source_counts: {
          manual: 1,
          imported: 2,
          sources: [
            { id: 2, name: "Apple Health XML", kind: "file", count: 2 },
            { id: 1, name: "Manual entries", kind: "manual", count: 1 },
          ],
        },
      },
      {
        sample_type: "sleep",
        unit: "hour",
        total: "7.5000",
        latest_value: "7.5000",
        change: "0.0000",
        direction: "steady",
        points: [{ date: "2026-09-19", value: "7.5000" }],
        source_counts: { manual: 0, imported: 1, sources: [] },
      },
    ],
  };
}
