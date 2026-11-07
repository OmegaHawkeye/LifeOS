import type { HealthTrendsSummary } from "./health";
import {
  formatHealthTrendChange,
  formatHealthTrendValue,
  healthTrendUnit,
} from "./health";

const metricTypes = [
  ["steps", "Steps", "step"],
  ["sleep", "Sleep duration", "hour"],
  ["workouts", "Workout time", "min"],
  ["calories", "Active energy", "kcal"],
  ["weight", "Weight", ""],
] as const;

export function HealthTrendsGrid({
  summary,
  loading = false,
  error = false,
  compact = false,
}: {
  summary: HealthTrendsSummary | null;
  loading?: boolean;
  error?: boolean;
  compact?: boolean;
}) {
  return (
    <div
      className={`grid gap-4 ${compact ? "sm:grid-cols-2" : "md:grid-cols-2 2xl:grid-cols-3"}`}
    >
      {metricTypes.map(([type, label, unit]) => {
        const metrics =
          summary?.trends.filter((trend) => trend.sample_type === type) ?? [];
        return (
          <article
            className="rounded-md border border-line bg-surface p-4 shadow-raised sm:p-5"
            key={type}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="m-0 text-title-s text-ink">{label}</h3>
                {summary && (
                  <p className="mt-1 text-caption text-ink-muted">
                    {formatDate(summary.from)} – {formatDate(summary.to)}
                  </p>
                )}
              </div>
              {metrics.length > 0 && (
                <span className="rounded-xs bg-health-soft px-2 py-0.5 text-caption font-semibold text-health">
                  {metrics.reduce(
                    (count, metric) =>
                      count +
                      metric.source_counts.manual +
                      metric.source_counts.imported,
                    0,
                  )}{" "}
                  inputs
                </span>
              )}
            </div>

            {loading ? (
              <p className="mt-5 text-body-s text-ink-muted" role="status">
                Loading trend…
              </p>
            ) : error ? (
              <p className="mt-5 text-body-s text-ink-muted" role="alert">
                This health trend is temporarily unavailable.
              </p>
            ) : metrics.length > 0 ? (
              <div className="mt-4 space-y-5">
                {metrics.map((trend) => (
                  <div key={`${trend.sample_type}:${trend.unit}`}>
                    <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                      <p className="m-0 text-figure-l tabular-nums text-ink">
                        {formatHealthTrendValue(trend.total)}{" "}
                        {healthTrendUnit(type, trend.unit || unit)}
                      </p>
                      <p className="text-body-s text-ink-muted">
                        {trend.direction === "steady"
                          ? "Steady"
                          : `${capitalize(trend.direction)} ${formatHealthTrendChange(trend.change)} ${healthTrendUnit(type, trend.unit || unit)}`}
                      </p>
                    </div>
                    <TrendBars
                      label={`${label} daily trend`}
                      points={trend.points.slice(-14)}
                    />
                    <p className="mt-2 text-caption text-ink-muted">
                      Manual {trend.source_counts.manual} · Imported{" "}
                      {trend.source_counts.imported}
                    </p>
                    {!compact && (
                      <details className="mt-2 text-caption text-ink-muted">
                        <summary className="cursor-pointer">Sources</summary>
                        <ul className="mt-2 space-y-1 pl-4">
                          {trend.source_counts.sources.map((source) => (
                            <li key={source.id}>
                              {source.name} · {source.count} samples
                            </li>
                          ))}
                        </ul>
                      </details>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-5 text-body text-ink-muted">
                Nothing recorded in this range. Manual entries and connected
                health imports will appear here.
              </p>
            )}
          </article>
        );
      })}
    </div>
  );
}

function TrendBars({
  label,
  points,
}: {
  label: string;
  points: HealthTrendsSummary["trends"][number]["points"];
}) {
  const maximum = Math.max(...points.map((point) => Number(point.value)), 0);

  if (points.length === 0) {
    return (
      <p className="mt-3 text-caption text-ink-muted">No daily trend points.</p>
    );
  }

  return (
    <ol
      aria-label={label}
      className="mt-4 flex h-16 items-end gap-1.5 overflow-hidden"
    >
      {points.map((point) => {
        const height =
          maximum > 0 ? Math.max(6, (Number(point.value) / maximum) * 100) : 6;
        return (
          <li
            className="flex min-w-0 flex-1 flex-col items-center justify-end gap-1"
            key={point.date}
          >
            <span
              aria-label={`${formatDate(point.date)}: ${point.value}`}
              className="w-full origin-bottom animate-rise rounded-t-xs bg-health motion-reduce:animate-none"
              role="img"
              style={{ height: `${height}%` }}
            />
            <span className="text-[10px] tabular-nums text-ink-muted">
              {new Date(`${point.date}T12:00:00Z`).getUTCDate()}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${value}T12:00:00Z`));
}

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
