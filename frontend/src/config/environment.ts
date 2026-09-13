function normalizeApiBaseUrl(value: string | undefined): string {
  if (!value) {
    return "";
  }

  const url = new URL(value);

  if (!["http:", "https:"].includes(url.protocol)) {
    throw new Error("VITE_API_BASE_URL must use HTTP or HTTPS");
  }

  return url.toString().replace(/\/$/, "");
}

export const environment = Object.freeze({
  apiBaseUrl: normalizeApiBaseUrl(import.meta.env.VITE_API_BASE_URL),
});
