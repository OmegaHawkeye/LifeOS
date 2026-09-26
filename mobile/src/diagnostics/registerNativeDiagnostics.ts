import { captureUnhandledError } from "./localDiagnostics";

type NativeErrorHandler = (error: Error, isFatal?: boolean) => void;

type NativeErrorUtils = {
  getGlobalHandler?: () => NativeErrorHandler;
  setGlobalHandler: (handler: NativeErrorHandler) => void;
};

let registered = false;

export function registerNativeDiagnostics(): void {
  const errorUtils = (
    globalThis as typeof globalThis & {
      ErrorUtils?: NativeErrorUtils;
    }
  ).ErrorUtils;

  if (registered || !errorUtils) {
    return;
  }

  registered = true;
  const defaultHandler = errorUtils.getGlobalHandler?.();

  errorUtils.setGlobalHandler((error, isFatal) => {
    captureUnhandledError(error);
    defaultHandler?.(error, isFatal);
  });
}
