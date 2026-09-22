import { Text, View } from "react-native";
import type { SummaryCardProps } from "./SummaryCard.types";

export function SummaryCard({ title, detail }: SummaryCardProps) {
  return (
    <View className="min-h-[132px] w-full flex-1 rounded-[21px] border border-lifeos-border bg-lifeos-surface p-5 dark:border-white/10 dark:bg-stone-900 md:w-[47%]">
      <Text className="text-lg font-bold text-lifeos-primary dark:text-stone-100">
        {title}
      </Text>
      <Text className="mt-3 text-sm leading-[21px] text-lifeos-muted dark:text-stone-400">
        {detail}
      </Text>
    </View>
  );
}
