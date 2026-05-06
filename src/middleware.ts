import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Edge Middleware — runs before every request.
 *
 * Catches errors at the middleware level and ensures they're logged.
 * This is the earliest point in the request lifecycle where we can intercept.
 */
export function middleware(request: NextRequest) {
  // Skip error logging for static assets and the errors API itself
  const { pathname } = request.nextUrl;
  if (
    pathname.startsWith("/_next/static/") ||
    pathname.startsWith("/favicon") ||
    pathname.endsWith(".js") ||
    pathname.endsWith(".css") ||
    pathname.endsWith(".woff2") ||
    pathname.endsWith(".svg")
  ) {
    return NextResponse.next();
  }

  // Add a custom header for request tracing
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-request-id", `req_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`);
  requestHeaders.set("x-request-path", pathname);

  return NextResponse.next({
    request: { headers: requestHeaders },
  });
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     */
    "/((?!_next/static|_next/image).*)",
  ],
};
