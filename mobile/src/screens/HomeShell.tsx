import { useMemo, useState } from "react";
import {
  Pressable,
  Text,
  View,
  useColorScheme,
  useWindowDimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useMobileAuth } from "../auth/authContext";
import { HealthSyncScreen } from "../health/HealthSyncScreen";
import { TodayDashboardScreen } from "../dashboard/TodayDashboardScreen";
import { MobileDashboardService } from "../dashboard/mobileDashboardService";
import { FitnessScreen } from "../fitness/FitnessScreen";
import { MobileFitnessService } from "../fitness/mobileFitnessService";
import { FinanceScreen } from "../finance/FinanceScreen";
import { MobileFinanceService } from "../finance/mobileFinanceService";
import { NutritionScreen } from "../nutrition/NutritionScreen";
import { MobileNutritionService } from "../nutrition/mobileNutritionService";
import { TwoFactorSettingsScreen } from "../auth/TwoFactorSettingsScreen";
import { MobileTwoFactorService } from "../auth/mobileTwoFactorService";
import { MobilePasskeyService } from "../auth/mobilePasskeyService";
import { AppNav, LogoMark, appNavLayout } from "@lifeos/ui/app-nav";
import type { AppNavItem } from "@lifeos/ui/app-nav";
import { Button } from "@lifeos/ui/button";
import { tokenColor } from "@lifeos/ui/tokens";

const navigation = [
  { id: "Today", label: "Today", icon: "today" },
  { id: "Finance", label: "Finance", shortLabel: "Money", icon: "finance" },
  { id: "Fitness", label: "Fitness", icon: "fitness" },
  {
    id: "Nutrition",
    label: "Nutrition",
    shortLabel: "Food",
    icon: "nutrition",
  },
  { id: "Health", label: "Health", icon: "health" },
  { id: "Settings", label: "Settings", icon: "settings", hideOnPhone: true },
] as const satisfies readonly AppNavItem[];
type Destination = (typeof navigation)[number]["id"];

export function HomeShell() {
  const { owner, request, signOut } = useMobileAuth();
  const { width } = useWindowDimensions();
  const [activeDestination, setActiveDestination] =
    useState<Destination>("Today");
  const layout = appNavLayout(width);
  const dashboardService = useMemo(
    () => new MobileDashboardService({ api: { request } }),
    [request],
  );
  const fitnessService = useMemo(
    () => new MobileFitnessService({ api: { request } }),
    [request],
  );
  const financeService = useMemo(
    () => new MobileFinanceService({ api: { request } }),
    [request],
  );
  const nutritionService = useMemo(
    () => new MobileNutritionService({ api: { request } }),
    [request],
  );
  const twoFactorService = useMemo(
    () => new MobileTwoFactorService({ request }),
    [request],
  );
  const passkeyService = useMemo(
    () => new MobilePasskeyService({ request }),
    [request],
  );

  const scheme = useColorScheme() === "dark" ? "dark" : "light";
  const signOutOwner = () => void signOut();
  // The nav owns the bottom inset, so the tab bar's surface reaches the home indicator.
  const nav = (
    <SafeAreaView
      edges={["bottom"]}
      style={{
        backgroundColor: tokenColor(
          layout === "tabbar" ? "surface" : "canvas",
          scheme,
        ),
      }}
    >
      <AppNav
        current={activeDestination}
        items={navigation}
        layout={layout}
        onNavigate={(id) => setActiveDestination(id as Destination)}
        onSignOut={signOutOwner}
        owner={owner?.name}
      />
    </SafeAreaView>
  );

  return (
    <View className="flex-1 flex-row bg-canvas">
      {layout === "tabbar" ? null : nav}

      <View className="flex-1">
        {layout === "tabbar" ? (
          <View className="min-h-14 flex-row items-center justify-between gap-3 border-b border-line bg-canvas px-4">
            <View className="flex-row items-center gap-3">
              <LogoMark size={28} />
              <Text className="text-title-s text-ink">LifeOS</Text>
            </View>
            <View className="flex-row items-center gap-1">
              <Pressable
                accessibilityLabel="Navigate to Settings"
                accessibilityRole="button"
                accessibilityState={{
                  selected: activeDestination === "Settings",
                }}
                className="size-target-min items-center justify-center rounded-full"
                onPress={() => setActiveDestination("Settings")}
                testID="navigation-settings"
              >
                <View className="size-8 items-center justify-center rounded-full bg-primary-soft">
                  <Text className="text-label text-primary-text">
                    {(owner?.name ?? "L").charAt(0).toUpperCase()}
                  </Text>
                </View>
              </Pressable>
              <Button onPress={signOutOwner} variant="tertiary">
                Sign out
              </Button>
            </View>
          </View>
        ) : null}

        <View className="flex-1">
          {activeDestination === "Health" ? (
            owner ? (
              <HealthSyncScreen ownerId={owner.id} />
            ) : null
          ) : activeDestination === "Today" ? (
            <TodayDashboardScreen
              onNavigate={setActiveDestination}
              service={dashboardService}
            />
          ) : activeDestination === "Fitness" ? (
            <FitnessScreen service={fitnessService} />
          ) : activeDestination === "Finance" ? (
            <FinanceScreen service={financeService} />
          ) : activeDestination === "Nutrition" ? (
            <NutritionScreen service={nutritionService} />
          ) : (
            <TwoFactorSettingsScreen
              onDisabled={signOut}
              passkeyService={passkeyService}
              service={twoFactorService}
            />
          )}
        </View>

        {layout === "tabbar" ? nav : null}
      </View>
    </View>
  );
}
