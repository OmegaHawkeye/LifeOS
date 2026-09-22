// @vitest-environment jsdom

import { describe, expect, it, vi } from "vitest";
import { apiFetch, createApiClient } from "./client";

describe("LifeOS API client", () => {
  it("uses the versioned contract and includes authentication cookies", async () => {
    const fetcher = vi.fn(async (request: Request) => {
      expect(request).toBeInstanceOf(Request);

      return Response.json({ service: "lifeos-api", status: "ok" });
    });
    const client = createApiClient({
      baseUrl: "https://lifeos.test/api/v1",
      fetch: fetcher,
    });

    const { data } = await client.GET("/readiness");

    expect(data).toEqual({ service: "lifeos-api", status: "ok" });
    expect(fetcher).toHaveBeenCalledOnce();

    const request = fetcher.mock.calls[0]?.[0];
    expect(request?.url).toBe("https://lifeos.test/api/v1/readiness");
    expect(request?.credentials).toBe("include");
  });

  it("sends the CSRF token on writes and broadcasts an expired session", async () => {
    document.cookie = "XSRF-TOKEN=unit-test-token; path=/";
    const fetcher = vi.fn(async (request: Request) => {
      expect(request.headers.get("X-XSRF-TOKEN")).toBe("unit-test-token");
      return Response.json({ message: "Unauthenticated." }, { status: 401 });
    });
    const unauthorized = vi.fn();
    window.addEventListener("lifeos:unauthorized", unauthorized);
    vi.stubGlobal("fetch", fetcher);

    try {
      const response = await apiFetch(
        new URL("/api/v1/finance/transactions", window.location.origin),
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ amount: "10.00" }),
        },
      );

      expect(response.status).toBe(401);
      expect(unauthorized).toHaveBeenCalledOnce();
    } finally {
      window.removeEventListener("lifeos:unauthorized", unauthorized);
      vi.unstubAllGlobals();
      document.cookie = "XSRF-TOKEN=; Max-Age=0; path=/";
    }
  });
});
