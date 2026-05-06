import { logError, extractErrorInfo } from "@/lib/error-logger";

/**
 * GET /api/errors — Read all logged errors
 * GET /api/errors?source=ssr&limit=10 — Filter by source
 * GET /api/errors?stats — Get error statistics
 * DELETE /api/errors — Clear all errors
 *
 * POST /api/errors — Log an error (for client-side error reporting)
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  // Stats view
  if (searchParams.get("stats") === "1") {
    const { getErrorStats } = await import("@/lib/error-logger");
    return Response.json(getErrorStats());
  }

  const { getErrors } = await import("@/lib/error-logger");
  const source = searchParams.get("source") || undefined;
  const limit = searchParams.get("limit")
    ? parseInt(searchParams.get("limit")!, 10)
    : undefined;
  const since = searchParams.get("since") || undefined;

  const errors = getErrors({ source, limit, since });

  return Response.json({
    success: true,
    count: errors.length,
    errors,
  });
}

export async function DELETE() {
  const { clearErrors } = await import("@/lib/error-logger");
  const cleared = clearErrors();
  return Response.json({ success: true, cleared });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const entry = logError({
      source: body.source || "client",
      route: body.route || request.headers.get("referer") || "/unknown",
      message: body.message || "Unknown error",
      stack: body.stack,
      digest: body.digest,
      extra: body.extra,
    });

    return Response.json({ success: true, id: entry.id });
  } catch (err) {
    // If JSON parsing fails, log a raw error
    const entry = logError({
      source: "client",
      route: "/api/errors",
      message: `Failed to parse error report: ${extractErrorInfo(err).message}`,
    });
    return Response.json(
      { success: true, id: entry.id, warning: "original parse failed" },
      { status: 202 }
    );
  }
}
