import { Pressable, View } from "react-native";
import type { SwitchProps } from "./Switch.types";
import { switchThumbVariants, switchTrackVariants } from "./switchVariants";

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
      className={switchTrackVariants({
        checked,
        className,
        disabled,
        size,
      })}
      disabled={disabled}
      onPress={() => onCheckedChange(!checked)}
    >
      <View className={switchThumbVariants({ checked, size })} />
    </Pressable>
  );
}
