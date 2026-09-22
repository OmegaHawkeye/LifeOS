import * as Crypto from "expo-crypto";

function base64UrlEncode(bytes: Uint8Array): string {
  const alphabet =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
  let encoded = "";
  for (let index = 0; index < bytes.length; index += 3) {
    const first = bytes[index] ?? 0;
    const second = bytes[index + 1];
    const third = bytes[index + 2];
    const value = (first << 16) | ((second ?? 0) << 8) | (third ?? 0);
    encoded += alphabet[(value >> 18) & 63];
    encoded += alphabet[(value >> 12) & 63];
    encoded += second === undefined ? "=" : alphabet[(value >> 6) & 63];
    encoded += third === undefined ? "=" : alphabet[value & 63];
  }

  return encoded.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

export async function createPasskeyPkce(): Promise<{
  state: string;
  verifier: string;
  challenge: string;
}> {
  const state = base64UrlEncode(await Crypto.getRandomBytesAsync(32));
  const verifier = base64UrlEncode(await Crypto.getRandomBytesAsync(32));
  const challenge = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    verifier,
    { encoding: Crypto.CryptoEncoding.BASE64 },
  );

  return {
    state,
    verifier,
    challenge: challenge
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/g, ""),
  };
}
