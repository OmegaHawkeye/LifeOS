import { ActivityIndicator, Pressable, Text } from "react-native";
import type { ButtonProps } from "./Button.types";
import { buttonLabelVariants, buttonVariants } from "./buttonVariants";
import { cn } from "./cn";

export function Button({
  accessibilityLabel,
  children,
  className = "",
  disabled = false,
  loading = false,
  onPress,
  selected,
  size,
  variant = "primary",
}: ButtonProps) {
  const isDisabled = disabled || loading;
  const isSelected = Boolean(selected);

  return (
    <Pressable
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      accessibilityState={{
        busy: loading,
        disabled: isDisabled,
        ...(selected === undefined ? {} : { selected }),
      }}
      className={cn(
        buttonVariants({
          className,
          disabled: isDisabled,
          selected: isSelected,
          size: size ?? (variant === "icon" ? "icon" : "md"),
          variant,
        }),
      )}
      disabled={isDisabled}
      onPress={onPress}
    >
      {loading ? <ActivityIndicator size="small" /> : null}
      {typeof children === "string" || typeof children === "number" ? (
        <Text
          className={cn(
            buttonLabelVariants({
              disabled: isDisabled,
              selected: isSelected,
              variant,
            }),
          )}
        >
          {children}
        </Text>
      ) : (
        children
      )}
    </Pressable>
  );
}
