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
    fetch: options.fetch,
  });
}

export const apiClient = createApiClient();
