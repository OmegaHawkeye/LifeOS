import { useState } from "react";
import * as WebBrowser from "expo-web-browser";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useMobileAuth } from "../auth/authContext";
import type { MobileLoginChallenge } from "../auth/mobileAuthService";
import { createPasskeyPkce } from "../auth/passkeyPkce";

export function SignInScreen() {
  const {
    error,
    signIn,
    beginPasskeySignIn,
    completePasskeySignIn,
    verifySecondFactor,
    cancelSignIn,
  } = useMobileAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [challenge, setChallenge] = useState<MobileLoginChallenge | null>(null);
  const [isSigningIn, setIsSigningIn] = useState(false);

  async function signInWithPasskey(): Promise<void> {
    setIsSigningIn(true);
    try {
      const pkce = await createPasskeyPkce();
      const loginUrl = await beginPasskeySignIn(pkce.state, pkce.challenge);
      const result = await WebBrowser.openAuthSessionAsync(
        loginUrl,
        "lifeos://passkey-auth",
        { preferEphemeralSession: true },
      );

      if (result.type !== "success" || !result.url) {
        return;
      }

      const callback = new URL(result.url);
      const state = callback.searchParams.get("state");
      const code = callback.searchParams.get("code");

      if (state !== pkce.state || !code) {
        throw new Error("LifeOS returned an invalid passkey sign-in response.");
      }

      await completePasskeySignIn(state, code, pkce.verifier);
    } catch {
      // The provider exposes safe errors to the screen.
    } finally {
      setIsSigningIn(false);
    }
  }

  async function submit(): Promise<void> {
    setIsSigningIn(true);
    try {
      if (challenge === null) {
        setChallenge(await signIn(email.trim(), password));
      } else {
        await verifySecondFactor(challenge.challengeToken, code.trim());
      }
    } catch {
      // The provider exposes the safe server message.
    } finally {
      setIsSigningIn(false);
    }
  }

  async function useDifferentAccount(): Promise<void> {
    if (challenge === null) return;
    setIsSigningIn(true);
    try {
      await cancelSignIn(challenge.challengeToken);
      setChallenge(null);
      setCode("");
    } catch {
      // Keep the setup material visible unless the server confirms cancellation.
    } finally {
      setIsSigningIn(false);
    }
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={styles.page}
    >
      <View style={styles.card}>
        <View style={styles.brandRow}>
          <View style={styles.brandMark}>
            <Text style={styles.brandGlyph}>L</Text>
          </View>
          <Text style={styles.brandName}>LifeOS</Text>
        </View>
        <Text style={styles.eyebrow}>Your home, in context</Text>
        <Text style={styles.title}>Sign in</Text>
        <Text style={styles.description}>
          {challenge === null
            ? "Connect securely to the LifeOS server on your home network."
            : challenge.status === "setup_required"
              ? "Your authenticator isn't set up yet. Add LifeOS to your authenticator app with this setup key, then enter its 6-digit code."
              : "Password verified. Enter the current code from your authenticator app."}
        </Text>

        {challenge === null ? (
          <>
            <Text style={styles.label}>Email</Text>
            <TextInput
              accessibilityLabel="LifeOS email"
              autoCapitalize="none"
              autoComplete="email"
              autoCorrect={false}
              keyboardType="email-address"
              onChangeText={setEmail}
              placeholder="you@example.com"
              placeholderTextColor="#8b938f"
              returnKeyType="next"
              style={styles.input}
              textContentType="emailAddress"
              value={email}
            />

            <Text style={styles.label}>Password</Text>
            <TextInput
              accessibilityLabel="LifeOS password"
              autoComplete="password"
              onChangeText={setPassword}
              placeholder="Your password"
              placeholderTextColor="#8b938f"
              returnKeyType="done"
              secureTextEntry
              style={styles.input}
              textContentType="password"
              value={password}
            />
          </>
        ) : (
          <>
            {challenge.status === "setup_required" ? (
              <View style={styles.setupKey}>
                <Text style={styles.label}>Authenticator setup key</Text>
                <Text selectable style={styles.secret}>
                  {challenge.secret}
                </Text>
                <Text style={styles.setupHint}>
                  Keep this key private. It is shown only during setup and is
                  not saved on this device.
                </Text>
              </View>
            ) : null}
            <Text style={styles.label}>Authenticator code</Text>
            <TextInput
              accessibilityLabel="Authenticator code"
              autoComplete="one-time-code"
              keyboardType="number-pad"
              maxLength={6}
              onChangeText={setCode}
              placeholder="6-digit code"
              placeholderTextColor="#8b938f"
              returnKeyType="done"
              style={styles.input}
              textContentType="oneTimeCode"
              value={code}
            />
            <Pressable
              accessibilityRole="button"
              disabled={isSigningIn}
              onPress={() => void useDifferentAccount()}
              style={styles.backButton}
            >
              <Text style={styles.backButtonText}>Use a different account</Text>
            </Pressable>
          </>
        )}

        {error !== null && (
          <Text accessibilityRole="alert" style={styles.error}>
            {error}
          </Text>
        )}

        <Pressable
          accessibilityRole="button"
          disabled={
            isSigningIn ||
            (challenge === null && (email.trim() === "" || password === "")) ||
            (challenge !== null && code.length !== 6)
          }
          onPress={() => void submit()}
          style={({ pressed }) => [
            styles.submitButton,
            (pressed || isSigningIn) && styles.submitButtonPressed,
            ((challenge === null && (email.trim() === "" || password === "")) ||
              (challenge !== null && code.length !== 6)) &&
              styles.submitButtonDisabled,
          ]}
        >
          {isSigningIn ? (
            <ActivityIndicator color="#102c20" />
          ) : (
            <Text style={styles.submitText}>
              {challenge === null
                ? "Continue"
                : challenge.status === "setup_required"
                  ? "Confirm authenticator"
                  : "Verify code"}
            </Text>
          )}
        </Pressable>
        {challenge === null ? (
          <Pressable
            accessibilityRole="button"
            disabled={isSigningIn}
            onPress={() => void signInWithPasskey()}
            style={styles.passkeyButton}
          >
            {isSigningIn ? (
              <ActivityIndicator color="#17251e" />
            ) : (
              <Text style={styles.passkeyButtonText}>
                Sign in with a passkey
              </Text>
            )}
          </Pressable>
        ) : null}
        <Text style={styles.privacyNote}>
          Your credentials stay on this device and are sent only to your LifeOS
          server.
        </Text>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  page: {
    alignItems: "center",
    backgroundColor: "#f3f6f4",
    flex: 1,
    justifyContent: "center",
    padding: 24,
  },
  card: {
    backgroundColor: "#ffffff",
    borderColor: "#e2e9e4",
    borderRadius: 28,
    borderWidth: 1,
    maxWidth: 440,
    padding: 28,
    width: "100%",
  },
  brandRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
    marginBottom: 32,
  },
  brandMark: {
    alignItems: "center",
    backgroundColor: "#4dc995",
    borderRadius: 17,
    height: 46,
    justifyContent: "center",
    width: 46,
  },
  brandGlyph: { color: "#102c20", fontSize: 20, fontWeight: "800" },
  brandName: { color: "#17251e", fontSize: 22, fontWeight: "700" },
  eyebrow: {
    color: "#39896c",
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 8,
  },
  title: {
    color: "#17251e",
    fontSize: 34,
    fontWeight: "700",
    letterSpacing: -0.7,
  },
  description: {
    color: "#6d7771",
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 24,
    marginTop: 9,
  },
  setupKey: {
    backgroundColor: "#f3f6f4",
    borderRadius: 14,
    marginTop: 4,
    padding: 14,
  },
  secret: {
    color: "#18261e",
    fontSize: 18,
    fontWeight: "700",
    letterSpacing: 1.5,
    marginTop: 5,
  },
  setupHint: { color: "#6d7771", fontSize: 12, lineHeight: 18, marginTop: 8 },
  label: {
    color: "#34433a",
    fontSize: 13,
    fontWeight: "600",
    marginBottom: 8,
    marginTop: 14,
  },
  input: {
    backgroundColor: "#ffffff",
    borderColor: "#dce4de",
    borderRadius: 13,
    borderWidth: 1,
    color: "#18261e",
    fontSize: 16,
    minHeight: 50,
    paddingHorizontal: 14,
  },
  error: { color: "#a33d36", fontSize: 14, lineHeight: 20, marginTop: 16 },
  submitButton: {
    alignItems: "center",
    backgroundColor: "#4dc995",
    borderRadius: 14,
    justifyContent: "center",
    marginTop: 24,
    minHeight: 52,
  },
  submitButtonPressed: { opacity: 0.8 },
  submitButtonDisabled: { opacity: 0.45 },
  submitText: { color: "#102c20", fontSize: 16, fontWeight: "700" },
  backButton: { alignSelf: "flex-start", marginTop: 6, paddingVertical: 8 },
  backButtonText: { color: "#287b5a", fontSize: 14, fontWeight: "600" },
  passkeyButton: {
    alignItems: "center",
    borderColor: "#dce4de",
    borderRadius: 14,
    borderWidth: 1,
    justifyContent: "center",
    marginTop: 12,
    minHeight: 52,
  },
  passkeyButtonText: { color: "#17251e", fontSize: 16, fontWeight: "600" },
  privacyNote: {
    color: "#7b8580",
    fontSize: 12,
    lineHeight: 18,
    marginTop: 18,
    textAlign: "center",
  },
});
