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
      <p className="text-sm font-medium text-emerald-700 dark:text-emerald-300">
        Health signals, on your terms
      </p>
      <div className="mt-2 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1
            className="text-3xl font-semibold tracking-tight sm:text-4xl"
            id="page-title"
          >
            Health
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-stone-500 dark:text-stone-400">
            Look at patterns over time, without treating any single day as a
            verdict.
          </p>
        </div>
        <label className="text-sm font-medium">
          Time range
          <select
            className="mt-1 block min-w-40 rounded-xl border border-stone-200 bg-white px-3 py-2.5 dark:border-white/15 dark:bg-stone-900"
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
          className="mt-6 rounded-xl bg-rose-50 p-4 text-sm text-rose-800 dark:bg-rose-950/30 dark:text-rose-200"
          role="alert"
        >
          Health trends could not be loaded. Please check your connection and
          try again.
        </p>
      )}
      <div className="mt-7">
        <HealthTrendsGrid error={error} loading={loading} summary={summary} />
      </div>
      <p className="mt-5 text-xs leading-5 text-stone-500 dark:text-stone-400">
        Imported and manual measurements are shown as recorded. Different units
        are kept separate rather than converted silently.
      </p>
    </section>
  );
}
