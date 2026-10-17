import { Text, useColorScheme, View } from "react-native";
import { AppIcon } from "./AppIcon.native";
import { Button } from "./Button.native";
import { tokenColor } from "./nativeTokens";
import type { SignalCardProps } from "./SignalCard.types";
import { moduleTileClasses } from "./tones";

const trendClasses = {
  up: "text-primary-text",
  down: "text-danger",
  flat: "text-ink-muted",
} as const;

export function SignalCard({
  action,
  children,
  detail,
  eyebrow,
  icon,
  module,
  next,
  onAction,
  title,
  trend = "flat",
  trendText,
  unit,
  value,
}: SignalCardProps) {
  const scheme = useColorScheme() === "dark" ? "dark" : "light";
  const [tileBackground] = moduleTileClasses[module].split(" ");

  return (
    <View
      accessibilityLabel={title}
      className="gap-4 rounded-md border border-line bg-surface p-4 tablet:p-5"
    >
      <View className="flex-row items-center gap-3">
        <View
          className={`size-9 items-center justify-center rounded-sm ${tileBackground}`}
        >
          <AppIcon color={tokenColor(module, scheme)} name={icon ?? module} />
        </View>
        <Text className="flex-1 text-title-s text-ink">{title}</Text>
        {eyebrow ? (
          <Text className="text-caption text-ink-muted">{eyebrow}</Text>
        ) : null}
      </View>
      {value === undefined ? null : (
        <View>
          <View className="flex-row flex-wrap items-baseline gap-2">
            <Text className="text-figure-xl text-ink">{value}</Text>
            {unit ? (
              <Text className="font-mono text-unit text-ink-muted">{unit}</Text>
            ) : null}
            {trendText ? (
              <Text
                className={`text-body-s font-semibold ${trendClasses[trend]}`}
              >
                {trendText}
              </Text>
            ) : null}
          </View>
        </View>
      )}
      {detail ? (
        <Text className="-mt-2 text-body-s text-ink-muted">{detail}</Text>
      ) : null}
      {children}
      {next || action ? (
        <View className="flex-row items-center justify-between gap-3 border-t border-line pt-3">
          <Text className="flex-1 text-body-s text-ink">{next}</Text>
          {action ? (
            <Button onPress={onAction} variant="tertiary">
              {action}
            </Button>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}
