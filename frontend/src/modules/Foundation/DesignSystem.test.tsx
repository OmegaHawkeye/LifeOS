// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { AppNav } from "@lifeos/ui/app-nav";
import { Meter } from "@lifeos/ui/meter";
import { SegmentedControl } from "@lifeos/ui/segmented-control";
import { SignalCard } from "@lifeos/ui/signal-card";
import { Switch } from "@lifeos/ui/switch";
import { Tag } from "@lifeos/ui/tag";

describe("shared web design-system components", () => {
  it("renders a status tag with its tone", () => {
    render(<Tag tone="warning">82% of budget</Tag>);

    expect(screen.getByText("82% of budget").className).toContain(
      "text-warning",
    );
  });

  it("exposes meter progress and clamps the fill", () => {
    render(
      <Meter
        label="Eating out"
        max={500}
        note="€32 over budget"
        tone="danger"
        value={532}
        valueText="€532"
      />,
    );

    const meter = screen.getByRole("meter", { name: "Eating out" });
    expect(meter).toHaveAttribute("aria-valuenow", "532");
    expect(meter.firstElementChild).toHaveStyle({ width: "100%" });
    expect(screen.getByText("€32 over budget")).toHaveClass("text-danger");
  });

  it("moves the segmented selection on click", () => {
    function Range() {
      const [value, setValue] = useState("week");
      return (
        <SegmentedControl
          label="Range"
          onChange={setValue}
          options={[
            { value: "week", label: "Week" },
            { value: "month", label: "Month" },
          ]}
          value={value}
        />
      );
    }
    render(<Range />);

    fireEvent.click(screen.getByRole("radio", { name: "Month" }));
    expect(screen.getByRole("radio", { name: "Month" })).toHaveAttribute(
      "aria-checked",
      "true",
    );
    expect(screen.getByRole("radio", { name: "Week" })).toHaveAttribute(
      "aria-checked",
      "false",
    );
  });

  it("toggles a setting switch", () => {
    const onChange = vi.fn();
    render(
      <Switch
        checked={false}
        hint="02:00 to the NAS"
        label="Back up every night"
        onChange={onChange}
      />,
    );

    fireEvent.click(
      screen.getByRole("switch", { name: /Back up every night/ }),
    );
    expect(onChange).toHaveBeenCalledWith(true);
  });

  it("renders a signal card with its next action", () => {
    const onAction = vi.fn();
    render(
      <SignalCard
        action="Review"
        module="finance"
        next="Eating out is €32 over budget"
        onAction={onAction}
        title="Cash flow"
        trend="up"
        trendText="€310 more than September"
        value="+€1,240"
      />,
    );

    expect(screen.getByRole("region", { name: "Cash flow" })).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Review" }));
    expect(onAction).toHaveBeenCalled();
  });

  it("marks the current page and keeps full names as link names", () => {
    render(
      <AppNav
        current="finance"
        items={[
          { id: "today", label: "Today", href: "/dashboard", icon: "today" },
          {
            id: "finance",
            label: "Finance",
            shortLabel: "Money",
            href: "/finance",
            icon: "finance",
          },
        ]}
        owner="Julian"
      />,
    );

    expect(screen.getByRole("link", { name: "Finance" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(screen.getByRole("link", { name: "Today" })).not.toHaveAttribute(
      "aria-current",
    );
  });
});
