import {
  Switch as NativeSwitch,
  Text,
  useColorScheme,
  View,
} from "react-native";
import { tokenColor } from "./nativeTokens";
import type { SwitchProps } from "./Switch.types";

export function Switch({
  checked,
  disabled,
  hint,
  label,
  onChange,
}: SwitchProps) {
  const scheme = useColorScheme() === "dark" ? "dark" : "light";

  return (
    <View className="min-h-target-min flex-row items-center justify-between gap-4 border-b border-line py-3">
      <View className="flex-1">
        <Text className="text-body text-ink">{label}</Text>
        {hint ? (
          <Text className="text-body-s text-ink-muted">{hint}</Text>
        ) : null}
      </View>
      <NativeSwitch
        accessibilityLabel={label}
        disabled={disabled}
        ios_backgroundColor={tokenColor("surface-sunken", scheme)}
        onValueChange={onChange}
        thumbColor={tokenColor(checked ? "on-primary" : "ink-muted", scheme)}
        trackColor={{
          false: tokenColor("surface-sunken", scheme),
          true: tokenColor("primary", scheme),
        }}
        value={checked}
      />
    </View>
  );
}
