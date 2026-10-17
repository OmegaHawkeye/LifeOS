import { useEffect, useRef } from "react";
import { AccessibilityInfo, Animated, Easing, Text, View } from "react-native";
import type { MeterProps } from "./Meter.types";
import {
  meterFillClasses,
  meterGeometry,
  meterNoteClasses,
} from "./meterGeometry";

export function Meter(props: MeterProps) {
  const {
    label,
    max = 100,
    note,
    ofText,
    tone = "finance",
    value,
    valueText,
  } = props;
  const geometry = meterGeometry(props);
  const growth = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    let cancelled = false;
    void AccessibilityInfo.isReduceMotionEnabled().then((reduceMotion) => {
      if (cancelled) return;
      if (reduceMotion) {
        growth.setValue(1);
        return;
      }
      Animated.timing(growth, {
        delay: 150,
        duration: 600,
        easing: Easing.bezier(0.3, 0.7, 0.2, 1),
        toValue: 1,
        useNativeDriver: false,
      }).start();
    });
    return () => {
      cancelled = true;
    };
  }, [growth]);

  return (
    <View className="gap-2">
      <View className="flex-row items-baseline justify-between gap-3">
        <Text className="text-body-s text-ink">{label}</Text>
        <Text className="text-body-s font-semibold text-ink">
          {valueText}
          {ofText ? (
            <Text className="font-normal text-ink-muted"> {ofText}</Text>
          ) : null}
        </Text>
      </View>
      <View
        accessibilityLabel={label}
        accessibilityRole="progressbar"
        accessible
        accessibilityValue={{ max, min: 0, now: value, text: valueText }}
        className="relative h-2 rounded-xs border border-line bg-surface-sunken"
      >
        {/* Animated.View takes no className under Uniwind, so it only animates the width of a styled fill. */}
        <Animated.View
          style={{
            bottom: 0,
            left: 0,
            position: "absolute",
            top: 0,
            width: growth.interpolate({
              inputRange: [0, 1],
              outputRange: ["0%", `${geometry.fill}%`],
            }),
          }}
        >
          <View className={`h-full rounded-xs ${meterFillClasses[tone]}`} />
        </Animated.View>
        {geometry.target === undefined ? null : (
          <View
            className="absolute -inset-y-[3px] w-0.5 bg-ink"
            style={{ left: `${geometry.target}%` }}
          />
        )}
      </View>
      {note ? (
        <Text className={`text-caption ${meterNoteClasses[tone]}`}>{note}</Text>
      ) : null}
    </View>
  );
}
