import { useState } from "react";
import * as WebBrowser from "expo-web-browser";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { useMobileAuth } from "../auth/authContext";
import { LogoMark } from "@lifeos/ui/app-nav";
import { Button } from "@lifeos/ui/button";
import { getErrorMessage } from "../auth/errorMessage";
import type { MobileLoginChallenge } from "../auth/mobileAuthService";
import { createPasskeyPkce } from "../auth/passkeyPkce";
import { DiagnosticReportPanel } from "../diagnostics/DiagnosticReportPanel";

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
  const [passkeyError, setPasskeyError] = useState<string | null>(null);

  async function signInWithPasskey(): Promise<void> {
    setIsSigningIn(true);
    setPasskeyError(null);
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
    } catch (passkeySignInError) {
      setPasskeyError(
        getErrorMessage(
          passkeySignInError,
          "Passkey sign-in could not be completed. Try again or use your password.",
        ),
      );
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
      className="flex-1 bg-canvas p-6"
    >
      <ScrollView
        contentContainerClassName="grow items-center justify-center"
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        className="w-full flex-1"
        testID="sign-in-scroll"
      >
        <View className="w-full max-w-[440px] rounded-lg border border-line bg-surface p-7">
          <View className="mb-8 flex-row items-center gap-3">
            <LogoMark size={44} />
            <Text className="text-title-l text-ink">LifeOS</Text>
          </View>
          <Text className="mb-2 text-overline uppercase text-ink-muted">
            Your home, in context
          </Text>
          <Text accessibilityRole="header" className="text-display-m text-ink">
            Sign in
          </Text>
          <Text className="mb-6 mt-2 text-body text-ink-muted">
            {challenge === null
              ? "Connect securely to the LifeOS server on your home network."
              : challenge.status === "setup_required"
                ? "Your authenticator isn't set up yet. Add LifeOS to your authenticator app with this setup key, then enter its 6-digit code."
                : "Password verified. Enter the current code from your authenticator app."}
          </Text>

          {challenge === null ? (
            <>
              <Text className="mb-2 mt-4 text-label text-ink">Email</Text>
              <TextInput
                accessibilityLabel="LifeOS email"
                autoCapitalize="none"
                autoComplete="email"
                autoCorrect={false}
                keyboardType="email-address"
                onChangeText={setEmail}
                placeholder="you@example.com"
                placeholderTextColorClassName="accent-ink-muted"
                returnKeyType="next"
                className="min-h-target-touch rounded-sm border border-line-strong bg-surface px-3 text-body text-ink"
                textContentType="emailAddress"
                value={email}
              />

              <Text className="mb-2 mt-4 text-label text-ink">Password</Text>
              <TextInput
                accessibilityLabel="LifeOS password"
                autoComplete="password"
                onChangeText={setPassword}
                placeholder="Your password"
                placeholderTextColorClassName="accent-ink-muted"
                returnKeyType="done"
                secureTextEntry
                className="min-h-target-touch rounded-sm border border-line-strong bg-surface px-3 text-body text-ink"
                textContentType="password"
                value={password}
              />
            </>
          ) : (
            <>
              {challenge.status === "setup_required" ? (
                <View className="mt-1 rounded-md bg-surface-sunken p-4">
                  <Text className="mb-2 mt-4 text-label text-ink">
                    Authenticator setup key
                  </Text>
                  <Text
                    selectable
                    className="mt-1 font-mono text-figure-m tracking-[1.5px] text-ink"
                  >
                    {challenge.secret}
                  </Text>
                  <Text className="mt-2 text-caption text-ink-muted">
                    Keep this key private. It is shown only during setup and is
                    not saved on this device.
                  </Text>
                </View>
              ) : null}
              <Text className="mb-2 mt-4 text-label text-ink">
                Authenticator code
              </Text>
              <TextInput
                accessibilityLabel="Authenticator code"
                keyboardType="number-pad"
                maxLength={6}
                onChangeText={setCode}
                placeholder="6-digit code"
                placeholderTextColorClassName="accent-ink-muted"
                returnKeyType="done"
                className="min-h-target-touch rounded-sm border border-line-strong bg-surface px-3 text-body text-ink"
                {...Platform.select({
                  ios: { textContentType: "oneTimeCode" },
                  android: { autoComplete: "one-time-code" },
                })}
                value={code}
              />
              <Button
                disabled={isSigningIn}
                onPress={() => void useDifferentAccount()}
                variant="secondary"
              >
                Use a different account
              </Button>
            </>
          )}

          {(error !== null || passkeyError !== null) && (
            <Text
              accessibilityRole="alert"
              className="mt-4 rounded-sm bg-danger-soft p-3 text-body-s text-danger"
            >
              {error ?? passkeyError}
            </Text>
          )}

          <Button
            className="mt-3 w-full"
            disabled={
              isSigningIn ||
              (challenge === null &&
                (!isValidEmail(email) || password === "")) ||
              (challenge !== null && code.length !== 6)
            }
            loading={isSigningIn}
            onPress={() => void submit()}
          >
            {challenge === null
              ? "Continue"
              : challenge.status === "setup_required"
                ? "Confirm authenticator"
                : "Verify code"}
          </Button>
          {challenge === null ? (
            <Button
              className="mt-2 w-full"
              disabled={isSigningIn}
              onPress={() => void signInWithPasskey()}
              variant="secondary"
              loading={isSigningIn}
            >
              Sign in with a passkey
            </Button>
          ) : null}
          <Text className="mt-5 text-center text-caption text-ink-muted">
            Your credentials stay on this device and are sent only to your
            LifeOS server.
          </Text>
          <DiagnosticReportPanel />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}
