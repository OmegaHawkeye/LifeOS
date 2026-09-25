function isLoopback(hostname: string): boolean {
  return (
    hostname === "localhost" || hostname === "127.0.0.1" || hostname === "[::1]"
  );
}

export function resolveApiBaseUrl(
  value: string | undefined,
  pageOrigin: string,
): string {
  if (!value) {
    return "";
  }

  const url = new URL(value);
  const pageUrl = new URL(pageOrigin);

  if (!["http:", "https:"].includes(url.protocol)) {
    throw new Error("VITE_API_BASE_URL must use HTTP or HTTPS");
  }

  // A remote HTTPS page (for example, the passkey handoff opened from iOS)
  // cannot call the developer machine's localhost over HTTP. Use the same
  // origin so Caddy can proxy API requests securely.
  if (
    pageUrl.protocol === "https:" &&
    url.protocol === "http:" &&
    isLoopback(url.hostname) &&
    !isLoopback(pageUrl.hostname)
  ) {
    return "";
  }

  return url.toString().replace(/\/$/, "");
}

export const environment = Object.freeze({
  apiBaseUrl: resolveApiBaseUrl(
    import.meta.env.VITE_API_BASE_URL,
    typeof window === "undefined" ? "http://localhost" : window.location.origin,
  ),
});
