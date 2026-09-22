export type LifeOSIconName =
  | "today"
  | "finance"
  | "fitness"
  | "nutrition"
  | "health"
  | "settings";

export type AppIconProps = {
  name: LifeOSIconName;
  size?: number;
  color?: string;
  testID?: string;
};

export declare const AppIcon: (props: AppIconProps) => import("react").JSX.Element;
