import { ActivityIndicator, Pressable, Text } from "react-native";
import type { ButtonProps } from "./Button.types";

const variants: Record<NonNullable<ButtonProps["variant"]>, string> = {
  primary: "bg-primary",
  secondary: "border border-line-strong bg-surface",
  tertiary: "bg-transparent",
  danger: "bg-danger",
  icon: "size-target-min border border-line-strong bg-surface p-0",
};

const labelVariants: Record<NonNullable<ButtonProps["variant"]>, string> = {
  primary: "text-on-primary",
  secondary: "text-ink",
  tertiary: "text-primary-text",
  danger: "text-on-danger",
  icon: "text-ink",
};

const disabledVariants: Record<NonNullable<ButtonProps["variant"]>, string> = {
  primary: "bg-surface-sunken",
  secondary: "border border-line bg-surface-sunken",
  tertiary: "bg-transparent",
  danger: "bg-surface-sunken",
  icon: "border border-line bg-surface-sunken",
};

const pressedVariants: Record<NonNullable<ButtonProps["variant"]>, string> = {
  primary: "active:bg-primary-hover",
  secondary: "active:bg-surface-sunken",
  tertiary: "active:bg-primary-soft",
  danger: "active:opacity-80",
  icon: "active:bg-surface-sunken",
};

export function Button({
  accessibilityLabel,
  children,
  className = "",
  disabled = false,
  loading = false,
  onPress,
  selected,
  variant = "primary",
}: ButtonProps) {
  const isDisabled = disabled || loading;

  return (
    <Pressable
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      accessibilityState={{
        busy: loading,
        disabled: isDisabled,
        ...(selected === undefined ? {} : { selected }),
      }}
      className={`items-center justify-center rounded-sm ${variant === "icon" ? "" : "min-h-target-min flex-row gap-2 px-4"} ${isDisabled ? disabledVariants[variant] : selected ? "border border-primary bg-primary-soft" : variants[variant]} ${isDisabled ? "" : pressedVariants[variant]} ${className}`.trim()}
      disabled={isDisabled}
      onPress={onPress}
    >
      {loading ? <ActivityIndicator size="small" /> : null}
      {typeof children === "string" || typeof children === "number" ? (
        <Text
          className={`text-label ${isDisabled ? "text-ink-muted" : selected ? "text-primary-text" : labelVariants[variant]}`}
        >
          {children}
        </Text>
      ) : (
        children
      )}
    </Pressable>
  );
}
