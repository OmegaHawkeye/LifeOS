import { apiClient, initializeCsrfProtection } from "@/api/client";
import type { paths } from "@/api/schema";

export type OwnerProfile =
  paths["/me"]["get"]["responses"][200]["content"]["application/json"]["data"];
export type TwoFactorLoginState =
  paths["/auth/login"]["post"]["responses"][202]["content"]["application/json"]["data"];

export async function getCurrentOwner(): Promise<OwnerProfile | null> {
  const { data, response } = await apiClient.GET("/me");

  if (response.status === 401) {
    return null;
  }

  if (!response.ok || !data) {
    throw new Error("LifeOS could not load the current session.");
  }

  return data.data;
}

export async function signIn(
  email: string,
  password: string,
): Promise<TwoFactorLoginState> {
  await initializeCsrfProtection();
  const { data, response } = await apiClient.POST("/auth/login", {
    body: { email, password },
  });

  if (response.status === 422) {
    throw new Error("The email or password is incorrect.");
  }

  if (response.status !== 202 || !data) {
    throw new Error("LifeOS could not sign you in. Try again shortly.");
  }

  return data.data;
}

export async function confirmTwoFactorSetup(
  code: string,
): Promise<OwnerProfile> {
  return verifyTwoFactor("/auth/two-factor/confirm", code);
}

export async function completeTwoFactorChallenge(
  code: string,
): Promise<OwnerProfile> {
  return verifyTwoFactor("/auth/two-factor/challenge", code);
}

export async function signOut(): Promise<void> {
  const { response } = await apiClient.POST("/auth/logout");

  if (!response.ok) {
    throw new Error("LifeOS could not end this session.");
  }
}

export async function changePassword(
  currentPassword: string,
  password: string,
  passwordConfirmation: string,
): Promise<void> {
  const { response } = await apiClient.PUT("/auth/password", {
    body: {
      current_password: currentPassword,
      password,
      password_confirmation: passwordConfirmation,
    },
  });

  if (response.status === 422) {
    throw new Error("The current password or new password is invalid.");
  }
  if (!response.ok) {
    throw new Error("LifeOS could not change your password.");
  }
}

export async function deleteOwnerAccount(
  currentPassword: string,
  emailConfirmation: string,
): Promise<void> {
  const { response } = await apiClient.DELETE("/account", {
    body: {
      current_password: currentPassword,
      email_confirmation: emailConfirmation,
    },
  });

  if (response.status === 422) {
    throw new Error("The password or email confirmation is incorrect.");
  }
  if (!response.ok) {
    throw new Error("LifeOS could not delete this account.");
  }
}

async function verifyTwoFactor(
  path: "/auth/two-factor/confirm" | "/auth/two-factor/challenge",
  code: string,
): Promise<OwnerProfile> {
  const { data, response } = await apiClient.POST(path, { body: { code } });

  if (response.status === 422) {
    throw new Error("The authenticator code is incorrect or expired.");
  }

  if (!response.ok || !data) {
    throw new Error("LifeOS could not verify the authenticator code.");
  }

  return data.data;
}
