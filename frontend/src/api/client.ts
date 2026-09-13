import createClient from "openapi-fetch";
import { environment } from "@/config/environment";
import type { paths } from "./schema";

type ApiClientOptions = {
  baseUrl?: string;
  fetch?: (request: Request) => Promise<Response>;
};

export function createApiClient(options: ApiClientOptions = {}) {
  return createClient<paths>({
    baseUrl: options.baseUrl ?? `${environment.apiBaseUrl}/api/v1`,
    credentials: "include",
    fetch: options.fetch ?? fetchWithCsrfToken,
  });
}

export async function initializeCsrfProtection(): Promise<void> {
  const response = await fetch(
    `${environment.apiBaseUrl}/sanctum/csrf-cookie`,
    {
      credentials: "include",
      headers: { Accept: "application/json" },
    },
  );

  if (!response.ok) {
    throw new Error("LifeOS could not initialize secure sign-in.");
  }
}

async function fetchWithCsrfToken(request: Request): Promise<Response> {
  const isSafeMethod = ["GET", "HEAD", "OPTIONS"].includes(request.method);
  const csrfToken = isSafeMethod ? undefined : readCookie("XSRF-TOKEN");
  const headers = new Headers(request.headers);

  headers.set("Accept", "application/json");

  if (csrfToken) {
    headers.set("X-XSRF-TOKEN", csrfToken);
  }

  return fetch(new Request(request, { credentials: "include", headers }));
}

function readCookie(name: string): string | undefined {
  const cookie = document.cookie
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${name}=`));

  if (!cookie) {
    return undefined;
  }

  return decodeURIComponent(cookie.slice(name.length + 1));
}

export const apiClient = createApiClient();
