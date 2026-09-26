import { useEffect, useState } from "react";
import {
  clearLocalDiagnostics,
  readLocalDiagnostics,
  subscribeToLocalDiagnostics,
} from "./localDiagnostics";
import type { LocalDiagnostic } from "./localDiagnostics";

export function DiagnosticReportPanel() {
  const [diagnostics, setDiagnostics] =
    useState<LocalDiagnostic[]>(readLocalDiagnostics);

  useEffect(
    () =>
      subscribeToLocalDiagnostics(() => {
        setDiagnostics(readLocalDiagnostics());
      }),
    [],
  );

  function downloadReport(): void {
    const report = {
      product: "LifeOS",
      exportedAt: new Date().toISOString(),
      diagnostics,
    };
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(report, null, 2)], {
        type: "application/json",
      }),
    );
    const link = document.createElement("a");

    link.href = url;
    link.download = "lifeos-diagnostic-report.json";
    document.body.append(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  return (
    <section
      aria-labelledby="diagnostics-title"
      className="mt-8 space-y-4 rounded-3xl border border-stone-200 bg-white p-5 dark:border-white/10 dark:bg-stone-900 sm:p-7"
    >
      <div>
        <h2 className="text-lg font-semibold" id="diagnostics-title">
          Local diagnostics
        </h2>
        <p className="mt-1 text-sm leading-6 text-stone-500 dark:text-stone-400">
          Recent errors are stored in this browser only. Messages, request
          bodies, credentials, and health values are not included. Nothing is
          sent automatically.
        </p>
      </div>
      {diagnostics.length === 0 ? (
        <p className="text-sm text-stone-500 dark:text-stone-400">
          No recent diagnostics recorded on this device.
        </p>
      ) : (
        <ol aria-label="Recent diagnostic events" className="space-y-3">
          {diagnostics
            .slice()
            .reverse()
            .map((diagnostic) => (
              <li
                className="rounded-xl border border-stone-200 p-4 text-sm dark:border-white/10"
                key={diagnostic.id}
              >
                <p className="font-medium">
                  {diagnostic.kind === "api_failure"
                    ? `${diagnostic.method ?? "Request"} ${diagnostic.route ?? "unknown route"} failed`
                    : (diagnostic.errorType ?? "Unhandled app error")}
                  {diagnostic.status ? ` (HTTP ${diagnostic.status})` : ""}
                </p>
                <p className="mt-1 text-stone-500 dark:text-stone-400">
                  {new Date(diagnostic.occurredAt).toLocaleString()}
                </p>
                {diagnostic.correlationId ? (
                  <p className="mt-1 break-all font-mono text-xs text-stone-500 dark:text-stone-400">
                    Correlation ID: {diagnostic.correlationId}
                  </p>
                ) : null}
              </li>
            ))}
        </ol>
      )}
      <div className="flex flex-wrap gap-3">
        <button
          className="rounded-xl bg-emerald-500 px-5 py-3 text-sm font-semibold text-stone-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:bg-stone-300 disabled:text-stone-500"
          disabled={diagnostics.length === 0}
          onClick={downloadReport}
          type="button"
        >
          Export diagnostic report
        </button>
        <button
          className="rounded-xl border border-stone-300 px-5 py-3 text-sm font-semibold transition hover:bg-stone-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/15 dark:hover:bg-white/10"
          disabled={diagnostics.length === 0}
          onClick={() => clearLocalDiagnostics()}
          type="button"
        >
          Clear local diagnostics
        </button>
      </div>
    </section>
  );
}
