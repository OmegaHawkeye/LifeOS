import { MobileApiError, MobileAuthService } from "./mobileAuthService";
import type {
  CredentialStore,
  MobileCredentials,
  OwnerProfile,
} from "./credentials";

class MemoryCredentialStore implements CredentialStore {
  value: MobileCredentials | null = null;

  async get(): Promise<MobileCredentials | null> {
    return this.value;
  }

  async set(credentials: MobileCredentials): Promise<void> {
    this.value = credentials;
  }

  async clear(): Promise<void> {
    this.value = null;
  }
}

const owner: OwnerProfile = {
  id: 7,
  name: "Julian",
  email: "julian@example.test",
};

function credentials(
  overrides: Partial<MobileCredentials> = {},
): MobileCredentials {
  return {
    accessToken: "access-token",
    accessTokenExpiresAt: new Date(Date.now() + 15 * 60_000).toISOString(),
    refreshToken: "refresh-token",
    refreshTokenExpiresAt: new Date(
      Date.now() + 30 * 24 * 60 * 60_000,
    ).toISOString(),
    tokenType: "Bearer",
    deviceName: "LifeOS iOS device",
    ...overrides,
  };
}

function jsonResponse(payload: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => payload,
  } as Response;
}

describe("MobileAuthService", () => {
  let store: MemoryCredentialStore;
  let fetcher: jest.MockedFunction<typeof fetch>;
  let service: MobileAuthService;

  beforeEach(() => {
    store = new MemoryCredentialStore();
    fetcher = jest.fn();
    service = new MobileAuthService({
      apiUrl: "http://lifeos.local/api/v1",
      credentialStore: store,
      fetcher,
    });
  });

  test("defaults to the local development API port", async () => {
    const localService = new MobileAuthService({
      credentialStore: store,
      fetcher,
    });
    fetcher.mockResolvedValueOnce(
      jsonResponse({ message: "Invalid credentials." }, 422),
    );

    await expect(
      localService.signIn("julian@example.test", "password", "iPhone"),
    ).rejects.toBeInstanceOf(MobileApiError);
    expect(fetcher.mock.calls[0][0]).toBe(
      "http://localhost:8000/api/v1/mobile/auth/login",
    );
  });

  test("checks the password first without sending or storing an authenticator code", async () => {
    fetcher.mockResolvedValueOnce(
      jsonResponse(
        {
          data: {
            status: "challenge_required",
            challenge_token: "pending-sign-in-token",
            challenge_expires_at: "2026-09-21T18:00:00Z",
          },
        },
        202,
      ),
    );

    await expect(
      service.signIn(
        "julian@example.test",
        "private password",
        "LifeOS iOS device",
      ),
    ).resolves.toEqual({
      status: "challenge_required",
      challengeToken: "pending-sign-in-token",
      expiresAt: "2026-09-21T18:00:00Z",
    });

    expect(fetcher.mock.calls[0][0]).toBe(
      "http://lifeos.local/api/v1/mobile/auth/login",
    );
    expect(JSON.parse(String(fetcher.mock.calls[0][1]?.body))).toEqual({
      email: "julian@example.test",
      password: "private password",
      device_name: "LifeOS iOS device",
    });
    expect(store.value).toBeNull();
  });

  test("returns an in-memory setup secret without issuing or storing credentials", async () => {
    fetcher.mockResolvedValueOnce(
      jsonResponse(
        {
          data: {
            status: "setup_required",
            challenge_token: "pending-setup-token",
            challenge_expires_at: "2026-09-21T18:00:00Z",
            secret: "PRIVATESETUPSECRET",
          },
        },
        202,
      ),
    );

    await expect(
      service.signIn("julian@example.test", "private password", "iPhone"),
    ).resolves.toMatchObject({
      status: "setup_required",
      challengeToken: "pending-setup-token",
      secret: "PRIVATESETUPSECRET",
    });
    expect(store.value).toBeNull();
  });

  test("exchanges a passkey callback through the one-time code and PKCE verifier", async () => {
    fetcher
      .mockResolvedValueOnce(
        jsonResponse(
          {
            data: {
              login_url:
                "https://lifeos.example/login?mobile_passkey_state=state",
            },
          },
          201,
        ),
      )
      .mockResolvedValueOnce(
        jsonResponse({
          data: {
            access_token: "passkey-access",
            access_token_expires_at: new Date(
              Date.now() + 15 * 60_000,
            ).toISOString(),
            refresh_token: "passkey-refresh",
            refresh_token_expires_at: new Date(
              Date.now() + 30 * 24 * 60 * 60_000,
            ).toISOString(),
            token_type: "Bearer",
            device_name: "LifeOS iOS device",
          },
        }),
      )
      .mockResolvedValueOnce(jsonResponse({ data: owner }));

    await expect(
      service.beginPasskeySignIn("state", "challenge"),
    ).resolves.toBe("https://lifeos.example/login?mobile_passkey_state=state");
    await expect(
      service.completePasskeySignIn("state", "one-time-code", "verifier"),
    ).resolves.toEqual(owner);

    expect(JSON.parse(String(fetcher.mock.calls[1][1]?.body))).toEqual({
      state: "state",
      code: "one-time-code",
      code_verifier: "verifier",
    });
    expect(store.value?.accessToken).toBe("passkey-access");
  });

  test("stores mobile credentials only after the authenticator challenge succeeds", async () => {
    fetcher
      .mockResolvedValueOnce(
        jsonResponse(
          {
            data: {
              access_token: "access-token",
              access_token_expires_at: credentials().accessTokenExpiresAt,
              refresh_token: "refresh-token",
              refresh_token_expires_at: credentials().refreshTokenExpiresAt,
              token_type: "Bearer",
              device_name: "LifeOS iOS device",
            },
          },
          201,
        ),
      )
      .mockResolvedValueOnce(jsonResponse({ data: owner }));

    await expect(
      service.verifySecondFactor("pending-sign-in-token", "123456"),
    ).resolves.toEqual(owner);

    expect(fetcher.mock.calls[0][0]).toBe(
      "http://lifeos.local/api/v1/mobile/auth/two-factor/challenge",
    );
    expect(JSON.parse(String(fetcher.mock.calls[0][1]?.body))).toEqual({
      challenge_token: "pending-sign-in-token",
      code: "123456",
    });
    expect(store.value?.refreshToken).toBe("refresh-token");
    expect(fetcher.mock.calls[1][1]?.headers).toMatchObject({
      Authorization: "Bearer access-token",
    });
  });

  test("cancels a pending challenge on the server", async () => {
    fetcher.mockResolvedValueOnce(jsonResponse({}, 204));

    await expect(
      service.cancelChallenge("pending-setup-token"),
    ).resolves.toBeUndefined();

    expect(fetcher.mock.calls[0][0]).toBe(
      "http://lifeos.local/api/v1/mobile/auth/two-factor/cancel",
    );
    expect(JSON.parse(String(fetcher.mock.calls[0][1]?.body))).toEqual({
      challenge_token: "pending-setup-token",
    });
  });

  test("restores the owner after rotating an expired access token", async () => {
    store.value = credentials({
      accessTokenExpiresAt: new Date(Date.now() - 1_000).toISOString(),
    });
    const rotated = credentials({
      accessToken: "rotated-access",
      refreshToken: "rotated-refresh",
    });
    fetcher
      .mockResolvedValueOnce(
        jsonResponse({
          data: {
            access_token: rotated.accessToken,
            access_token_expires_at: rotated.accessTokenExpiresAt,
            refresh_token: rotated.refreshToken,
            refresh_token_expires_at: rotated.refreshTokenExpiresAt,
            token_type: "Bearer",
            device_name: rotated.deviceName,
          },
        }),
      )
      .mockResolvedValueOnce(jsonResponse({ data: owner }));

    await expect(service.restoreSession()).resolves.toEqual(owner);

    expect(fetcher.mock.calls[0][0]).toBe(
      "http://lifeos.local/api/v1/mobile/auth/refresh",
    );
    expect(JSON.parse(String(fetcher.mock.calls[0][1]?.body))).toEqual({
      refresh_token: "refresh-token",
    });
    expect(store.value?.accessToken).toBe("rotated-access");
  });

  test("rotates and retries once when a restored access token is rejected", async () => {
    store.value = credentials();
    const rotated = credentials({
      accessToken: "rotated-access",
      refreshToken: "rotated-refresh",
    });
    fetcher
      .mockResolvedValueOnce(jsonResponse({ message: "Unauthenticated." }, 401))
      .mockResolvedValueOnce(
        jsonResponse({
          data: {
            access_token: rotated.accessToken,
            access_token_expires_at: rotated.accessTokenExpiresAt,
            refresh_token: rotated.refreshToken,
            refresh_token_expires_at: rotated.refreshTokenExpiresAt,
            token_type: "Bearer",
            device_name: rotated.deviceName,
          },
        }),
      )
      .mockResolvedValueOnce(jsonResponse({ data: owner }));

    await expect(service.restoreSession()).resolves.toEqual(owner);
    expect(fetcher).toHaveBeenCalledTimes(3);
    expect(store.value?.refreshToken).toBe("rotated-refresh");
  });

  test("clears credentials when the server rejects the refresh token", async () => {
    store.value = credentials({
      accessTokenExpiresAt: new Date(Date.now() - 1_000).toISOString(),
    });
    fetcher.mockResolvedValueOnce(
      jsonResponse({ message: "Invalid refresh token." }, 422),
    );

    await expect(service.restoreSession()).resolves.toBeNull();
    expect(store.value).toBeNull();
  });

  test("revokes this device and clears its credentials on sign-out", async () => {
    store.value = credentials();
    fetcher.mockResolvedValueOnce(jsonResponse(null, 204));

    await service.signOut();

    expect(fetcher.mock.calls[0][0]).toBe(
      "http://lifeos.local/api/v1/mobile/auth/revoke",
    );
    expect(JSON.parse(String(fetcher.mock.calls[0][1]?.body))).toEqual({
      refresh_token: "refresh-token",
    });
    expect(store.value).toBeNull();
  });

  test("clears local credentials even when the device revocation request is offline", async () => {
    store.value = credentials();
    fetcher.mockRejectedValueOnce(new Error("offline"));

    await expect(service.signOut()).rejects.toThrow("offline");
    expect(store.value).toBeNull();
  });

  test("does not erase a valid session after a temporary server error", async () => {
    store.value = credentials();
    fetcher.mockResolvedValueOnce(
      jsonResponse({ message: "Server error." }, 503),
    );

    await expect(service.restoreSession()).rejects.toBeInstanceOf(
      MobileApiError,
    );
    expect(store.value).not.toBeNull();
  });

  test("clears the device session if an authenticated request remains unauthorized after rotation", async () => {
    store.value = credentials();
    const rotated = credentials({ accessToken: "rotated-access" });
    fetcher
      .mockResolvedValueOnce(jsonResponse({ message: "Unauthenticated." }, 401))
      .mockResolvedValueOnce(
        jsonResponse({
          data: {
            access_token: rotated.accessToken,
            access_token_expires_at: rotated.accessTokenExpiresAt,
            refresh_token: rotated.refreshToken,
            refresh_token_expires_at: rotated.refreshTokenExpiresAt,
            token_type: "Bearer",
            device_name: rotated.deviceName,
          },
        }),
      )
      .mockResolvedValueOnce(
        jsonResponse({ message: "Unauthenticated." }, 401),
      );

    await expect(service.request("/health/sources")).rejects.toMatchObject({
      status: 401,
    });
    expect(store.value).toBeNull();
  });
});
