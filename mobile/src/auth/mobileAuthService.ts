import {
  parseMobileCredentials,
  type CredentialStore,
  type MobileCredentials,
  type OwnerProfile,
} from "./credentials";

export class MobileApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = "MobileApiError";
  }
}

type ApiEnvelope<T> = { data: T };
type MobileAuthServiceOptions = {
  apiUrl?: string;
  credentialStore: CredentialStore;
  fetcher?: typeof fetch;
  now?: () => number;
};

const accessTokenRefreshWindowMs = 30_000;

export type MobileLoginChallenge = {
  status: "challenge_required" | "setup_required";
  challengeToken: string;
  expiresAt: string;
  secret?: string;
};

export class MobileAuthService {
  private readonly apiUrl: string;
  private readonly credentialStore: CredentialStore;
  private readonly fetcher: typeof fetch;
  private readonly now: () => number;

  constructor(options: MobileAuthServiceOptions) {
    this.apiUrl = (
      options.apiUrl ??
      process.env.EXPO_PUBLIC_LIFEOS_API_URL ??
      "http://localhost:8000/api/v1"
    ).replace(/\/$/, "");
    this.credentialStore = options.credentialStore;
    this.fetcher = options.fetcher ?? fetch;
    this.now = options.now ?? Date.now;
  }

