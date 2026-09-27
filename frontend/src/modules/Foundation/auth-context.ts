import { createContext, useContext } from "react";
import type { OwnerProfile, TwoFactorLoginState } from "./auth";
import type { OwnerSettings } from "./settings";

export type AuthContextValue = {
  isLoading: boolean;
  loadError: boolean;
  setupRequired: boolean;
  owner: OwnerProfile | null;
  pendingTwoFactor: TwoFactorLoginState | null;
  updateTheme: (theme: OwnerSettings["theme"]) => void;
  createInitialOwner: (
    name: string,
    email: string,
    password: string,
  ) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  verifyTwoFactor: (code: string) => Promise<void>;
  refreshOwner: () => Promise<void>;
  signOut: () => Promise<void>;
};

export const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth(): AuthContextValue {
  const auth = useContext(AuthContext);

  if (!auth) {
    throw new Error("useAuth must be used within AuthProvider");
  }

  return auth;
}
