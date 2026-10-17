export type LifeOSIconName =
  | "today"
  | "finance"
  | "fitness"
  | "nutrition"
  | "health"
  | "settings"
  | "routines"
  | "review"
  | "plus"
  | "check"
  | "close"
  | "chevron-right"
  | "chevron-down"
  | "trend-up"
  | "trend-down"
  | "bell"
  | "calendar"
  | "scale"
  | "alert"
  | "info"
  | "server"
  | "more";

export type AppIconProps = {
  name: LifeOSIconName;
  size?: number;
  color?: string;
  testID?: string;
};

export declare const AppIcon: (
  props: AppIconProps,
) => import("react").JSX.Element;
