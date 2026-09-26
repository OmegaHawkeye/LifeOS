import { environment } from "@/config/environment";
import {
  captureApiFailure,
  captureNetworkFailure,
  captureUnhandledError,
  captureUnhandledRejection,
} from "./localDiagnostics";

let registered = false;
type WindowWithDiagnosticFetch = Window & {
  __lifeosDiagnosticsFetchInstalled?: boolean;
};

export function registerWebDiagnostics(): void {
  if (registered || typeof window === "undefined") {
    return;
  }

  registered = true;
  window.addEventListener("error", (event) => {
    captureUnhandledError(event.error);
  });
  window.addEventListener("unhandledrejection", (event) => {
    captureUnhandledRejection(event.reason);
  });

  const windowWithDiagnosticFetch = window as WindowWithDiagnosticFetch;
  if (windowWithDiagnosticFetch.__lifeosDiagnosticsFetchInstalled) {
    return;
  }

  const originalFetch = window.fetch.bind(window);
  windowWithDiagnosticFetch.__lifeosDiagnosticsFetchInstalled = true;
  window.fetch = async (input, init) => {
    const request =
      input instanceof Request
        ? new Request(input, init)
        : new Request(new URL(input.toString(), window.location.href), init);

    if (!isLifeOSRequest(request.url)) {
      return originalFetch(input, init);
    }

    try {
      const response = await originalFetch(input, init);
      captureApiFailure(request, response);
      return response;
    } catch (error) {
      captureNetworkFailure(request, error);
      throw error;
    }
  };
}

function isLifeOSRequest(requestUrl: string): boolean {
  try {
    const url = new URL(requestUrl);
    const apiOrigin = new URL(environment.apiBaseUrl, window.location.origin)
      .origin;

    return (
      url.origin === apiOrigin &&
      (/^\/api\//.test(url.pathname) ||
        url.pathname.startsWith("/passkeys/") ||
        url.pathname.startsWith("/user/passkeys") ||
        url.pathname.startsWith("/sanctum/"))
    );
  } catch {
    return false;
  }
}
