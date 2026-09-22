// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { apiFetch } from "@/api/client";
import { FitnessProgressPhotos } from "./FitnessProgressPhotos";

vi.mock("@/api/client", () => ({ apiFetch: vi.fn() }));

const photo = (id: number, photoDate: string) => ({
  id,
  photo_date: photoDate,
  angle: "front" as const,
  tags: ["monthly"],
  notes: null,
  mime_type: "image/jpeg",
  file_size: 2048,
  content_url: `/api/v1/fitness/progress-photos/${id}/content`,
  body_metric: null,
});

describe("FitnessProgressPhotos", () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  beforeEach(() => {
    class TestURL extends URL {}
    Object.assign(TestURL, {
      createObjectURL: vi.fn(() => "blob:private-photo"),
      revokeObjectURL: vi.fn(),
    });
    vi.stubGlobal("URL", TestURL);
    vi.mocked(apiFetch).mockImplementation(progressPhotoApi());
  });

  it("loads private images and lets the user compare two dates", async () => {
    const user = userEvent.setup();
    render(<FitnessProgressPhotos metrics={[]} />);

    expect(
      await screen.findAllByRole("img", {
        name: "front progress photo from 2026-08-01",
      }),
    ).toHaveLength(2);
    expect(
      screen.getAllByRole("img", {
        name: "front progress photo from 2026-09-01",
      }),
    ).toHaveLength(2);
    expect(
      screen.getByRole("heading", { name: "Compare two dates" }),
    ).toBeVisible();
    expect(apiFetch).toHaveBeenCalledWith(
      "/api/v1/fitness/progress-photos/1/content",
    );
    expect(apiFetch).toHaveBeenCalledWith(
      "/api/v1/fitness/progress-photos/2/content",
    );
    await user.selectOptions(screen.getByLabelText("Earlier photo"), "2");
    await user.selectOptions(screen.getByLabelText("Later photo"), "1");
    expect(
      screen.getByText(
        "Choose an earlier calendar date first and a later date second.",
      ),
    ).toBeVisible();
  });

  it("uploads a dated photo, links a metric, and saves the monthly reflection", async () => {
    const user = userEvent.setup();
    render(
      <FitnessProgressPhotos
        metrics={[
          {
            id: 8,
            metric_type: "weight",
            value: "82.1000",
            unit: "kg",
            measured_at: "2026-09-20T08:00:00Z",
          },
        ]}
      />,
    );

    const file = new File(["photo-bytes"], "progress.jpg", {
      type: "image/jpeg",
    });
    const photoInput = screen.getByLabelText("Photo");
    Object.defineProperty(photoInput, "files", {
      configurable: true,
      value: [file],
    });
    fireEvent.change(photoInput);
    await user.selectOptions(
      screen.getByLabelText("Body metric (optional)"),
      "8",
    );
    await user.type(
      screen.getByLabelText("Tags (comma separated)"),
      "check-in, relaxed",
    );
    await user.type(screen.getByLabelText("Notes"), "Feeling stronger");
    await user.click(
      screen.getByRole("button", { name: "Save photo privately" }),
    );

    await waitFor(() =>
      expect(apiFetch).toHaveBeenCalledWith(
        "/api/v1/fitness/progress-photos",
        expect.objectContaining({ method: "POST" }),
      ),
    );
    const uploadCall = vi
      .mocked(apiFetch)
      .mock.calls.find(
        ([url, init]) =>
          String(url) === "/api/v1/fitness/progress-photos" &&
          init?.method === "POST",
      );
    const uploadBody = uploadCall?.[1]?.body as FormData;
    expect(uploadBody.get("photo")).toBe(file);
    expect(uploadBody.get("body_metric_id")).toBe("8");
    expect(uploadBody.get("tags[0]")).toBe("check-in");
    expect(uploadBody.get("tags[1]")).toBe("relaxed");
    expect(uploadBody.get("notes")).toBe("Feeling stronger");

    await user.type(
      screen.getByLabelText("Monthly reflection"),
      "Consistent training paid off.",
    );
    await user.click(
      screen.getByRole("button", { name: "Save monthly review" }),
    );
    expect(await screen.findByText(/Monthly review saved for/)).toBeVisible();
    expect(
      vi
        .mocked(apiFetch)
        .mock.calls.some(
          ([url, init]) =>
            String(url) === "/api/v1/fitness/progress-photos/monthly-review" &&
            init?.method === "PUT" &&
            String(init.body).includes("Consistent training paid off."),
        ),
    ).toBe(true);
  });
});

function progressPhotoApi() {
  let photos = [photo(2, "2026-09-01"), photo(1, "2026-08-01")];
  let reviewed = false;

  return vi.fn(async (input: RequestInfo | URL, init: RequestInit = {}) => {
    const url = String(input);
    const method = init.method ?? "GET";
    if (url === "/api/v1/fitness/progress-photos" && method === "GET") {
      return jsonResponse(photos);
    }
    if (url.includes("/content")) {
      return {
        ok: true,
        blob: async () => new Blob(["private-image"], { type: "image/jpeg" }),
      } as Response;
    }
    if (url.includes("monthly-review") && method === "GET") {
      return jsonResponse({
        month: "2026-09",
        is_due: !reviewed,
        reviewed_at: reviewed ? "2026-09-20T12:00:00Z" : null,
        notes: null,
        photo_count: photos.filter((item) =>
          item.photo_date.startsWith("2026-09"),
        ).length,
        latest_photo_date: "2026-09-01",
      });
    }
    if (url === "/api/v1/fitness/progress-photos" && method === "POST") {
      const formData = init.body as FormData;
      expect(formData.get("photo_date")).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      photos = [photo(3, String(formData.get("photo_date"))), ...photos];
      return jsonResponse(photos[0], 201);
    }
    if (url.includes("monthly-review") && method === "PUT") {
      reviewed = true;
      const body = JSON.parse(String(init.body)) as { notes: string };
      return jsonResponse({
        month: "2026-09",
        is_due: false,
        reviewed_at: "2026-09-20T12:00:00Z",
        notes: body.notes,
        photo_count: 2,
        latest_photo_date: "2026-09-20",
      });
    }
    throw new Error(`Unexpected request: ${method} ${url}`);
  });
}

function jsonResponse(data: unknown, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => ({ data }),
  } as Response;
}
