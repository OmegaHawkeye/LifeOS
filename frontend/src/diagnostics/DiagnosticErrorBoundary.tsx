import { Component, type ReactNode } from "react";
import { captureUnhandledError } from "./localDiagnostics";

type DiagnosticErrorBoundaryProps = {
  children: ReactNode;
};

type DiagnosticErrorBoundaryState = {
  hasError: boolean;
};

export class DiagnosticErrorBoundary extends Component<
  DiagnosticErrorBoundaryProps,
  DiagnosticErrorBoundaryState
> {
  state: DiagnosticErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): DiagnosticErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error): void {
    captureUnhandledError(error);
  }

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <main className="grid min-h-svh place-items-center px-6 text-center">
          <section className="max-w-md">
            <h1 className="text-title-l font-semibold">LifeOS hit a problem</h1>
            <p className="mt-3 text-body-s text-ink-muted">
              A privacy-safe diagnostic was saved on this device. Reload to try
              again.
            </p>
            <button
              className="mt-6 rounded-sm bg-primary px-4 py-2 font-semibold text-on-primary"
              onClick={() => window.location.reload()}
              type="button"
            >
              Reload LifeOS
            </button>
          </section>
        </main>
      );
    }

    return this.props.children;
  }
}
