import { apiClient } from "@/api/client";
import type { paths } from "@/api/schema";

export type HealthTrendRange = "7d" | "30d" | "90d" | "ytd";
export type HealthTrendsSummary =
  paths["/health/trends"]["get"]["responses"][200]["content"]["application/json"]["data"];

export function formatHealthTrendValue(value: string): string {
  return new Intl.NumberFormat(undefined, { maximumFractionDigits: 1 }).format(
    Number(value),
  );
}

export function formatHealthTrendChange(value: string): string {
  return formatHealthTrendValue(String(Math.abs(Number(value))));
}

export function healthTrendUnit(sampleType: string, unit: string): string {
  if (sampleType === "steps") return "steps";
  if (sampleType === "sleep") return "hours";
  return unit;
}

export async function getHealthTrendsSummary(
  range: HealthTrendRange,
): Promise<HealthTrendsSummary> {
  const { data, response } = await apiClient.GET("/health/trends", {
    params: { query: { range } },
  });
  if (!response.ok || !data) {
    throw new Error("Could not load health trends.");
  }
  return data.data;
}
