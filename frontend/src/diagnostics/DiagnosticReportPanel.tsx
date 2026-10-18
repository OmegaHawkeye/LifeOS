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
      className="mt-8 space-y-4 rounded-md border border-line bg-surface p-5 sm:p-7"
    >
      <div>
        <h2 className="text-title-m font-semibold" id="diagnostics-title">
          Local diagnostics
        </h2>
        <p className="mt-1 text-body-s leading-6 text-ink-muted">
          Recent errors are stored in this browser only. Messages, request
          bodies, credentials, and health values are not included. Nothing is
          sent automatically.
        </p>
      </div>
      {diagnostics.length === 0 ? (
        <p className="text-body-s text-ink-muted">
          No recent diagnostics recorded on this device.
        </p>
      ) : (
        <ol aria-label="Recent diagnostic events" className="space-y-3">
          {diagnostics
            .slice()
            .reverse()
            .map((diagnostic) => (
              <li
                className="rounded-sm border border-line p-4 text-body-s"
                key={diagnostic.id}
              >
                <p className="font-medium">
                  {diagnostic.kind === "api_failure"
                    ? `${diagnostic.method ?? "Request"} ${diagnostic.route ?? "unknown route"} failed`
                    : (diagnostic.errorType ?? "Unhandled app error")}
                  {diagnostic.status ? ` (HTTP ${diagnostic.status})` : ""}
                </p>
                <p className="mt-1 text-ink-muted">
                  {new Date(diagnostic.occurredAt).toLocaleString()}
                </p>
                {diagnostic.correlationId ? (
                  <p className="mt-1 break-all font-mono text-caption text-ink-muted">
                    Correlation ID: {diagnostic.correlationId}
                  </p>
                ) : null}
              </li>
            ))}
        </ol>
      )}
      <div className="flex flex-wrap gap-3">
        <button
          className="rounded-sm bg-primary px-5 py-3 text-body-s font-semibold text-on-primary transition hover:bg-primary-hover disabled:cursor-not-allowed disabled:bg-surface-sunken disabled:text-ink-muted"
          disabled={diagnostics.length === 0}
          onClick={downloadReport}
          type="button"
        >
          Export diagnostic report
        </button>
        <button
          className="rounded-sm border border-line-strong px-5 py-3 text-body-s font-semibold transition hover:bg-surface-sunken disabled:cursor-not-allowed disabled:opacity-50"
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
