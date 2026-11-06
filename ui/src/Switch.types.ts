import type { ReactNode } from "react";
import type { SwitchVariantProps } from "./switchVariants";

type SwitchBaseProps = Omit<SwitchVariantProps, "checked" | "disabled"> & {
  checked: boolean;
  className?: string;
  disabled?: boolean;
  onCheckedChange: (checked: boolean) => void;
};

/**
 * Either a bare control named by `accessibilityLabel`, or a settings row with a
 * visible `label` (stating the "on" condition, e.g. "Back up every night") and
 * an optional `hint`. The visible label names the control.
 */
export type SwitchProps = SwitchBaseProps &
  (
    | { label: string; hint?: string; accessibilityLabel?: string }
    | { label?: undefined; hint?: undefined; accessibilityLabel: string }
  );

export declare function Switch(props: SwitchProps): ReactNode;
