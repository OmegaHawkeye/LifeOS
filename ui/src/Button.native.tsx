import { ActivityIndicator, Pressable, Text } from "react-native";
import type { ButtonProps } from "./Button.types";

const variants: Record<NonNullable<ButtonProps["variant"]>, string> = {
  primary: "bg-lifeos-accent",
  secondary:
    "border border-lifeos-border bg-lifeos-surface dark:border-white/15 dark:bg-stone-900",
  tertiary: "bg-transparent dark:text-stone-100",
  danger: "bg-red-700",
  icon: "size-11 rounded-lg border border-lifeos-border bg-lifeos-surface p-0 dark:border-white/15 dark:bg-stone-900",
};

const labelVariants: Record<NonNullable<ButtonProps["variant"]>, string> = {
  primary: "text-lifeos-accent-ink",
  secondary: "text-lifeos-primary",
  tertiary: "text-lifeos-primary",
  danger: "text-white",
  icon: "text-lifeos-primary",
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
      className={`${variant === "icon" ? "items-center justify-center" : "min-h-11 flex-row items-center justify-center gap-2 rounded-xl px-4 py-2"} ${variants[variant]} ${isDisabled ? "bg-stone-200" : "active:opacity-80"} ${className}`.trim()}
      disabled={isDisabled}
      onPress={onPress}
    >
      {loading ? <ActivityIndicator size="small" /> : null}
      {typeof children === "string" || typeof children === "number" ? (
        <Text
          className={`text-sm font-semibold ${isDisabled ? "text-stone-500 dark:text-stone-400" : labelVariants[variant]}`}
        >
          {children}
        </Text>
      ) : (
        children
      )}
    </Pressable>
  );
}
