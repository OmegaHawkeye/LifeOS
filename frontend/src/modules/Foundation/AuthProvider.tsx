import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { getOwnerSettings } from "./settings";
import type { OwnerSettings } from "./settings";
import {
  completeTwoFactorChallenge,
  confirmTwoFactorSetup,
  createInitialOwner as provisionInitialOwner,
  getCurrentOwner,
  isInitialOwnerSetupRequired,
  signIn as submitSignIn,
  signOut,
} from "./auth";
import type { OwnerProfile } from "./auth";
import { AuthContext } from "./auth-context";
import type { AuthContextValue } from "./auth-context";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [owner, setOwner] = useState<OwnerProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [setupRequired, setSetupRequired] = useState(false);
  const [theme, setTheme] = useState<OwnerSettings["theme"]>("system");
  const [themeOverride, setThemeOverride] =
    useState<AuthContextValue["themeOverride"]>(null);
  const [pendingTwoFactor, setPendingTwoFactor] =
    useState<AuthContextValue["pendingTwoFactor"]>(null);

  useEffect(() => {
    let isCurrent = true;

    Promise.all([getCurrentOwner(), isInitialOwnerSetupRequired()])
      .then(async ([currentOwner, requiresSetup]) => {
        if (currentOwner) {
          try {
            const settings = await getOwnerSettings();
            setTheme(settings.theme);
          } catch {
            // A settings outage should not invalidate an otherwise valid session.
          }
        }

        if (isCurrent) {
          setOwner(currentOwner);
          setSetupRequired(!currentOwner && requiresSetup);
          setIsLoading(false);
        }
      })
      .catch(() => {
        if (isCurrent) {
          setLoadError(true);
          setIsLoading(false);
        }
      });

    return () => {
      isCurrent = false;
    };
  }, []);

  useEffect(() => {
    const handleUnauthorized = () => {
      setOwner(null);
      setPendingTwoFactor(null);
    };

    window.addEventListener("lifeos:unauthorized", handleUnauthorized);
    return () =>
      window.removeEventListener("lifeos:unauthorized", handleUnauthorized);
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    // A page override (the wall display) wins over the owner's theme until it
    // is cleared; clearing it re-applies the owner's theme as it is right now.
    const applyTheme = () => {
      const ownerDark =
        theme === "dark" || (theme === "system" && media.matches);
      const isDark = themeOverride === "light" ? false : ownerDark;
      root.classList.toggle("dark", isDark);
      if (themeOverride === "wall") {
        root.dataset.theme = "wall";
      } else {
        delete root.dataset.theme;
      }
      root.style.colorScheme =
        themeOverride === "wall" || isDark ? "dark" : "light";
    };

    applyTheme();

    if (theme !== "system") {
      return;
    }

    media.addEventListener("change", applyTheme);
    return () => media.removeEventListener("change", applyTheme);
  }, [theme, themeOverride]);

  const value = useMemo<AuthContextValue>(
    () => ({
      isLoading,
      loadError,
      setupRequired,
      owner,
      pendingTwoFactor,
      updateTheme: setTheme,
      themeOverride,
      setThemeOverride,
      createInitialOwner: async (name, email, password) => {
        setPendingTwoFactor(await provisionInitialOwner(name, email, password));
        setSetupRequired(false);
      },
      signIn: async (email, password) => {
        setPendingTwoFactor(await submitSignIn(email, password));
      },
      verifyTwoFactor: async (code) => {
        if (!pendingTwoFactor) {
          throw new Error("Sign in with your password first.");
        }

        const signedInOwner =
          pendingTwoFactor.status === "setup_required"
            ? await confirmTwoFactorSetup(code)
            : await completeTwoFactorChallenge(code);

        setOwner(signedInOwner);
        setSetupRequired(false);
        setPendingTwoFactor(null);

        try {
          setTheme((await getOwnerSettings()).theme);
        } catch {
          // Sign-in remains successful even if preferences are temporarily unavailable.
        }
      },
      refreshOwner: async () => {
        const currentOwner = await getCurrentOwner();
        if (!currentOwner) {
          throw new Error("Passkey sign-in did not create an owner session.");
        }
        setOwner(currentOwner);
        setSetupRequired(false);
        setLoadError(false);
        try {
          setTheme((await getOwnerSettings()).theme);
        } catch {
          // The authenticated session remains valid when settings are unavailable.
        }
      },
      signOut: async () => {
        await signOut();
        setOwner(null);
        setPendingTwoFactor(null);
      },
    }),
    [
      isLoading,
      loadError,
      setupRequired,
      owner,
      pendingTwoFactor,
      setTheme,
      themeOverride,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
