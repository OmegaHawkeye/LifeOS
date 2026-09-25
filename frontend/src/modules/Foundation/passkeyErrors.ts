const unavailableProviderErrors = new Set([
  "Load failed",
  "Failed to fetch",
  "The operation couldn’t be completed.",
]);

export function describePasskeyError(error: unknown): string {
  if (!(error instanceof Error)) {
    return "Passkey registration failed.";
  }

  if (/too many (requests|attempts)/i.test(error.message)) {
    return "Too many passkey attempts. Wait a minute, then start sign-in again from LifeOS.";
  }

  if (unavailableProviderErrors.has(error.message.trim())) {
    return "No passkey provider is available. Enable iCloud Keychain or a compatible password manager, then try again. The iOS Simulator may require an Apple Account or a real device.";
  }

  return error.message;
}
