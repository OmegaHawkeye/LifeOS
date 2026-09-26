import * as SecureStore from "expo-secure-store";

export type LocalDiagnostic = {
  id: string;
  occurredAt: string;
  source: "native";
  kind: "api_failure" | "unhandled_error" | "unhandled_rejection";
  method?: string;
  route?: string;
  status?: number;
  correlationId?: string;
  errorType?: string;
};

const diagnosticsKey = "lifeos.mobile.local-diagnostics";
const maxEntries = 8;
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
const secureOptions: SecureStore.SecureStoreOptions = {
  keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
};
const listeners = new Set<() => void>();
let pendingWrites: Promise<void> = Promise.resolve();

export function subscribeToLocalDiagnostics(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export async function readLocalDiagnostics(): Promise<LocalDiagnostic[]> {
  await pendingWrites;

  try {
    const serialized = await SecureStore.getItemAsync(
      diagnosticsKey,
      secureOptions,
    );
    if (serialized === null) {
      return [];
    }

    const parsed: unknown = JSON.parse(serialized);
    return Array.isArray(parsed)
      ? parsed.filter(isLocalDiagnostic).slice(-maxEntries)
      : [];
  } catch {
    return [];
  }
}

export function captureApiFailure(
  url: string,
  method: string,
  status: number,
  correlationId?: string | null,
): void {
  if (status < 400) {
    return;
  }

  addDiagnostic({
    kind: "api_failure",
    method: safeMethod(method),
    route: safeRoute(url),
    status,
    correlationId: safeCorrelationId(correlationId),
  });
}

export function captureNetworkFailure(
  url: string,
  method: string,
  error: unknown,
): void {
  addDiagnostic({
    kind: "api_failure",
    method: safeMethod(method),
    route: safeRoute(url),
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

export async function clearLocalDiagnostics(): Promise<void> {
  await pendingWrites;
  try {
    await SecureStore.deleteItemAsync(diagnosticsKey, secureOptions);
  } catch {
    // Diagnostics remain optional if on-device storage is unavailable.
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
    source: "native",
  };

  pendingWrites = pendingWrites
    .then(async () => {
      const entries = await readStoredDiagnostics();
      entries.push(entry);
      await SecureStore.setItemAsync(
        diagnosticsKey,
        JSON.stringify(entries.slice(-maxEntries)),
        secureOptions,
      );
    })
    .catch(() => undefined)
    .then(() => {
      notifyListeners();
    });
}

async function readStoredDiagnostics(): Promise<LocalDiagnostic[]> {
  try {
    const serialized = await SecureStore.getItemAsync(
      diagnosticsKey,
      secureOptions,
    );
    if (serialized === null) {
      return [];
    }

    const parsed: unknown = JSON.parse(serialized);
    return Array.isArray(parsed)
      ? parsed.filter(isLocalDiagnostic).slice(-maxEntries)
      : [];
  } catch {
    return [];
  }
}

function safeMethod(method: string): string {
  return /^[a-z]{1,12}$/i.test(method) ? method.toUpperCase() : "UNKNOWN";
}

function safeRoute(url: string): string {
  try {
    const segments = new URL(url).pathname.split("/").map((segment) => {
      let decodedSegment = segment;
      try {
        decodedSegment = decodeURIComponent(segment);
      } catch {
        // Keep malformed path segments hidden below.
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

function safeCorrelationId(value?: string | null): string | undefined {
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
    diagnostic.source === "native" &&
    ["api_failure", "unhandled_error", "unhandled_rejection"].includes(
      diagnostic.kind ?? "",
    )
  );
}

function notifyListeners(): void {
  for (const listener of listeners) {
    listener();
  }
}
