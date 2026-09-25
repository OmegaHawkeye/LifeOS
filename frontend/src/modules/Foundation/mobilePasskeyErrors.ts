type ErrorResponse = Pick<Response, "status" | "json">;

type ApiErrorPayload = {
  errors?: Record<string, string | string[]>;
  message?: string;
};

export async function mobilePasskeyResponseError(
  response: ErrorResponse,
  fallback: string,
): Promise<Error> {
  let detail: string | undefined;

  try {
    const payload = (await response.json()) as ApiErrorPayload;
    const firstValidationError = Object.values(payload.errors ?? {})
      .flat()
      .find((value): value is string => typeof value === "string");
    detail = firstValidationError ?? payload.message;
  } catch {
    // Some HTTP failures don't include a JSON response body.
  }

  if (response.status === 401) {
    return new Error(
      "The browser sign-in session was lost. Close this page and start passkey sign-in again from LifeOS.",
    );
  }

  if (response.status === 429) {
    return new Error(
      "Too many passkey attempts. Wait a minute, then start sign-in again from LifeOS.",
    );
  }

  if (response.status === 422 && detail) {
    return new Error(detail);
  }

  return new Error(
    `${fallback} (HTTP ${response.status})${detail ? `: ${detail}` : ""}`,
  );
}
