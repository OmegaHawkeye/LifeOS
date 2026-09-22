import * as SecureStore from "expo-secure-store";
import { SecureCredentialStore } from "./secureCredentialStore";

jest.mock("expo-secure-store", () => ({
  WHEN_UNLOCKED_THIS_DEVICE_ONLY: 7,
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
}));

const credentials = {
  accessToken: "access-token",
  accessTokenExpiresAt: "2026-09-21T12:00:00.000Z",
  refreshToken: "refresh-token",
  refreshTokenExpiresAt: "2026-10-21T12:00:00.000Z",
  tokenType: "Bearer" as const,
  deviceName: "LifeOS iOS device",
};

describe("SecureCredentialStore", () => {
  const store = new SecureCredentialStore();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("stores and reads credentials through Expo SecureStore with device-only keychain access", async () => {
    jest
      .mocked(SecureStore.getItemAsync)
      .mockResolvedValueOnce(JSON.stringify(credentials));

    await store.set(credentials);
    await expect(store.get()).resolves.toEqual(credentials);

    expect(SecureStore.setItemAsync).toHaveBeenCalledWith(
      "lifeos.mobile.credentials",
      JSON.stringify(credentials),
      { keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY },
    );
    expect(SecureStore.getItemAsync).toHaveBeenCalledWith(
      "lifeos.mobile.credentials",
      { keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY },
    );
  });

  test("deletes credentials from secure storage on sign-out", async () => {
    await store.clear();

    expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith(
      "lifeos.mobile.credentials",
      { keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY },
    );
  });

  test("ignores unreadable secure-store content rather than crashing session restoration", async () => {
    jest.mocked(SecureStore.getItemAsync).mockResolvedValueOnce("not-json");

    await expect(store.get()).resolves.toBeNull();
  });
});
