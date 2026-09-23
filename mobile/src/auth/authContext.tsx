import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from "react";
import type { OwnerProfile } from "./credentials";
import {
  MobileApiError,
  MobileAuthService,
  type MobileLoginChallenge,
} from "./mobileAuthService";

export type MobileAuthContextValue = {
  owner: OwnerProfile | null;
  isLoading: boolean;
  error: string | null;
  signIn: (email: string, password: string) => Promise<MobileLoginChallenge>;
  beginPasskeySignIn: (state: string, codeChallenge: string) => Promise<string>;
  completePasskeySignIn: (
    state: string,
    code: string,
    verifier: string,
  ) => Promise<void>;
  verifySecondFactor: (challengeToken: string, code: string) => Promise<void>;
  cancelSignIn: (challengeToken: string) => Promise<void>;
  signOut: () => Promise<void>;
  request: <T>(path: string, init?: RequestInit) => Promise<T>;
};

const MobileAuthContext = createContext<MobileAuthContextValue | null>(null);

type MobileAuthProviderProps = PropsWithChildren<{
  service: MobileAuthService;
}>;

const sessionRestoreTimeoutMs = 8_000;

export function MobileAuthProvider({
  children,
  service,
}: MobileAuthProviderProps) {
  const [owner, setOwner] = useState<OwnerProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    let timeoutHandle: ReturnType<typeof setTimeout> | undefined;
    const restoreWithTimeout = Promise.race([
      service.restoreSession(),
      new Promise<null>((_, reject) => {
        timeoutHandle = setTimeout(
          () => reject(new Error("Session restore timed out.")),
          sessionRestoreTimeoutMs,
        );
      }),
    ]).finally(() => {
      if (timeoutHandle !== undefined) {
        clearTimeout(timeoutHandle);
      }
    });

    restoreWithTimeout
      .then((restoredOwner) => {
        if (mounted) {
          setOwner(restoredOwner);
          setError(null);
        }
      })
      .catch(() => {
        if (mounted) {
          setError(
            "LifeOS could not connect to your server. Your saved session is kept.",
          );
        }
      })
      .finally(() => {
        if (mounted) {
          setIsLoading(false);
        }
      });

    return () => {
      mounted = false;
    };
  }, [service]);

  const signIn = useCallback(
    async (email: string, password: string) => {
      setError(null);
      try {
        const challenge = await service.signIn(
          email,
          password,
          "LifeOS iOS device",
        );
        return challenge;
      } catch (signInError) {
        setError(
          signInError instanceof Error
            ? signInError.message
            : "LifeOS sign-in failed. Please try again.",
        );
        throw signInError;
      }
    },
    [service],
  );

  const verifySecondFactor = useCallback(
    async (challengeToken: string, code: string) => {
      setError(null);
      try {
        const profile = await service.verifySecondFactor(challengeToken, code);
        setOwner(profile);
      } catch (signInError) {
        setError(
          signInError instanceof Error
            ? signInError.message
            : "LifeOS could not verify the authenticator code. Please try again.",
        );
        throw signInError;
      }
    },
    [service],
  );

  const beginPasskeySignIn = useCallback(
    async (state: string, codeChallenge: string) => {
      setError(null);
      try {
        return await service.beginPasskeySignIn(state, codeChallenge);
      } catch (signInError) {
        setError(
          signInError instanceof Error
            ? signInError.message
            : "LifeOS could not start passkey sign-in.",
        );
        throw signInError;
      }
    },
    [service],
  );

  const completePasskeySignIn = useCallback(
    async (state: string, code: string, verifier: string) => {
      setError(null);
      try {
        setOwner(await service.completePasskeySignIn(state, code, verifier));
      } catch (signInError) {
        setError(
          signInError instanceof Error
            ? signInError.message
            : "LifeOS could not complete passkey sign-in.",
        );
        throw signInError;
      }
    },
    [service],
  );

  const cancelSignIn = useCallback(
    async (challengeToken: string) => {
      setError(null);
      try {
        await service.cancelChallenge(challengeToken);
      } catch (cancelError) {
        setError(
          cancelError instanceof Error
            ? cancelError.message
            : "LifeOS could not cancel sign-in. Please try again.",
        );
        throw cancelError;
      }
    },
    [service],
  );

  const signOut = useCallback(async () => {
    setError(null);
    setOwner(null);
    try {
      await service.signOut();
    } catch {
      setError(
        "Signed out on this device. Connect to your server to revoke it remotely.",
      );
    }
  }, [service]);

  const request = useCallback(
    async <T,>(path: string, init?: RequestInit): Promise<T> => {
      try {
        return await service.request<T>(path, init);
      } catch (requestError) {
        if (
          requestError instanceof MobileApiError &&
          requestError.status === 401
        ) {
          setOwner(null);
          setError(null);
        }

        throw requestError;
      }
    },
    [service],
  );

  const value = useMemo(
    () => ({
      owner,
      isLoading,
      error,
      signIn,
      beginPasskeySignIn,
      completePasskeySignIn,
      verifySecondFactor,
      cancelSignIn,
      signOut,
      request,
    }),
    [
      owner,
      isLoading,
      error,
      signIn,
      beginPasskeySignIn,
      completePasskeySignIn,
      verifySecondFactor,
      cancelSignIn,
      signOut,
      request,
    ],
  );

  return (
    <MobileAuthContext.Provider value={value}>
      {children}
    </MobileAuthContext.Provider>
  );
}

export function useMobileAuth(): MobileAuthContextValue {
  const context = useContext(MobileAuthContext);

  if (context === null) {
    throw new Error("useMobileAuth must be used inside MobileAuthProvider.");
  }

  return context;
}
