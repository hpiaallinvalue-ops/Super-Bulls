"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";
import { logClientError } from "@/lib/error-logger-client";

/**
 * Global Error Boundary — catches errors that bubble up past the root layout.
 *
 * This is the last resort error handler. It renders its own <html> and <body>
 * tags since the root layout itself may have failed. It logs the error to
 * /api/errors so it can be retrieved for debugging.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const [loggedId, setLoggedId] = useState<string | null>(null);

  useEffect(() => {
    const entry = logClientError({
      source: "init",
      route: typeof window !== "undefined" ? window.location.pathname : "/",
      message: `GLOBAL ERROR: ${error.message || "Root layout or initialization failed"}`,
      stack: error.stack,
      digest: error.digest,
      extra: {
        errorName: error.name,
        isGlobalError: true,
        userAgent: typeof navigator !== "undefined" ? navigator.userAgent : "server",
      },
    });
    setLoggedId(entry.id);

    console.error("[GlobalErrorBoundary]", error);
  }, [error]);

  return (
    <html lang="en">
      <body className="antialiased bg-background text-foreground">
        <div className="min-h-screen flex items-center justify-center bg-background p-4">
          <div className="max-w-md w-full space-y-6 text-center">
            <div className="mx-auto w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center">
              <AlertTriangle className="w-8 h-8 text-red-500" />
            </div>

            <div className="space-y-2">
              <h1 className="text-2xl font-bold">Application Error</h1>
              <p className="text-muted-foreground">
                A critical error occurred during application startup. This
                typically indicates a build or configuration issue.
              </p>
            </div>

            <div className="bg-muted/50 rounded-lg p-4 text-left space-y-2">
              <p className="text-sm font-mono text-red-500 break-all">
                {error.message}
              </p>
              {error.digest && (
                <p className="text-xs text-muted-foreground">
                  Digest: {error.digest}
                </p>
              )}
              {loggedId && (
                <p className="text-xs text-muted-foreground">
                  Logged: {loggedId}
                </p>
              )}
            </div>

            {/* Quick diagnostics link */}
            <div className="bg-muted/30 rounded-lg p-3">
              <p className="text-xs text-muted-foreground">
                Check error logs at{" "}
                <code className="bg-muted px-1 rounded">/api/errors</code>{" "}
                for detailed diagnostics.
              </p>
            </div>

            <div className="flex gap-3 justify-center">
              <button
                onClick={reset}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 text-sm font-medium"
              >
                <RefreshCw className="w-4 h-4" />
                Try Again
              </button>
              <a
                href="/"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-md border border-input bg-background hover:bg-accent text-sm font-medium"
              >
                <Home className="w-4 h-4" />
                Go Home
              </a>
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}
