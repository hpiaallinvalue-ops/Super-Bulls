"use client";

import { useEffect } from "react";
import { initGlobalErrorHandlers } from "@/lib/error-logger-client";

/**
 * Invisible component that installs global error handlers on mount.
 * Placed in the root layout so it runs once for the entire app.
 */
export function ErrorInitializer() {
  useEffect(() => {
    initGlobalErrorHandlers();
  }, []);

  return null;
}
