/**
 * Client-side error reporter — sends errors to /api/errors
 *
 * Used by error boundaries and global error handlers on the client.
 */

import type { ErrorEntry } from "./error-logger";

interface LogPayload {
  source: ErrorEntry["source"];
  route: string;
  message: string;
  stack?: string;
  digest?: string;
  extra?: Record<string, unknown>;
}

/**
 * Log an error to the server-side error store via /api/errors.
 * Runs asynchronously and never throws — errors during reporting are silently ignored.
 */
export function logClientError(payload: LogPayload): ErrorEntry & { id: string } {
  const id = `client_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;

  const entry: ErrorEntry & { id: string } = {
    ...payload,
    id,
    timestamp: new Date().toISOString(),
  };

  // Fire-and-forget — don't block the UI
  fetch("/api/errors", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  }).catch(() => {
    // Silently fail — the error is already visible in the UI
  });

  return entry;
}

/**
 * Install a global window.onerror and unhandledrejection handler.
 * Call this once at app initialization.
 */
export function initGlobalErrorHandlers(): void {
  if (typeof window === "undefined") return;

  // Catch unhandled errors
  window.onerror = (message, source, lineno, colno, error) => {
    logClientError({
      source: "client",
      route: window.location.pathname,
      message: String(message),
      stack: error?.stack,
      extra: {
        source,
        line: lineno,
        column: colno,
      },
    });
    return false; // Let default handler also run
  };

  // Catch unhandled promise rejections
  window.addEventListener("unhandledrejection", (event) => {
    const reason = event.reason;
    logClientError({
      source: "client",
      route: window.location.pathname,
      message:
        reason instanceof Error
          ? reason.message
          : `Unhandled rejection: ${String(reason)}`,
      stack: reason instanceof Error ? reason.stack : undefined,
    });
  });

  console.log("[ErrorLogger] Global error handlers installed");
}
