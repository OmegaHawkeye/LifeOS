import { Pressable, View } from "react-native";
import type { SwitchProps } from "./Switch.types";
import { switchThumbVariants, switchTrackVariants } from "./switchVariants";
import { cn } from "./cn";

export function Switch({
  accessibilityLabel,
  checked,
  className = "",
  disabled = false,
  onCheckedChange,
  size = "md",
}: SwitchProps) {
  return (
    <Pressable
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="switch"
      accessibilityState={{ checked, disabled }}
      className={cn(
        switchTrackVariants({
          checked,
          className,
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
}
