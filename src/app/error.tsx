"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import { logClientError } from "@/lib/error-logger-client";
import type { ErrorEntry } from "@/lib/error-logger";

/**
 * Next.js Error Boundary — catches rendering errors in route segments.
 *
 * This wraps the app layout's children. When a server component or
 * client component throws during rendering, this boundary catches it,
 * logs it to /api/errors, and shows a user-friendly fallback UI.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const [loggedId, setLoggedId] = useState<string | null>(null);

  useEffect(() => {
    // Log the error to our error store
    const entry = logClientError({
      source: "ssr",
      route: typeof window !== "undefined" ? window.location.pathname : "/unknown",
      message: error.message || "Unknown rendering error",
      stack: error.stack,
      digest: error.digest,
      extra: {
        errorName: error.name,
        userAgent: typeof navigator !== "undefined" ? navigator.userAgent : "server",
      },
    });
    setLoggedId(entry.id);

    // Also log to console for Cloudflare observability
    console.error("[ErrorBoundary]", error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="max-w-md w-full space-y-6 text-center">
        {/* Error icon */}
        <div className="mx-auto w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center">
          <AlertTriangle className="w-8 h-8 text-destructive" />
        </div>

        {/* Error message */}
        <div className="space-y-2">
          <h1 className="text-2xl font-bold">Something went wrong</h1>
          <p className="text-muted-foreground">
            An unexpected error occurred while loading this page. Our team has
            been notified and is working on a fix.
          </p>
        </div>

        {/* Error details (collapsible) */}
        <div className="bg-muted/50 rounded-lg p-4 text-left space-y-2">
          <p className="text-sm font-mono text-destructive break-all">
            {error.message}
          </p>
          {error.digest && (
            <p className="text-xs text-muted-foreground">
              Error digest: {error.digest}
            </p>
          )}
          {loggedId && (
            <p className="text-xs text-muted-foreground">
              Logged as: {loggedId}
            </p>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-3 justify-center">
          <Button onClick={reset} className="gap-2">
            <RefreshCw className="w-4 h-4" />
            Try Again
          </Button>
          <Button variant="outline" onClick={() => (window.location.href = "/")} className="gap-2">
            <Home className="w-4 h-4" />
            Go Home
          </Button>
        </div>
      </div>
    </div>
  );
}
