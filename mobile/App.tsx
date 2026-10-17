import "./global.css";

import * as SplashScreen from "expo-splash-screen";
import { ActivityIndicator, Text, View, useColorScheme } from "react-native";
import { LogoMark } from "@lifeos/ui/app-nav";
import { tokenColor } from "@lifeos/ui/tokens";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { MobileAuthProvider, useMobileAuth } from "./src/auth/authContext";
import { mobileAuthService } from "./src/auth/mobileAuth";
import { HomeShell } from "./src/screens/HomeShell";
import { SignInScreen } from "./src/screens/SignInScreen";
import { DiagnosticErrorBoundary } from "./src/diagnostics/DiagnosticErrorBoundary";
import { registerNativeDiagnostics } from "./src/diagnostics/registerNativeDiagnostics";

registerNativeDiagnostics();
void SplashScreen.hideAsync().catch(() => undefined);

export default function App() {
  return (
    <DiagnosticErrorBoundary>
      <SafeAreaProvider>
        <MobileAuthProvider service={mobileAuthService}>
          <LifeOSApp />
        </MobileAuthProvider>
      </SafeAreaProvider>
    </DiagnosticErrorBoundary>
  );
}

export function LifeOSApp() {
  const { isLoading, owner } = useMobileAuth();
  const scheme = useColorScheme() === "dark" ? "dark" : "light";
  const signedIn = !isLoading && owner !== null;

  return (
    <SafeAreaView
      // Signed in, the shell pads the bottom itself so the tab bar reaches the home indicator.
      edges={signedIn ? ["top"] : ["top", "bottom"]}
      style={{ backgroundColor: tokenColor("canvas", scheme), flex: 1 }}
    >
      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <LogoMark size={72} />
          <Text className="mt-3 text-display-m text-ink">LifeOS</Text>
          <Text className="mb-5 mt-2 text-body-s text-ink-muted">
            Connecting to your home server…
          </Text>
          <ActivityIndicator
            color={tokenColor("primary", scheme)}
            size="large"
          />
        </View>
      ) : owner === null ? (
        <SignInScreen />
      ) : (
        <HomeShell />
      )}
    </SafeAreaView>
  );
}
