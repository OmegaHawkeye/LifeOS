import { useMemo, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
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
import { AppIcon } from "@lifeos/ui/icons";
import type { LifeOSIconName } from "@lifeos/ui/icons";

const destinations = [
  "Today",
  "Finance",
  "Fitness",
  "Nutrition",
  "Health",
  "Settings",
] as const;
type Destination = (typeof destinations)[number];
const destinationIcons: Record<Destination, LifeOSIconName> = {
  Today: "today",
  Finance: "finance",
  Fitness: "fitness",
  Nutrition: "nutrition",
  Health: "health",
  Settings: "settings",
};

export function HomeShell() {
  const { owner, request, signOut } = useMobileAuth();
  const { width } = useWindowDimensions();
  const [activeDestination, setActiveDestination] =
    useState<Destination>("Today");
  const isTablet = width >= 760;
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

  return (
    <View style={styles.page}>
      {isTablet ? (
        <View style={styles.sidebar}>
          <Brand />
          <View style={styles.sidebarItems}>
            {destinations.map((destination) => (
              <DestinationButton
                active={activeDestination === destination}
                destination={destination}
                key={destination}
                onPress={() => setActiveDestination(destination)}
              />
            ))}
          </View>
          <Pressable
            accessibilityRole="button"
            onPress={() => void signOut()}
            style={styles.sidebarSignOut}
          >
            <Text style={styles.signOutText}>Sign out</Text>
          </Pressable>
        </View>
      ) : null}

      <View style={styles.main}>
        <View style={styles.header}>
          {!isTablet ? <Brand compact /> : null}
          <View style={styles.headerOwner}>
            <Text style={styles.ownerName}>
              {owner?.name ?? "LifeOS owner"}
            </Text>
            {!isTablet ? (
              <Pressable
                accessibilityRole="button"
                onPress={() => void signOut()}
              >
                <Text style={styles.signOutText}>Sign out</Text>
              </Pressable>
            ) : null}
          </View>
        </View>

        {activeDestination === "Health" && owner ? (
          <HealthSyncScreen ownerId={owner.id} />
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
        ) : activeDestination === "Settings" ? (
          <TwoFactorSettingsScreen
            onDisabled={signOut}
            passkeyService={passkeyService}
            service={twoFactorService}
          />
        ) : (
          <ScrollView contentContainerStyle={styles.content}>
            <Text style={styles.eyebrow}>Your day, in context</Text>
            <Text style={styles.title}>{activeDestination}</Text>
            <Text style={styles.subtitle}>
              Your private dashboard runs on the LifeOS server you control.
            </Text>
            <View style={styles.cards}>
              <SummaryCard
                title="Today"
                detail="Your daily overview will appear here."
              />
              <SummaryCard title="Finance" detail="Your money, in context." />
              <SummaryCard
                title="Fitness & health"
                detail="Your progress stays on your server."
              />
            </View>
          </ScrollView>
        )}

        {!isTablet ? (
          <View style={styles.bottomNavigation}>
            {destinations.map((destination) => (
              <DestinationButton
                active={activeDestination === destination}
                destination={destination}
                key={destination}
                onPress={() => setActiveDestination(destination)}
                compact
              />
            ))}
          </View>
        ) : null}
      </View>
    </View>
  );
}

function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <View style={[styles.brand, compact && styles.brandCompact]}>
      <View style={styles.brandMark}>
        <Text style={styles.brandGlyph}>L</Text>
      </View>
      <Text style={styles.brandName}>LifeOS</Text>
    </View>
  );
}

