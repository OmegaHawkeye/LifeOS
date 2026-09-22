export type MobileCredentials = {
  accessToken: string;
  accessTokenExpiresAt: string;
  refreshToken: string;
  refreshTokenExpiresAt: string;
  tokenType: "Bearer";
  deviceName: string;
};

export type OwnerProfile = {
  id: number;
  name: string;
  email: string;
};

export interface CredentialStore {
  get(): Promise<MobileCredentials | null>;
  set(credentials: MobileCredentials): Promise<void>;
  clear(): Promise<void>;
}

export function parseMobileCredentials(value: unknown): MobileCredentials {
  if (typeof value !== "object" || value === null) {
    throw new Error("LifeOS returned an invalid sign-in response.");
  }

  const data = value as Record<string, unknown>;
  const requiredStrings = [
    "access_token",
    "access_token_expires_at",
    "refresh_token",
    "refresh_token_expires_at",
    "device_name",
  ];

  if (
    requiredStrings.some((key) => typeof data[key] !== "string") ||
    data.token_type !== "Bearer"
  ) {
    throw new Error("LifeOS returned an invalid sign-in response.");
  }

  return {
    accessToken: data.access_token as string,
    accessTokenExpiresAt: data.access_token_expires_at as string,
    refreshToken: data.refresh_token as string,
    refreshTokenExpiresAt: data.refresh_token_expires_at as string,
    tokenType: "Bearer",
    deviceName: data.device_name as string,
  };
}

export function isMobileCredentials(
  value: unknown,
): value is MobileCredentials {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const credentials = value as Record<string, unknown>;
  return (
    typeof credentials.accessToken === "string" &&
    typeof credentials.accessTokenExpiresAt === "string" &&
    typeof credentials.refreshToken === "string" &&
    typeof credentials.refreshTokenExpiresAt === "string" &&
    credentials.tokenType === "Bearer" &&
    typeof credentials.deviceName === "string"
  );
}
