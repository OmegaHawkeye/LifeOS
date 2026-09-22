import { apiClient, apiFetch } from "@/api/client";
import type { paths } from "@/api/schema";

export type OwnerSettings =
  paths["/settings"]["get"]["responses"][200]["content"]["application/json"]["data"];
export type OwnerSettingsUpdate =
  paths["/settings"]["patch"]["requestBody"]["content"]["application/json"];
export type BackupStatus =
  paths["/backup/status"]["get"]["responses"][200]["content"]["application/json"]["data"];

export async function getBackupStatus(): Promise<BackupStatus> {
  const { data, response } = await apiClient.GET("/backup/status");

  if (!response.ok || !data) {
    throw new Error("LifeOS could not load backup status.");
  }

  return data.data;
}

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

export async function downloadOwnerDataExport(): Promise<void> {
  const response = await apiFetch("/api/v1/account/export");

  if (!response.ok) {
    throw new Error("Your data export could not be prepared.");
  }

  const downloadUrl = URL.createObjectURL(await response.blob());
  const link = document.createElement("a");
  const suggestedFilename = response.headers
    .get("Content-Disposition")
    ?.match(/filename="?([^";]+)"?/i)?.[1];

  link.href = downloadUrl;
  link.download = suggestedFilename?.match(
    /^lifeos-export-\d{4}-\d{2}-\d{2}\.zip$/,
  )
    ? suggestedFilename
    : "lifeos-export.zip";
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(downloadUrl), 0);
}
