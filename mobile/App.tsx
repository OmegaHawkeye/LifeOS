import "./global.css";

import { ActivityIndicator, StyleSheet, View } from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { MobileAuthProvider, useMobileAuth } from "./src/auth/authContext";
import { mobileAuthService } from "./src/auth/mobileAuth";
import { HomeShell } from "./src/screens/HomeShell";
import { SignInScreen } from "./src/screens/SignInScreen";

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

  return (
    <SafeAreaView edges={["top", "bottom"]} style={styles.safeArea}>
      {isLoading ? (
        <View style={styles.loading}>
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

const styles = StyleSheet.create({
  safeArea: { backgroundColor: "#f3f6f4", flex: 1 },
  loading: { alignItems: "center", flex: 1, justifyContent: "center" },
});
