import { Pressable, Text, useColorScheme, View } from "react-native";
import Svg, { Path, Rect } from "react-native-svg";
import { AppIcon } from "./AppIcon.native";
import type { AppNavProps, LogoMarkProps } from "./AppNav.types";
import { Button } from "./Button.native";
import { tokenColor } from "./nativeTokens";

export { appNavLayout } from "./appNavLayout";

function useScheme() {
  return useColorScheme() === "dark" ? "dark" : "light";
}

export function LogoMark({ size = 32 }: LogoMarkProps) {
  const scheme = useScheme();

  return (
    <Svg
      accessibilityElementsHidden
      accessible={false}
      height={size}
      importantForAccessibility="no"
      viewBox="0 0 64 64"
      width={size}
    >
      <Rect fill={tokenColor("ink", scheme)} height={64} rx={16} width={64} />
      <Path
        d="M18 18v28h28"
        fill="none"
        stroke={tokenColor("primary", scheme)}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={7}
      />
      <Path
        d="M29 18v17h17"
        fill="none"
        stroke={tokenColor("canvas", scheme)}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={7}
      />
    </Svg>
  );
}

export function AppNav({
  current,
  items,
  layout = "tabbar",
  onNavigate,
  onSignOut,
  owner,
}: AppNavProps) {
  const scheme = useScheme();
  const visibleItems =
    layout === "tabbar" ? items.filter((item) => !item.hideOnPhone) : items;
  const isSidebar = layout === "sidebar";

  return (
    <View
      className={
        layout === "tabbar"
          ? "flex-row border-t border-line bg-surface px-2 pt-1"
          : `flex-1 border-r border-line bg-canvas ${isSidebar ? "w-sidebar gap-8 px-4 py-6" : "w-rail items-center gap-6 px-2 py-4"}`
      }
    >
      {layout === "tabbar" ? null : (
        <View className="flex-row items-center gap-3 px-1">
          <LogoMark />
          {isSidebar ? (
            <Text className="text-title-s text-ink">LifeOS</Text>
          ) : null}
        </View>
      )}
      <View
        className={
          layout === "tabbar"
            ? "flex-1 flex-row justify-around"
            : `w-full flex-1 ${isSidebar ? "gap-0.5" : "gap-1"}`
        }
      >
        {visibleItems.map((item) => {
          const active = item.id === current;
          const iconColor = tokenColor(
            active ? "primary-text" : "ink-muted",
            scheme,
          );

          return (
            <Pressable
              accessibilityLabel={`Navigate to ${item.label}`}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              className={
                isSidebar
                  ? `min-h-target-min flex-row items-center gap-3 rounded-sm px-3 ${active ? "bg-primary-soft" : "active:bg-surface-sunken"}`
                  : `items-center justify-center gap-1 py-2 ${layout === "tabbar" ? "min-h-14 flex-1" : "w-full"}`
              }
              key={item.id}
              onPress={() => onNavigate?.(item.id)}
              testID={`navigation-${item.icon}`}
            >
              {isSidebar ? (
                <AppIcon color={iconColor} name={item.icon} size={20} />
              ) : (
                <View
                  className={`items-center justify-center rounded-full ${layout === "tabbar" ? "h-7 w-12" : "h-8 w-14"} ${active ? "bg-primary-soft" : ""}`}
                >
                  <AppIcon color={iconColor} name={item.icon} size={22} />
                </View>
              )}
              <Text
                className={`${isSidebar ? "text-label" : "text-caption"} ${active ? "text-primary-text" : "text-ink-muted"}`}
                numberOfLines={1}
              >
                {isSidebar ? item.label : (item.shortLabel ?? item.label)}
              </Text>
            </Pressable>
          );
        })}
      </View>
      {owner && layout !== "tabbar" ? (
        <View
          className={`w-full items-center gap-2 border-t border-line pt-4 ${isSidebar ? "flex-row gap-3" : ""}`}
        >
          <View className="size-9 items-center justify-center rounded-full bg-primary-soft">
            <Text className="text-label text-primary-text">
              {owner.charAt(0).toUpperCase()}
            </Text>
          </View>
          {isSidebar ? (
            <Text className="flex-1 text-label text-ink" numberOfLines={1}>
              {owner}
            </Text>
          ) : null}
          {onSignOut ? (
            <Button
              className="min-h-9 px-2"
              onPress={onSignOut}
              variant="tertiary"
            >
              Sign out
            </Button>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}
