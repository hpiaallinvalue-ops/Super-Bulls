/**
 * Error Logger — In-memory error store for Cloudflare Workers
 *
 * Captures errors from:
 *   - Server-side rendering failures (caught by error.tsx / global-error.tsx)
 *   - API route errors (caught by route handlers)
 *   - Client-side errors (caught by ErrorBoundary and reported via /api/log-error)
 *   - Middleware errors
 *
 * Errors are stored in-memory and survive across requests within the same
 * Cloudflare Workers isolate. Access via GET /api/errors.
 *
 * Since this is CF Workers (no filesystem), errors persist in the global scope
 * until the isolate is recycled. For production, consider adding Cloudflare KV
 * or a logging service for permanent storage.
 */

export interface ErrorEntry {
  id: string;
  timestamp: string;
  source: "ssr" | "api" | "client" | "middleware" | "init";
  route: string;
  message: string;
  stack?: string;
  digest?: string;
  extra?: Record<string, unknown>;
}

// In-memory error store — global scope survives across requests in same isolate
const MAX_ERRORS = 200;

const errorStore: ErrorEntry[] = [];

function generateId(): string {
  return `err_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Log an error to the in-memory store.
 */
export function logError(entry: Omit<ErrorEntry, "id" | "timestamp">): ErrorEntry {
  const full: ErrorEntry = {
    ...entry,
    id: generateId(),
    timestamp: new Date().toISOString(),
  };

  errorStore.push(full);

  // Keep only the most recent errors
  if (errorStore.length > MAX_ERRORS) {
    errorStore.splice(0, errorStore.length - MAX_ERRORS);
  }

  // Also log to console for Cloudflare Workers observability
  console.error(
    `[ERROR][${full.source}] ${full.route}: ${full.message}`,
    full.stack ? "\n" + full.stack : "",
    full.extra ? "\nExtra: " + JSON.stringify(full.extra) : ""
  );

  return full;
}

/**
 * Get all logged errors, newest first.
 */
export function getErrors(options?: {
  source?: string;
  limit?: number;
  since?: string;
}): ErrorEntry[] {
  let filtered = [...errorStore];

  if (options?.source) {
    filtered = filtered.filter((e) => e.source === options.source);
  }

  if (options?.since) {
    filtered = filtered.filter((e) => e.timestamp >= options.since);
  }

  if (options?.limit) {
    filtered = filtered.slice(0, options.limit);
  }

  return filtered;
}

/**
 * Get a single error by ID.
 */
export function getError(id: string): ErrorEntry | undefined {
  return errorStore.find((e) => e.id === id);
}

/**
 * Clear all logged errors.
 */
export function clearErrors(): number {
  const count = errorStore.length;
  errorStore.length = 0;
  return count;
}

/**
 * Get error store stats.
 */
export function getErrorStats(): {
  total: number;
  bySource: Record<string, number>;
  oldest: string | null;
  newest: string | null;
} {
  const bySource: Record<string, number> = {};
  for (const e of errorStore) {
    bySource[e.source] = (bySource[e.source] || 0) + 1;
  }

  return {
    total: errorStore.length,
    bySource,
    oldest: errorStore.length > 0 ? errorStore[0].timestamp : null,
    newest:
      errorStore.length > 0
        ? errorStore[errorStore.length - 1].timestamp
        : null,
  };
}

/**
 * Extract useful info from an unknown error object.
 */
export function extractErrorInfo(err: unknown): {
  message: string;
  stack?: string;
  digest?: string;
} {
  if (err instanceof Error) {
    return {
      message: err.message,
      stack: err.stack || undefined,
      ...(err.digest ? { digest: err.digest } : {}),
    };
  }

  if (typeof err === "string") {
    return { message: err };
  }

  if (err && typeof err === "object") {
    const obj = err as Record<string, unknown>;
    return {
      message:
        (obj.message as string) ||
        (obj.digest as string) ||
        JSON.stringify(err),
      stack: (obj.stack as string) || undefined,
      digest: (obj.digest as string) || undefined,
    };
  }

  return { message: String(err) };
}
