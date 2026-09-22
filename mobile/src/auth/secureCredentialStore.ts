import * as SecureStore from "expo-secure-store";
import {
  isMobileCredentials,
  type CredentialStore,
  type MobileCredentials,
} from "./credentials";

const credentialKey = "lifeos.mobile.credentials";
const secureOptions: SecureStore.SecureStoreOptions = {
  keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
};

export class SecureCredentialStore implements CredentialStore {
  async get(): Promise<MobileCredentials | null> {
    const serialized = await SecureStore.getItemAsync(
      credentialKey,
      secureOptions,
    );

    if (serialized === null) {
      return null;
    }

    try {
      const parsed: unknown = JSON.parse(serialized);
      return isMobileCredentials(parsed) ? parsed : null;
    } catch {
      return null;
    }
  }

  async set(credentials: MobileCredentials): Promise<void> {
    await SecureStore.setItemAsync(
      credentialKey,
      JSON.stringify(credentials),
      secureOptions,
    );
  }

  async clear(): Promise<void> {
    await SecureStore.deleteItemAsync(credentialKey, secureOptions);
  }
}
