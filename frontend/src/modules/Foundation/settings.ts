import { apiClient } from "@/api/client";
import type { paths } from "@/api/schema";

export type OwnerSettings =
  paths["/settings"]["get"]["responses"][200]["content"]["application/json"]["data"];
export type OwnerSettingsUpdate =
  paths["/settings"]["patch"]["requestBody"]["content"]["application/json"];

export async function getOwnerSettings(): Promise<OwnerSettings> {
  const { data, response } = await apiClient.GET("/settings");

  if (!response.ok || !data) {
    throw new Error("LifeOS could not load your settings.");
  }

  return data.data;
}

export async function updateOwnerSettings(
  settings: OwnerSettingsUpdate,
): Promise<OwnerSettings> {
  const { data, response } = await apiClient.PATCH("/settings", {
    body: settings,
  });

  if (!response.ok || !data) {
    throw new Error("LifeOS could not save your settings.");
  }

  return data.data;
}
