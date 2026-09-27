import type { ReactNode } from "react";
import type { SwitchVariantProps } from "./switchVariants";

export type SwitchProps = SwitchVariantProps & {
  accessibilityLabel: string;
  checked: boolean;
  className?: string;
  onCheckedChange: (checked: boolean) => void;
};

export declare function Switch(props: SwitchProps): ReactNode;
