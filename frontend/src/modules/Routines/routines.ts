import { apiClient } from "@/api/client";
import type { paths } from "@/api/schema";

export type RoutineOverview =
  paths["/routines"]["get"]["responses"][200]["content"]["application/json"]["data"];
export type Routine = RoutineOverview["routines"][number];
export type CreateRoutineInput =
  paths["/routines"]["post"]["requestBody"]["content"]["application/json"];
export type WeeklyReviewSummary =
  paths["/dashboard/weekly-review"]["get"]["responses"][200]["content"]["application/json"]["data"];
export type SaveWeeklyReviewInput =
  paths["/dashboard/weekly-review"]["put"]["requestBody"]["content"]["application/json"];

export async function getRoutineOverview(): Promise<RoutineOverview> {
  const { data, response } = await apiClient.GET("/routines");
  if (!response.ok || !data) throw new Error("Routines could not be loaded.");
  return data.data;
}

export async function createRoutine(body: CreateRoutineInput): Promise<void> {
  const { response } = await apiClient.POST("/routines", { body });
  if (!response.ok) throw new Error("Routine could not be created.");
}

export async function completeRoutine(routine: number): Promise<void> {
  const { response } = await apiClient.POST("/routines/{routine}/complete", {
    params: { path: { routine } },
  });
  if (!response.ok) throw new Error("Routine could not be completed.");
}

export async function snoozeRoutine(routine: number): Promise<void> {
  const { response } = await apiClient.POST("/routines/{routine}/snooze", {
    params: { path: { routine } },
    body: { minutes: 60 },
  });
  if (!response.ok) throw new Error("Routine could not be snoozed.");
}

export async function getWeeklyReview(): Promise<WeeklyReviewSummary> {
  const { data, response } = await apiClient.GET("/dashboard/weekly-review");
  if (!response.ok || !data)
    throw new Error("Weekly review could not be loaded.");
  return data.data;
}

export async function saveWeeklyReview(
  body: SaveWeeklyReviewInput,
): Promise<WeeklyReviewSummary> {
  const { response } = await apiClient.PUT("/dashboard/weekly-review", {
    body,
  });
  if (!response.ok) throw new Error("Weekly review could not be saved.");
  return getWeeklyReview();
}
