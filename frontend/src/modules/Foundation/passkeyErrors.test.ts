import { describe, expect, it } from "vitest";
import { describePasskeyError } from "./passkeyErrors";

describe("describePasskeyError", () => {
  it("explains Safari's opaque error when no credential provider is available", () => {
    expect(describePasskeyError(new Error("Load failed"))).toBe(
      "No passkey provider is available. Enable iCloud Keychain or a compatible password manager, then try again. The iOS Simulator may require an Apple Account or a real device.",
    );
  });

  it("preserves useful passkey errors", () => {
    expect(describePasskeyError(new Error("The request was cancelled."))).toBe(
      "The request was cancelled.",
    );
  });

  it("explains rate limiting and how to retry", () => {
    expect(describePasskeyError(new Error("Too Many Requests"))).toMatch(
      /wait a minute.*start sign-in again from LifeOS/i,
    );
  });

  it("provides a fallback for non-error values", () => {
    expect(describePasskeyError(null)).toBe("Passkey registration failed.");
  });
});
