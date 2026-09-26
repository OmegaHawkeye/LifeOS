import type { ReactNode } from "react";

export type ButtonVariant =
  "primary" | "secondary" | "tertiary" | "danger" | "icon";

export type ButtonProps = {
  accessibilityLabel?: string;
  children: ReactNode;
  className?: string;
  disabled?: boolean;
  loading?: boolean;
  onPress?: () => void;
  selected?: boolean;
  type?: "button" | "submit" | "reset";
  variant?: ButtonVariant;
};

export declare function Button(props: ButtonProps): ReactNode;
