import "./global.css";

import * as SplashScreen from "expo-splash-screen";
import { useEffect } from "react";
import { ActivityIndicator, Text, View } from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { MobileAuthProvider, useMobileAuth } from "./src/auth/authContext";
import { mobileAuthService } from "./src/auth/mobileAuth";
import { HomeShell } from "./src/screens/HomeShell";
import { SignInScreen } from "./src/screens/SignInScreen";

void SplashScreen.preventAutoHideAsync().catch(() => undefined);

export default function App() {
  return (
    <SafeAreaProvider>
      <MobileAuthProvider service={mobileAuthService}>
        <LifeOSApp />
      </MobileAuthProvider>
    </SafeAreaProvider>
  );
}

export function LifeOSApp() {
  const { isLoading, owner } = useMobileAuth();

  useEffect(() => {
    if (!isLoading) {
      void SplashScreen.hideAsync().catch(() => undefined);
    }
  }, [isLoading]);

  return (
    <SafeAreaView
      className="flex-1 bg-lifeos-background"
      edges={["top", "bottom"]}
    >
      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <View className="h-[72px] w-[72px] items-center justify-center rounded-[22px] bg-lifeos-accent">
            <Text className="text-[38px] font-extrabold text-lifeos-accent-ink">
              L
            </Text>
          </View>
          <Text className="mt-3 text-[28px] font-extrabold text-lifeos-primary">
            LifeOS
          </Text>
          <Text className="mb-5 mt-2 text-sm text-lifeos-muted">
            Connecting to your home server…
          </Text>
          <ActivityIndicator color="#39896c" size="large" />
        </View>
      ) : owner === null ? (
        <SignInScreen />
      ) : (
        <HomeShell />
      )}
    </SafeAreaView>
  );
}
