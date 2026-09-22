jest.mock("expo-crypto", () => ({
  CryptoDigestAlgorithm: { SHA256: "SHA-256" },
  CryptoEncoding: { BASE64: "base64" },
  digestStringAsync: jest.fn(async () => "Y2hhbGxlbmdl=="),
  getRandomBytesAsync: jest
    .fn()
    .mockResolvedValueOnce(new Uint8Array(32).fill(1))
    .mockResolvedValueOnce(new Uint8Array(32).fill(2)),
}));

import { createPasskeyPkce } from "./passkeyPkce";

describe("createPasskeyPkce", () => {
  test("creates cryptographically random state and an S256 challenge", async () => {
    const result = await createPasskeyPkce();

    expect(result.state).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(result.verifier).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(result.state).not.toBe(result.verifier);
    expect(result.challenge).toBe("Y2hhbGxlbmdl");
  });
});
