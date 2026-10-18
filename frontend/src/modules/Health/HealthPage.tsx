import { useEffect, useState } from "react";
import { getHealthTrendsSummary } from "./health";
import type { HealthTrendRange, HealthTrendsSummary } from "./health";
import { HealthTrendsGrid } from "./HealthTrendsGrid";

const ranges: Array<{ value: HealthTrendRange; label: string }> = [
  { value: "7d", label: "7 days" },
  { value: "30d", label: "30 days" },
  { value: "90d", label: "90 days" },
  { value: "ytd", label: "Year to date" },
];

export function HealthPage() {
  const [range, setRange] = useState<HealthTrendRange>("30d");
  const [summary, setSummary] = useState<HealthTrendsSummary | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let active = true;
    getHealthTrendsSummary(range)
      .then((data) => {
        if (active) {
          setSummary(data);
          setError(false);
        }
      })
      .catch(() => {
        if (active) setError(true);
      });
    return () => {
      active = false;
    };
  }, [range]);

  const loading = summary === null && !error;

  return (
    <section
      aria-labelledby="page-title"
      className="mx-auto w-full max-w-[1400px] pr-1 lg:pr-8 2xl:pr-14"
    >
      <p className="m-0 text-overline uppercase text-ink-muted">
        Health signals, on your terms
      </p>
      <div className="mt-2 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1
            className="m-0 text-balance font-display text-display-m text-ink tablet:text-display-l"
            id="page-title"
          >
            Health
          </h1>
          <p className="mt-3 max-w-2xl text-body text-ink-muted">
            Look at patterns over time, without treating any single day as a
            verdict.
          </p>
        </div>
        <label className="text-body-s font-medium">
          Time range
          <select
            className="mt-1 block min-w-40 rounded-sm border border-line bg-surface px-3 py-2.5"
            onChange={(event) => {
              setSummary(null);
              setError(false);
              setRange(event.currentTarget.value as HealthTrendRange);
            }}
            value={range}
          >
            {ranges.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      {error && (
        <p
          className="mt-6 rounded-sm bg-danger-soft p-4 text-body-s text-danger"
          role="alert"
        >
          Health trends could not be loaded. Please check your connection and
          try again.
        </p>
      )}
      <div className="mt-7">
        <HealthTrendsGrid error={error} loading={loading} summary={summary} />
      </div>
      <p className="mt-5 text-caption leading-5 text-ink-muted">
        Imported and manual measurements are shown as recorded. Different units
        are kept separate rather than converted silently.
      </p>
    </section>
  );
}
