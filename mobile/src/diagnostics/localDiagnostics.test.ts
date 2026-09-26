const mockStorage = new Map<string, string>();

jest.mock("expo-secure-store", () => ({
  WHEN_UNLOCKED_THIS_DEVICE_ONLY: "when-unlocked",
  getItemAsync: jest.fn((key: string) =>
    Promise.resolve(mockStorage.get(key) ?? null),
  ),
  setItemAsync: jest.fn((key: string, value: string) => {
    mockStorage.set(key, value);
    return Promise.resolve();
  }),
  deleteItemAsync: jest.fn((key: string) => {
    mockStorage.delete(key);
    return Promise.resolve();
  }),
}));

import {
  captureApiFailure,
  captureUnhandledError,
  clearLocalDiagnostics,
  readLocalDiagnostics,
} from "./localDiagnostics";
import { registerNativeDiagnostics } from "./registerNativeDiagnostics";

describe("native local diagnostics", () => {
  beforeEach(async () => {
    mockStorage.clear();
    await clearLocalDiagnostics();
  });

  it("persists only safe API metadata and correlation ids on device", async () => {
    captureApiFailure(
      "https://lifeos.local/api/v1/users/alice@example.test?access_token=private-token",
      "GET",
      500,
      "corr-mobile-123",
    );

    const report = await readLocalDiagnostics();
    const serializedReport = JSON.stringify(report);

    expect(report).toHaveLength(1);
    expect(report[0]).toMatchObject({
      kind: "api_failure",
      method: "GET",
      route: "/api/v1/users/:id",
      status: 500,
      correlationId: "corr-mobile-123",
    });
    expect(serializedReport).not.toContain("alice@example.test");
    expect(serializedReport).not.toContain("private-token");
  });

  it("does not persist exception messages or stacks", async () => {
    const error = new Error("Health value 72kg for alice@example.test");
    error.stack = "password=secret";

    captureUnhandledError(error);

    const serializedReport = JSON.stringify(await readLocalDiagnostics());
    expect(serializedReport).toContain("unhandled_error");
    expect(serializedReport).not.toContain("72kg");
    expect(serializedReport).not.toContain("alice@example.test");
    expect(serializedReport).not.toContain("secret");
  });

  it("clears the on-device diagnostic report", async () => {
    captureUnhandledError(new TypeError("private details"));

    await clearLocalDiagnostics();

    expect(await readLocalDiagnostics()).toEqual([]);
  });

  it("captures global native JavaScript errors and preserves the default handler", async () => {
    let registeredHandler: ((error: Error, isFatal?: boolean) => void) | null =
      null;
    const defaultHandler = jest.fn();
    const originalErrorUtils = (
      globalThis as typeof globalThis & {
        ErrorUtils?: {
          getGlobalHandler?: () => (error: Error, isFatal?: boolean) => void;
          setGlobalHandler: (
            handler: (error: Error, isFatal?: boolean) => void,
          ) => void;
        };
      }
    ).ErrorUtils;
    (
      globalThis as typeof globalThis & {
        ErrorUtils?: {
          getGlobalHandler?: () => (error: Error, isFatal?: boolean) => void;
          setGlobalHandler: (
            handler: (error: Error, isFatal?: boolean) => void,
          ) => void;
        };
      }
    ).ErrorUtils = {
      getGlobalHandler: () => defaultHandler,
      setGlobalHandler: (handler) => {
        registeredHandler = handler;
      },
    };

    registerNativeDiagnostics();
    const errorHandler = registeredHandler as unknown as
      ((error: Error, isFatal?: boolean) => void) | null;
    errorHandler?.(new Error("Private health detail"), true);

    expect(defaultHandler).toHaveBeenCalledWith(expect.any(Error), true);
    expect(JSON.stringify(await readLocalDiagnostics())).not.toContain(
      "Private health detail",
    );

    (
      globalThis as typeof globalThis & {
        ErrorUtils?: unknown;
      }
    ).ErrorUtils = originalErrorUtils;
  });
});
