// @vitest-environment jsdom

import { describe, expect, it, vi } from "vitest";
import { createApiClient } from "./client";

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
});
