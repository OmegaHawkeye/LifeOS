import { Text, View } from "react-native";
import type { TagProps } from "./Tag.types";
import { tagToneClasses } from "./tagTones";

export function Tag({ children, tone = "neutral" }: TagProps) {
  const [background, text] = tagToneClasses[tone].split(" ");

  return (
    <View
      className={`h-6 flex-row items-center self-start rounded-xs px-2 ${background}`}
    >
      <Text className={`text-caption font-semibold ${text}`}>{children}</Text>
    </View>
  );
}