  async signIn(
    email: string,
    password: string,
    deviceName: string,
  ): Promise<MobileLoginChallenge> {
    const response = await this.fetcher(`${this.apiUrl}/mobile/auth/login`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, password, device_name: deviceName }),
    });
    const envelope = await this.readJson<ApiEnvelope<unknown>>(response);
    const data = envelope.data;

    if (typeof data !== "object" || data === null || Array.isArray(data)) {
      throw new Error("LifeOS returned an invalid sign-in challenge.");
    }

    const challenge = data as Record<string, unknown>;

    if (
      (challenge.status !== "challenge_required" &&
        challenge.status !== "setup_required") ||
      typeof challenge.challenge_token !== "string" ||
      typeof challenge.challenge_expires_at !== "string" ||
      (challenge.status === "setup_required" &&
        typeof challenge.secret !== "string")
    ) {
      throw new Error("LifeOS returned an invalid sign-in challenge.");
    }

    return {
      status: challenge.status,
      challengeToken: challenge.challenge_token,
      expiresAt: challenge.challenge_expires_at,
      ...(typeof challenge.secret === "string"
        ? { secret: challenge.secret }
        : {}),
    };
  }

  async beginPasskeySignIn(
    state: string,
    codeChallenge: string,
  ): Promise<string> {
    const response = await this.fetcher(`${this.apiUrl}/mobile/passkeys`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ state, code_challenge: codeChallenge }),
    });
    const envelope = await this.readJson<ApiEnvelope<unknown>>(response);
    const data = envelope.data;

    if (
      typeof data !== "object" ||
      data === null ||
      !("login_url" in data) ||
      typeof data.login_url !== "string"
    ) {
      throw new Error("LifeOS returned an invalid passkey sign-in request.");
    }

    return data.login_url;
  }

  async completePasskeySignIn(
    state: string,
    code: string,
    codeVerifier: string,
  ): Promise<OwnerProfile> {
    const response = await this.fetcher(
      `${this.apiUrl}/mobile/passkeys/exchange`,
      {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ state, code, code_verifier: codeVerifier }),
      },
    );
    const envelope = await this.readJson<ApiEnvelope<unknown>>(response);
    const credentials = parseMobileCredentials(envelope.data);

    await this.credentialStore.set(credentials);
    try {
      return await this.fetchOwner(credentials.accessToken);
    } catch (error) {
      if (error instanceof MobileApiError && error.status === 401) {
        await this.credentialStore.clear();
      }

      throw error;
    }
  }

  async verifySecondFactor(
    challengeToken: string,
    code: string,
  ): Promise<OwnerProfile> {
    const response = await this.fetcher(
      `${this.apiUrl}/mobile/auth/two-factor/challenge`,
      {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ challenge_token: challengeToken, code }),
      },
    );
    const envelope = await this.readJson<ApiEnvelope<unknown>>(response);
    const credentials = parseMobileCredentials(envelope.data);

    await this.credentialStore.set(credentials);
    try {
      return await this.fetchOwner(credentials.accessToken);
    } catch (error) {
      if (error instanceof MobileApiError && error.status === 401) {
        await this.credentialStore.clear();
      }

      throw error;
    }
  }

  async cancelChallenge(challengeToken: string): Promise<void> {
    const response = await this.fetcher(
      `${this.apiUrl}/mobile/auth/two-factor/cancel`,
      {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ challenge_token: challengeToken }),
      },
    );

    if (!response.ok) {
      await this.readJson<unknown>(response);
    }
  }

  async restoreSession(): Promise<OwnerProfile | null> {
    let credentials = await this.credentialStore.get();

    if (credentials === null) {
      return null;
    }

    if (this.accessTokenNeedsRefresh(credentials)) {
      credentials = await this.rotateOrClear(credentials.refreshToken);

      if (credentials === null) {
        return null;
      }
    }

    try {
      return await this.fetchOwner(credentials.accessToken);
    } catch (error) {
      if (!(error instanceof MobileApiError) || error.status !== 401) {
        throw error;
      }
    }

    credentials = await this.rotateOrClear(credentials.refreshToken);

    if (credentials === null) {
      return null;
    }

    try {
      return await this.fetchOwner(credentials.accessToken);
    } catch (error) {
      if (error instanceof MobileApiError && error.status === 401) {
        await this.credentialStore.clear();
        return null;
      }

      throw error;
    }
  }

  async request<T>(path: string, init: RequestInit = {}): Promise<T> {
    let credentials = await this.credentialStore.get();

    if (credentials === null) {
      throw new MobileApiError("Sign in to continue.", 401);
    }

    if (this.accessTokenNeedsRefresh(credentials)) {
      credentials = await this.rotateOrClear(credentials.refreshToken);

      if (credentials === null) {
        throw new MobileApiError(
          "Your session has expired. Sign in again.",
          401,
        );
      }
    }

    try {
      return await this.sendAuthenticatedRequest<T>(path, init, credentials);
    } catch (error) {
      if (!(error instanceof MobileApiError) || error.status !== 401) {
        throw error;
      }
    }

    credentials = await this.rotateOrClear(credentials.refreshToken);

    if (credentials === null) {
      throw new MobileApiError("Your session has expired. Sign in again.", 401);
    }

    try {
      return await this.sendAuthenticatedRequest<T>(path, init, credentials);
    } catch (error) {
      if (error instanceof MobileApiError && error.status === 401) {
        await this.credentialStore.clear();
      }

      throw error;
    }
  }

  async signOut(): Promise<void> {
    const credentials = await this.credentialStore.get();

    try {
      if (credentials !== null) {
        await this.fetcher(`${this.apiUrl}/mobile/auth/revoke`, {
          method: "POST",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ refresh_token: credentials.refreshToken }),
        });
      }
    } finally {
      await this.credentialStore.clear();
    }
  }

  private accessTokenNeedsRefresh(credentials: MobileCredentials): boolean {
    const expiresAt = Date.parse(credentials.accessTokenExpiresAt);
    return (
      !Number.isFinite(expiresAt) ||
      expiresAt <= this.now() + accessTokenRefreshWindowMs
    );
  }

  private async rotateOrClear(
    refreshToken: string,
  ): Promise<MobileCredentials | null> {
    try {
      const response = await this.fetcher(
        `${this.apiUrl}/mobile/auth/refresh`,
        {
          method: "POST",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ refresh_token: refreshToken }),
        },
      );
      const envelope = await this.readJson<ApiEnvelope<unknown>>(response);
      const credentials = parseMobileCredentials(envelope.data);
      await this.credentialStore.set(credentials);
      return credentials;
    } catch (error) {
      if (
        error instanceof MobileApiError &&
        (error.status === 401 || error.status === 422)
      ) {
        await this.credentialStore.clear();
        return null;
      }

      throw error;
    }
  }

  private async fetchOwner(accessToken: string): Promise<OwnerProfile> {
    const response = await this.fetcher(`${this.apiUrl}/me`, {
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
    });
    const envelope = await this.readJson<ApiEnvelope<OwnerProfile>>(response);
    return envelope.data;
  }

  private async sendAuthenticatedRequest<T>(
    path: string,
    init: RequestInit,
    credentials: MobileCredentials,
  ): Promise<T> {
    const headers = new Headers(init.headers);
    headers.set("Accept", "application/json");
    headers.set("Authorization", `Bearer ${credentials.accessToken}`);
    const response = await this.fetcher(`${this.apiUrl}${path}`, {
      ...init,
      headers,
    });

    return this.readJson<T>(response);
  }

  private async readJson<T>(response: Response): Promise<T> {
    if (!response.ok) {
      let message = "LifeOS could not complete the request.";

      try {
        const payload = (await response.json()) as {
          message?: unknown;
          errors?: Record<string, string[]>;
        };
        const firstValidationError = Object.values(
          payload.errors ?? {},
        )[0]?.[0];
        if (typeof firstValidationError === "string") {
          message = firstValidationError;
        } else if (typeof payload.message === "string") {
          message = payload.message;
        }
      } catch {
        // Keep the safe generic message for empty or non-JSON server responses.
      }

      throw new MobileApiError(message, response.status);
    }

    if (response.status === 204) {
      return {} as T;
    }

    return (await response.json()) as T;
  }
}
