import { apiClient } from "@/api/client";
import type { paths } from "@/api/schema";

export type FitnessDashboard =
  paths["/fitness/dashboard"]["get"]["responses"][200]["content"]["application/json"]["data"];

export async function getFitnessDashboard(): Promise<FitnessDashboard> {
  const { data, response } = await apiClient.GET("/fitness/dashboard");
  if (!response.ok || !data) {
    throw new Error("Could not load fitness dashboard.");
  }
  return data.data;
}

export async function startRecommendedWorkout(
  templateId: number,
): Promise<void> {
  const { response } = await apiClient.POST("/fitness/workout-sessions", {
    body: { template_id: templateId },
  });
  if (!response.ok) {
    throw new Error("Could not start the recommended workout.");
  }
}
