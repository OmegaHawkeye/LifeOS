// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { resolveApiBaseUrl } from "./environment";

describe("resolveApiBaseUrl", () => {
  it("uses the same HTTPS origin for remote secure pages configured with localhost API", () => {
    expect(
      resolveApiBaseUrl(
        "http://localhost:8000",
        "https://lifeos.example.test:8443",
      ),
    ).toBe("");
  });

  it("keeps the separate localhost API during local development", () => {
    expect(
      resolveApiBaseUrl("http://localhost:8000", "http://localhost:5173"),
    ).toBe("http://localhost:8000");
  });

  it("keeps an explicitly configured HTTPS API base", () => {
    expect(
      resolveApiBaseUrl(
        "https://api.example.test",
        "https://lifeos.example.test",
      ),
    ).toBe("https://api.example.test");
  });
});
