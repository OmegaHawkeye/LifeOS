import type { ReactNode } from "react";
import type { ButtonVariantProps } from "./buttonVariants";

export type ButtonVariant = NonNullable<ButtonVariantProps["variant"]>;

export type ButtonProps = Omit<ButtonVariantProps, "disabled" | "selected"> & {
  accessibilityLabel?: string;
  children: ReactNode;
  className?: string;
  disabled?: boolean;
  loading?: boolean;
  onPress?: () => void;
  selected?: boolean;
  type?: "button" | "submit" | "reset";
};

export declare function Button(props: ButtonProps): ReactNode;