function DestinationButton({
  active,
  compact = false,
  destination,
  onPress,
}: {
  active: boolean;
  compact?: boolean;
  destination: Destination;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Navigate to ${destination}`}
      accessibilityState={{ selected: active }}
      onPress={onPress}
      testID={`navigation-${destinationIcons[destination]}`}
      style={({ pressed }) => [
        styles.destination,
        compact && styles.destinationCompact,
        active && styles.destinationActive,
        pressed && styles.destinationPressed,
      ]}
    >
      <AppIcon
        color={active ? "#25634b" : "#6f7973"}
        name={destinationIcons[destination]}
        size={compact ? 20 : 22}
      />
      <Text
        numberOfLines={1}
        style={[
          styles.destinationLabel,
          compact && styles.destinationMiniLabel,
          active && styles.destinationLabelActive,
        ]}
      >
        {compact ? mobileDestinationLabels[destination] : destination}
      </Text>
    </Pressable>
  );
}

const mobileDestinationLabels: Record<Destination, string> = {
  Today: "Today",
  Finance: "Money",
  Fitness: "Fitness",
  Nutrition: "Food",
  Health: "Health",
  Settings: "More",
};

function SummaryCard({ title, detail }: { title: string; detail: string }) {
  return (
    <View style={styles.summaryCard}>
      <Text style={styles.cardEyebrow}>LIFEOS</Text>
      <Text style={styles.cardTitle}>{title}</Text>
      <Text style={styles.cardDetail}>{detail}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { backgroundColor: "#f3f6f4", flex: 1, flexDirection: "row" },
  sidebar: {
    backgroundColor: "#ffffff",
    borderRightColor: "#e2e9e4",
    borderRightWidth: 1,
    justifyContent: "space-between",
    paddingHorizontal: 18,
    paddingVertical: 24,
    width: 248,
  },
  brand: {
    alignItems: "center",
    flexDirection: "row",
    gap: 11,
    paddingHorizontal: 4,
  },
  brandCompact: { paddingHorizontal: 0 },
  brandMark: {
    alignItems: "center",
    backgroundColor: "#4dc995",
    borderRadius: 13,
    height: 38,
    justifyContent: "center",
    width: 38,
  },
  brandGlyph: { color: "#102c20", fontSize: 17, fontWeight: "800" },
  brandName: { color: "#17251e", fontSize: 19, fontWeight: "700" },
  sidebarItems: { flex: 1, gap: 10, justifyContent: "center", marginTop: 26 },
  destination: {
    alignItems: "center",
    borderRadius: 15,
    flexDirection: "row",
    gap: 13,
    minHeight: 54,
    paddingHorizontal: 12,
  },
  destinationCompact: {
    flex: 1,
    flexDirection: "column",
    gap: 4,
    justifyContent: "center",
    minHeight: 58,
    paddingHorizontal: 3,
  },
  destinationActive: { backgroundColor: "#e2f5eb" },
  destinationPressed: { opacity: 0.72 },
  destinationLabel: { color: "#536058", fontSize: 15, fontWeight: "500" },
  destinationMiniLabel: { fontSize: 9, fontWeight: "600" },
  destinationLabelActive: { color: "#25634b", fontWeight: "700" },
  sidebarSignOut: { paddingHorizontal: 14, paddingVertical: 12 },
  main: { flex: 1 },
  header: {
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderBottomColor: "#e2e9e4",
    borderBottomWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    minHeight: 66,
    paddingHorizontal: 22,
  },
  headerOwner: { alignItems: "center", flexDirection: "row", gap: 18 },
  ownerName: { color: "#66716a", fontSize: 14 },
  signOutText: { color: "#34433a", fontSize: 14, fontWeight: "600" },
  content: {
    alignSelf: "center",
    gap: 8,
    maxWidth: 1120,
    padding: 30,
    paddingBottom: 44,
    width: "100%",
  },
  eyebrow: { color: "#39896c", fontSize: 14, fontWeight: "600", marginTop: 18 },
  title: {
    color: "#17251e",
    fontSize: 38,
    fontWeight: "700",
    letterSpacing: -0.7,
  },
  subtitle: {
    color: "#6d7771",
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 12,
    marginTop: 2,
  },
  cards: { flexDirection: "row", flexWrap: "wrap", gap: 14, marginTop: 18 },
  summaryCard: {
    backgroundColor: "#ffffff",
    borderColor: "#e2e9e4",
    borderRadius: 21,
    borderWidth: 1,
    flexBasis: 250,
    flexGrow: 1,
    minHeight: 160,
    padding: 20,
  },
  cardEyebrow: {
    color: "#39896c",
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1.2,
  },
  cardTitle: {
    color: "#17251e",
    fontSize: 20,
    fontWeight: "700",
    marginTop: 20,
  },
  cardDetail: { color: "#6d7771", fontSize: 14, lineHeight: 21, marginTop: 8 },
  bottomNavigation: {
    backgroundColor: "#ffffff",
    borderTopColor: "#e2e9e4",
    borderTopWidth: 1,
    flexDirection: "row",
    paddingHorizontal: 8,
    paddingTop: 8,
  },
});
