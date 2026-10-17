import { Pressable, Text, View } from "react-native";
import type { SegmentedControlProps } from "./SegmentedControl.types";

export function SegmentedControl({
  block = false,
  label,
  onChange,
  options,
  value,
}: SegmentedControlProps) {
  return (
    <View
      accessibilityLabel={label}
      accessibilityRole="radiogroup"
      className={`flex-row gap-0.5 rounded-[11px] bg-surface-sunken p-[3px] ${block ? "" : "self-start"}`}
    >
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable
            accessibilityRole="radio"
            accessibilityState={{ checked: selected }}
            className={`min-h-[38px] items-center justify-center rounded-sm px-4 ${block ? "flex-1" : ""} ${selected ? "border border-line-strong bg-surface" : ""}`}
            key={option.value}
            onPress={() => onChange(option.value)}
          >
            <Text
              className={`text-label ${selected ? "text-ink" : "text-ink-muted"}`}
            >
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
