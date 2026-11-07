import { Pressable, Text, View } from "react-native";
import type { SwitchProps } from "./Switch.types";
import { switchThumbVariants, switchTrackVariants } from "./switchVariants";
import { cn } from "./cn";

export function Switch({
  accessibilityLabel,
  checked,
  className = "",
  disabled = false,
  hint,
  label,
  onCheckedChange,
  size = "md",
}: SwitchProps) {
  const control = (
    <Pressable
      accessibilityHint={hint}
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityRole="switch"
      accessibilityState={{ checked, disabled }}
      className={cn(
        switchTrackVariants({
          checked,
          className: label ? undefined : className,
          disabled,
          size,
        }),
      )}
      disabled={disabled}
      onPress={() => onCheckedChange(!checked)}
    >
      <View className={cn(switchThumbVariants({ checked, size }))} />
    </Pressable>
  );

  if (!label) return control;

  return (
    <View
      className={cn(
        "min-h-target-min flex-row items-center justify-between gap-4 border-b border-line py-3",
        className,
      )}
    >
      <View className="flex-1">
        <Text className="text-body text-ink">{label}</Text>
        {hint ? (
          <Text className="text-body-s text-ink-muted">{hint}</Text>
        ) : null}
      </View>
      {control}
    </View>
  );
}
