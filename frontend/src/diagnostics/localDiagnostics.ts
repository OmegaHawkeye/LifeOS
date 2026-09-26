export type LocalDiagnostic = {
  id: string;
  occurredAt: string;
  source: "web";
  kind: "api_failure" | "unhandled_error" | "unhandled_rejection";
  method?: string;
  route?: string;
  status?: number;
  correlationId?: string;
  errorType?: string;
};

const storageKey = "lifeos:local-diagnostics";
const maxEntries = 50;
const safeRouteSegments = new Set([
  "account",
  "accounts",
  "api",
  "assets",
  "auth",
  "backup",
  "body-metrics",
  "budgets",
  "categories",
  "challenge",
  "complete",
  "confirm",
  "content",
  "copy",
  "csrf-cookie",
  "dashboard",
  "delete",
  "exchange",
  "exercises",
  "export",
  "fitness",
  "goals",
  "health",
  "imports",
  "items",
  "login",
  "logout",
  "management",
  "management-sessions",
  "me",
  "meals",
  "mobile",
  "monthly-review",
  "net-worth",
  "nutrition",
  "options",
  "overview",
  "passkeys",
  "password",
  "plans",
  "prepare",
  "progress-photos",
  "readiness",
  "recipes",
  "recent-performance",
  "redeem",
  "routines",
  "samples",
  "sanctum",
  "savings-goals",
  "security",
  "sets",
  "snooze",
  "shopping-lists",
  "sources",
  "status",
  "subscriptions",
  "sync-runs",
  "target",
  "transactions",
  "transfers",
  "trends",
  "two-factor",
  "user",
  "users",
  "v1",
  "valuations",
  "weekly-review",
  "workout-sessions",
  "workout-templates",
]);
const listeners = new Set<() => void>();

export function subscribeToLocalDiagnostics(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function readLocalDiagnostics(): LocalDiagnostic[] {
  try {
    const stored = window.localStorage.getItem(storageKey);
    if (!stored) {
      return [];
    }

    const parsed: unknown = JSON.parse(stored);
    return Array.isArray(parsed)
      ? parsed.filter(isLocalDiagnostic).slice(-maxEntries)
      : [];
  } catch {
    return [];
  }
}

export function captureApiFailure(
  request: Pick<Request, "url" | "method">,
  response: Response,
): void {
  if (response.ok) {
    return;
  }

  addDiagnostic({
    kind: "api_failure",
    method: safeMethod(request.method),
    route: safeRoute(request.url),
    status: response.status,
    correlationId: safeCorrelationId(response.headers.get("X-Correlation-ID")),
  });
}

export function captureNetworkFailure(
  request: Pick<Request, "url" | "method">,
  error: unknown,
): void {
  addDiagnostic({
    kind: "api_failure",
    method: safeMethod(request.method),
    route: safeRoute(request.url),
    errorType: safeErrorType(error),
  });
}

export function captureUnhandledError(error: unknown): void {
  addDiagnostic({
    kind: "unhandled_error",
    errorType: safeErrorType(error),
  });
}

export function captureUnhandledRejection(reason: unknown): void {
  addDiagnostic({
    kind: "unhandled_rejection",
    errorType: safeErrorType(reason),
  });
}

export function clearLocalDiagnostics(): void {
  try {
    window.localStorage.removeItem(storageKey);
  } catch {
    // Diagnostics remain optional when browser storage is unavailable.
  }

  notifyListeners();
}

function addDiagnostic(
  diagnostic: Omit<LocalDiagnostic, "id" | "occurredAt" | "source">,
): void {
  const entry: LocalDiagnostic = {
    ...diagnostic,
    id: createId(),
    occurredAt: new Date().toISOString(),
    source: "web",
  };

  try {
    window.localStorage.setItem(
      storageKey,
      JSON.stringify([...readLocalDiagnostics(), entry].slice(-maxEntries)),
    );
  } catch {
    // Diagnostics remain optional when browser storage is unavailable or full.
  }

  notifyListeners();
}

function notifyListeners(): void {
  for (const listener of listeners) {
    listener();
  }
}

function safeMethod(method: string): string {
  return /^[A-Z]{1,12}$/i.test(method) ? method.toUpperCase() : "UNKNOWN";
}

function safeRoute(url: string): string {
  try {
    const segments = new URL(url, window.location.origin).pathname
      .split("/")
      .map((segment) => {
        let decodedSegment = segment;
        try {
          decodedSegment = decodeURIComponent(segment);
        } catch {
          // Keep malformed segments hidden below.
        }

        if (!safeRouteSegments.has(decodedSegment.toLowerCase())) {
          return decodedSegment.length === 0 ? "" : ":id";
        }

        return decodedSegment;
      });

    return segments.join("/").slice(0, 180) || "/";
  } catch {
    return "unknown";
  }
}

function safeCorrelationId(value: string | null): string | undefined {
  return value && /^[a-z0-9-]{1,80}$/i.test(value) ? value : undefined;
}

function safeErrorType(error: unknown): string {
  const errorType =
    error instanceof Error
      ? error.name
      : typeof error === "object" && error !== null && "name" in error
        ? String(error.name)
        : "UnknownError";

  return /^[a-z0-9_$.-]{1,80}$/i.test(errorType) ? errorType : "UnknownError";
}

function createId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `diagnostic-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function isLocalDiagnostic(value: unknown): value is LocalDiagnostic {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const diagnostic = value as Partial<LocalDiagnostic>;
  return (
    typeof diagnostic.id === "string" &&
    typeof diagnostic.occurredAt === "string" &&
    diagnostic.source === "web" &&
    ["api_failure", "unhandled_error", "unhandled_rejection"].includes(
      diagnostic.kind ?? "",
    )
  );
}
