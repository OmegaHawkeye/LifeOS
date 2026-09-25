import { describe, expect, it } from "vitest";
import { mobilePasskeyResponseError } from "./mobilePasskeyErrors";

describe("mobilePasskeyResponseError", () => {
  it("explains that a missing web session requires a fresh flow", async () => {
    const error = await mobilePasskeyResponseError(
      new Response(JSON.stringify({ message: "Unauthenticated." }), {
        status: 401,
      }),
      "Passkey sign-in failed.",
    );

    expect(error.message).toMatch(/browser sign-in session was lost/i);
  });

  it("shows the validation error for an expired handoff", async () => {
    const error = await mobilePasskeyResponseError(
      new Response(
        JSON.stringify({
          message: "The given data was invalid.",
          errors: {
            state: ["Complete the passkey verification before continuing."],
          },
        }),
        { status: 422 },
      ),
      "Passkey sign-in failed.",
    );

    expect(error.message).toBe(
      "Complete the passkey verification before continuing.",
    );
  });

  it("explains rate limiting", async () => {
    const error = await mobilePasskeyResponseError(
      new Response("", { status: 429 }),
      "Passkey sign-in failed.",
    );

    expect(error.message).toMatch(/Too many passkey attempts/i);
  });
});
