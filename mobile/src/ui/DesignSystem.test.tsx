import { fireEvent, render, screen } from "@testing-library/react-native";
import { AppNav, appNavLayout } from "@lifeos/ui/app-nav";
import { Meter } from "@lifeos/ui/meter";
import { SegmentedControl } from "@lifeos/ui/segmented-control";
import { SignalCard } from "@lifeos/ui/signal-card";
import { Switch } from "@lifeos/ui/switch";
import { Tag } from "@lifeos/ui/tag";

describe("shared native design-system components", () => {
  it("renders a status tag with its words", async () => {
    await render(<Tag tone="danger">Over budget</Tag>);

    expect(screen.getByText("Over budget").props.className).toContain(
      "text-danger",
    );
  });

  it("exposes meter progress to assistive technology", async () => {
    await render(
      <Meter
        label="Groceries"
        max={500}
        note="€88 left"
        ofText="of €500"
        tone="finance"
        value={412}
        valueText="€412"
      />,
    );

    const meter = screen.getByRole("progressbar", { name: "Groceries" });
    expect(meter.props.accessibilityValue).toMatchObject({
      max: 500,
      now: 412,
    });
    expect(screen.getByText("€88 left")).toBeTruthy();
  });

  it("selects a segment and reports the new value", async () => {
    const onChange = jest.fn();
    await render(
      <SegmentedControl
        label="Range"
        onChange={onChange}
        options={[
          { value: "week", label: "Week" },
          { value: "month", label: "Month" },
        ]}
        value="week"
      />,
    );

    expect(
      screen.getByRole("radio", { name: "Week" }).props.accessibilityState,
    ).toMatchObject({ checked: true });
    fireEvent.press(screen.getByRole("radio", { name: "Month" }));
    expect(onChange).toHaveBeenCalledWith("month");
  });

  it("toggles a setting switch", async () => {
    const onCheckedChange = jest.fn();
    await render(
      <Switch
        checked={false}
        label="Back up every night"
        onCheckedChange={onCheckedChange}
      />,
    );

    fireEvent.press(
      screen.getByRole("switch", { name: "Back up every night" }),
    );
    expect(onCheckedChange).toHaveBeenCalledWith(true);
  });

  it("renders a signal card with its next action", async () => {
    const onAction = jest.fn();
    await render(
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

    expect(screen.getByText("+€1,240")).toBeTruthy();
    fireEvent.press(screen.getByRole("button", { name: "Review" }));
    expect(onAction).toHaveBeenCalled();
  });

  it("picks the nav layout from the shared breakpoints", () => {
    expect(appNavLayout(390)).toBe("tabbar");
    expect(appNavLayout(820)).toBe("rail");
    expect(appNavLayout(1180)).toBe("sidebar");
  });

  it("leaves phone-hidden items out of the tab bar and reports the current item", async () => {
    const onNavigate = jest.fn();
    const items = [
      { id: "today", label: "Today", icon: "today" },
      { id: "finance", label: "Finance", shortLabel: "Money", icon: "finance" },
      {
        id: "settings",
        label: "Settings",
        icon: "settings",
        hideOnPhone: true,
      },
    ] as const;
    await render(
      <AppNav
        current="today"
        items={items}
        layout="tabbar"
        onNavigate={onNavigate}
      />,
    );

    expect(screen.getByText("Money")).toBeTruthy();
    expect(screen.queryByTestId("navigation-settings")).toBeNull();
    expect(
      screen.getByRole("button", { name: "Navigate to Today", selected: true }),
    ).toBeTruthy();
    fireEvent.press(
      screen.getByRole("button", { name: "Navigate to Finance" }),
    );
    expect(onNavigate).toHaveBeenCalledWith("finance");
  });
});
