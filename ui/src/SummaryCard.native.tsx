import { Text, View } from "react-native";
import type { SummaryCardProps } from "./SummaryCard.types";

export function SummaryCard({ title, detail }: SummaryCardProps) {
  return (
    <View className="min-h-[132px] w-full flex-1 rounded-md border border-line bg-surface p-5 md:w-[47%]">
      <Text className="text-title-m text-ink">{title}</Text>
      <Text className="mt-3 text-body-s text-ink-muted">{detail}</Text>
    </View>
  );
}
